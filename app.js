const express = require("express");
const http = require("http");
const authRoutes = require("./routes/authRoutes");
const userRouter = require("./routes/userRoutes"); // Путь к файлу с роутером
const accountRoutes = require("./routes/accountRoutes");
const creditRoutes = require("./routes/creditRoutes");
const depositRoutes = require("./routes/depositRoutes");
const dashboardRoutes = require("./routes/dashboards");
// const chatRoutes = require("./routes/chatRoutes");
const path = require("path");
const socketIo = require("socket.io");
const app = express();
const cookieParser = require("cookie-parser");
const server = http.createServer(app);
//MIDDLEWARE
const io = socketIo(server);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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
// app.use("/chat", chatRoutes);
app.get("/", (req, res) => {
	res.redirect(`/auth/login`);
});

let clients = {
	users: [],
	admins: [],
};
io.on("connection", (socket) => {
	console.log("A user connected");

	// chat block start

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
					OR: [{ senderId: userId }, { receiverId: userId }],
				},
				orderBy: { createdAt: "asc" },
			});

			socket.emit("chatHistory", chatHistory);
			console.log(`${socket.role} authenticated with ID: ${userId}`);
		} catch (error) {
			console.error("Authentication error:", error);
			socket.disconnect();
		}
	});

	socket.on("sendMessage", async ({ message, to }) => {
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
			clients[to].emit("receiveMessage", { message, from, timestamp });
		}

		console.log(`Message from ${from} to ${to}: ${message}`);
	});

	// chat block end

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
				userSocket.emit("notification", { message });
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

// Конфигурация прослушивания порта
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
