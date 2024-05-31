const express = require("express");
const https = require("https"); // Use the https module
const fs = require("fs");
const jwt = require("jsonwebtoken"); // Import JWT
const {PrismaClient} = require("@prisma/client");
const authRoutes = require("./routes/authRoutes");
const userRouter = require("./routes/userRoutes"); // Path to the router file
const accountRoutes = require("./routes/accountRoutes");
const creditRoutes = require("./routes/creditRoutes");
const depositRoutes = require("./routes/depositRoutes");
const dashboardRoutes = require("./routes/dashboards");
const chatRoutes = require("./routes/chatRoutes");
const path = require("path");
const socketIo = require("socket.io");
const app = express();
const cookieParser = require("cookie-parser");

// Read SSL certificate and key
const privateKey = fs.readFileSync("./ca.key", "utf8");
const certificate = fs.readFileSync("./ca.pem", "utf8");
const ca = fs.readFileSync("./ca.pem", "utf8");

const credentials = {
    key: privateKey,
    cert: certificate,
    ca: ca,
    passphrase: 'lexa'
};

// Create HTTPS server
const server = https.createServer(credentials, app);
const io = socketIo(server);

// MIDDLEWARE
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.set("view engine", "ejs");
app.engine("ejs", require("ejs").__express);
app.set("views", path.join(__dirname, "views"));
app.set("io", io);

// ROUTES
app.use("/auth", authRoutes);
app.use("/users", userRouter);
app.use("/account", accountRoutes);
app.use("/credit", creditRoutes);
app.use("/deposit", depositRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/chat", chatRoutes(io));
app.get("/", (req, res) => {
    res.redirect(`/auth/login`);
});

// AUTH
const prisma = new PrismaClient();

async function getUserRoleFromToken(token) {
    try {
        // Verify token
        const decodedToken = jwt.verify(token, "secret_key");
        const username = decodedToken.username;

        // Find user in the database
        const user = await prisma.users.findUnique({
            where: {
                username: username,
            },
            include: {
                role: true,
            },
        });

        if (!user) {
            return null;
        }

        // Return user role
        return user.role.id;
    } catch (error) {
        console.error("Error getting user role from token:", error);
        return null;
    }
}

async function getUserIdFromToken(token) {
    try {
        // Verify token
        const decodedToken = jwt.verify(token, "secret_key");
        return decodedToken.id; // Return user ID from token
    } catch (error) {
        console.error("Error getting user ID from token:", error);
        return null;
    }
}

// SOCKET FUNCTIONALITY
let clients = {
    users: [],
    admins: [],
};
io.on("connection", (socket) => {
    console.log("A user connected");

    socket.on("authenticate", async (token) => {
        try {
            const userRole = await getUserRoleFromToken(token);
            const userId = await getUserIdFromToken(token);

            if (!userRole || !userId) {
                socket.disconnect();
                return;
            }

            socket.userId = userId;
            socket.role = userRole === "admin" ? "admin" : "user";

            if (!clients[userId]) {
                clients[userId] = socket;
            }

            // Load chat history
            const chatHistory = await prisma.chat.findMany({
                where: {
                    OR: [{senderId: userId}, {receiverId: userId}],
                },
                orderBy: {createdAt: "asc"},
            });

            socket.emit("chatHistory", chatHistory);
            console.log(`${socket.role} authenticated with ID: ${userId}`);
        } catch (error) {
            console.error("Authentication error:", error);
            socket.disconnect();
        }
    });

    socket.on("sendMessage", async ({message, to}) => {
        const from = socket.userId;
        const timestamp = new Date();

        // Save message to database
        await prisma.chat.create({
            data: {
                message,
                senderId: from,
                receiverId: to,
                createdAt: timestamp,
            },
        });

        if (clients[to]) {
            clients[to].emit("receiveMessage", {message, from, timestamp});
        }

        console.log(`Message from ${from} to ${to}: ${message}`);
    });

    socket.on("register", (role) => {
        if (role === "user") {
            clients.users.push(socket);
            socket.role = "user";
            console.log("User registered");
        } else if (role === "admin") {
            clients.admins.push(socket);
            socket.role = "admin";
            console.log("Admin registered");
        }
    });

    socket.on("sendNotification", (message) => {
        if (socket.role === "admin") {
            clients.users.forEach((userSocket) => {
                userSocket.emit("notification", {message});
            });
            console.log("Notification sent by admin");
        }
    });

    socket.on("disconnect", () => {
        console.log("User disconnected");
        if (socket.role === "user") {
            clients.users = clients.users.filter(
                (userSocket) => userSocket !== socket
            );
        } else if (socket.role === "admin") {
            clients.admins = clients.admins.filter(
                (adminSocket) => adminSocket !== socket
            );
        }
    });
});

// Port configuration
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
