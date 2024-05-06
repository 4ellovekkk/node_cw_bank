const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const router = express.Router();

// Middleware для проверки JWT токена и роли пользователя
function authenticateAndCheckAdmin(req, res, next) {
	const authHeader = req.headers["authorization"];
	const token = authHeader && authHeader.split(" ")[1];
	if (token == null) return res.sendStatus(401);

	jwt.verify(token, "secret_key", async (err, user) => {
		if (err) return res.sendStatus(403);
		if (user.role !== "admin")
			return res.status(403).json({ error: "Insufficient permissions" });

		// Проверка роли пользователя в базе данных
		const foundUser = await prisma.users.findUnique({
			where: { username: user.username },
		});
		if (!foundUser || foundUser.role !== "admin") {
			return res.status(403).json({ error: "Insufficient permissions" });
		}

		req.user = user;
		next();
	});
}

// GET запрос для отображения страницы регистрации
router.get("/register", authenticateAndCheckAdmin, async (req, res) => {
	try {
		// Ваш код для отображения страницы регистрации
		res.render("register.ejs");
	} catch (error) {
		console.error(error);
		res.status(500).send("Error retrieving registration page");
	}
});

// POST запрос для обработки регистрации
router.post("/register", async (req, res) => {
	try {
		// Ваш код для обработки регистрации
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Error registering user" });
	}
});

module.exports = router;
