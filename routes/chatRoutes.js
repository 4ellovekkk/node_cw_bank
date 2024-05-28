const express = require("express");
const router = express.Router();
const path = require("path");
const jwt = require("jsonwebtoken");
const prisma = require("@prisma/client"); // Убедитесь, что Prisma клиент установлен и настроен
const { getUserRoleFromToken, getUserIdFromToken } = require("./authRoutes");

// Для простоты примера используем массивы для хранения сообщений
let userMessages = [];
let adminMessages = [];

// Маршрут для отображения страницы чата
router.get("/user/:role", async (req, res) => {
	const token = req.headers.authorization.split(" ")[1]; // Получаем токен из заголовков
	const userRole = await getUserRoleFromToken(token);

	if (!userRole) {
		return res.status(401).send("Unauthorized");
	}

	const role = req.params.role;
	const targetUserRole = role === "admin" ? "user" : "admin";
	const userMessagesToShow =
		targetUserRole === "admin" ? adminMessages : userMessages;
	const adminMessagesToShow =
		targetUserRole === "admin" ? userMessages : adminMessages;
	res.render("chat", { userRole, userMessagesToShow, adminMessagesToShow });
});

// Маршрут для отправки сообщений
router.post("/messages", async (req, res) => {
	const token = req.headers.authorization.split(" ")[1]; // Получаем токен из заголовков
	const userRole = await getUserRoleFromToken(token);

	if (!userRole) {
		return res.status(401).send("Unauthorized");
	}

	const message = req.body.message;
	if (userRole === "admin") {
		userMessages.push(message);
	} else {
		adminMessages.push(message);
	}
	// Отправка нового сообщения через Socket.IO
	req.app.get("io").emit("newMessage");
	res.redirect(`/user/${userRole}`);
});

module.exports = router;
