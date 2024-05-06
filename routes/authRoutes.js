const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const router = express.Router();

// Middleware для проверки JWT токена и роли пользователя
async function getUserRoleFromToken(token) {
	try {
		// Верификация токена
		const decodedToken = jwt.verify(token, "secret_key");
		const username = decodedToken.username;

		// Поиск пользователя в базе данных
		const user = await prisma.users.findUnique({
			where: {
				username: username,
			},
			include: {
				role: true, // Включаем связанную сущность "role"
			},
		});

		// Проверка наличия пользователя в базе данных
		if (!user) {
			return null; // Пользователь не найден
		}

		// Получение роли пользователя
		const userRole = user.role.id;

		return userRole; // Возвращаем роль пользователя
	} catch (error) {
		console.error("Ошибка при получении роли пользователя из токена:", error);
		return null; // Возвращаем null в случае ошибки
	}
}

// GET запрос для отображения страницы регистрации
router.get("/register", async (req, res) => {
	try {
		token = req.cookies.token;
		if ((await getUserRoleFromToken(token)) != parseInt(1)) {
			return res.status(403).json({ message: "Insufficient priveleges" });
		}

		jwt.verify(token, "secret_key");
	} catch (error) {
		if (error.name === "TokenExpiredError") {
			return res.status(401).json({ message: "token expired" });
		} else if (error.name === "JsonWebTokenError") {
			return res.status(401).json({ message: "Invalid token" });
		} else {
			return res.status(500).json({ message: "Verification error" });
		}
	}
	// Получение информации о пользователе из запроса
	res.render("register.ejs");
});

// POST запрос для обработки регистрации
router.post("/register", async (req, res) => {
	try {
		let { username, password, role } = req.body;
		switch (role) {
			case "Administrator":
				role = 1;
				break;
			case "Worker":
				role = 2;
				break;
			case "User":
				role = 3;
				break;
		}

		// Проверка на уникальность имени пользователя
		const existingUser = await prisma.users.findUnique({
			where: {
				username: username, // Поиск пользователя по имени
			},
		});

		if (existingUser) {
			return res.status(400).json({ error: "Username already exists" });
		}

		// Хеширование пароля
		const hashedPassword = await bcrypt.hash(password, 10);

		// Создание пользователя
		const user = await prisma.users.create({
			data: {
				username,
				passwd: hashedPassword,
				role: {
					connect: {
						id: role, // Подключение роли по ее id
					},
				},
			},
		});

		console.log("User registered successfully");
		res.json({ message: "User registered successfully", user });
	} catch (error) {
		if (error.code === "P2002" && error.meta?.target?.includes("username")) {
			// Обработка ошибки уникального ограничения
			return res.status(400).json({ error: "Username already exists" });
		}
		console.error(error);
		res.status(500).json({ error: "Error registering user" });
	}
});

router.get("/login", (req, res) => {
	res.render("login");
});

router.post("/login", async (req, res) => {
	try {
		const { username, password } = req.body;

		// Поиск пользователя по имени пользователя
		const user = await prisma.users.findUnique({
			where: {
				username,
			},
		});

		if (!user) {
			return res.status(404).json({ error: "User not found" });
		}

		// Проверка пароля
		const isPasswordValid = await bcrypt.compare(password, user.passwd);
		if (!isPasswordValid) {
			return res.status(401).json({ error: "Invalid password" });
		}

		// Создание JWT токена
		const token = jwt.sign(
			{ userId: user.id, role: user.role, username: user.username },
			"secret_key",
			{
				expiresIn: "24h",
			}
		);

		// Установка токена как cookie
		res.cookie("token", token, { httpOnly: true, secure: true });

		// Отправка ответа об успешном входе
		res.json({ message: "Login successful" });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Error logging in" });
	}
});

router.get("/logout", (req, res) => {
	res.clearCookie("token").json({ message: "Logout successful" });
});
module.exports = router;
