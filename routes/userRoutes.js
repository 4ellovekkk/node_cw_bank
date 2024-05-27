const express = require("express");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();
const router = express.Router();

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

async function getUserIdFromToken(token) {
	try {
		// Верификация токена
		const decodedToken = jwt.verify(token, "secret_key");
		return decodedToken.id; // Возвращаем id пользователя из токена
	} catch (error) {
		console.error("Ошибка при получении id пользователя из токена:", error);
		return null; // Возвращаем null в случае ошибки
	}
}
router.get("/edit-user/:id", async (req, res) => {
	let id = req.params.id;
	try {
		const token = req.cookies.token;
		if (!token) {
			return res.status(401).send("Unauthorized");
		}

		const userId = await getUserIdFromToken(token);
		if (!userId) {
			return res.status(401).send("Unauthorized");
		}

		const userRole = await getUserRoleFromToken(token);
		if (userRole === null) {
			return res.status(500).send("Error fetching user role");
		}

		if (userRole === 3 && parseInt(id) !== userId) {
			return res.status(403).send("Insufficient privileges");
		}

		const user = await prisma.users.findUnique({ where: { id: parseInt(id) } });
		if (!user) {
			return res.status(404).send("User not found");
		}
		res.render("form", { userId: id, user });
	} catch (error) {
		console.error(error);
		res.status(500).send("Error fetching user");
	}
});

// PUT запрос для обновления информации о пользователе
router.put("/:id/edit", async (req, res) => {
	try {
		const token = req.cookies.token;
		if (!token) {
			return res.status(401).send("Unauthorized");
		}

		const userId = await getUserIdFromToken(token);
		if (!userId) {
			return res.status(401).send("Unauthorized");
		}

		const userRole = await getUserRoleFromToken(token);
		if (userRole === null) {
			return res.status(500).send("Error fetching user role");
		}

		const id = parseInt(req.params.id);
		if (userRole === 3 && userId !== id) {
			return res.status(403).send("Insufficient privileges");
		}

		const {
			first_name,
			midle_name,
			last_name,
			phone,
			user_role,
			username,
			passwd,
		} = req.body;

		// Обновление информации о пользователе в базе данных
		let updateData = {
			first_name,
			midle_name,
			last_name,
			phone,
			user_role,
			username,
		};

		if (passwd && passwd.trim() !== "") {
			let hashedPassword = await bcrypt.hash(passwd, 10);
			updateData.passwd = hashedPassword;
		}

		const updatedUser = await prisma.users.update({
			where: {
				id,
			},
			data: updateData,
		});

		res.json({
			message: "User information updated successfully",
			user: updatedUser,
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Error updating user information" });
	}
});
// DELETE запрос для удаления пользователя
router.delete("/delete-user/:id", async (req, res) => {
	try {
		const { id } = req.params;
		const { token } = req.cookies;

		// Получение роли пользователя из токена
		const userRole = await getUserRoleFromToken(token);

		// Проверка роли пользователя
		if (userRole !== 1 && userRole !== 2) {
			return res.status(403).json({ error: "Insufficient privileges" });
		}

		// Удаление пользователя из базы данных
		const deletedUser = await prisma.users.delete({
			where: {
				id: parseInt(id),
			},
		});

		res.json({ message: "User deleted successfully", user: deletedUser });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Error deleting user" });
	}
});

module.exports = router;
