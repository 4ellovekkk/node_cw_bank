const express = require("express");
const http = require("http");
const authRoutes = require("./routes/authRoutes");
const userRouter = require("./routes/userRoutes"); // Путь к файлу с роутером
const accountRoutes = require("./routes/accountRoutes");
const creditRoutes = require("./routes/creditRoutes");
const depositRoutes = require("./routes/depositRoutes");
const dashboardRoutes = require("./routes/dashboards");
const path = require("path");
const socketIo = require("socket.io");
const app = express();
const cookieParser = require("cookie-parser");
// const { server } = require("typescript");
const server = http.createServer(app);
//MIDDLEWARE
const io = socketIo(server);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.engine("ejs", require("ejs").__express);
app.set("views", path.join(__dirname, "views"));
// ROUTES
app.use("/auth", authRoutes);
app.use("/users", userRouter);
app.use("/account", accountRoutes);
app.use("/credit", creditRoutes);
app.use("/deposit", depositRoutes);
app.use("/dashboard", dashboardRoutes);
app.get("/", (req, res) => {
	res.redirect(`/auth/login`);
});

let clients = {
	users: [],
	admins: [],
};
io.on("connection", (socket) => {
	console.log("A user connected");

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
