const express = require("express");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();
const router = express.Router();
const jwt = require("jsonwebtoken");

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
		return user.role.id; // Возвращаем роль пользователя
	} catch (error) {
		console.error("Ошибка при получении роли пользователя из токена:", error);
		return null; // Возвращаем null в случае ошибки
	}
}

async function getUserIdFromToken(token) {
	try {
		// Верификация токена
		const decodedToken = jwt.verify(token, "secret_key");
		return decodedToken.userId; // Возвращаем id пользователя из токена
	} catch (error) {
		console.error("Ошибка при получении id пользователя из токена:", error);
		return null; // Возвращаем null в случае ошибки
	}
}

router.get("/edit-user", async (req, res) => {
	try {
		let token = req.cookies.token;

		// Check user role
		if (await getUserRoleFromToken(token) !== 3) {
			return res.status(403).json({message: "Insufficient privileges"});
		}

		// Get userId from token
		const userId = await getUserIdFromToken(token);
		if (!userId) {
			return res.status(401).send("Unauthorized");
		}

		// Fetch user role
		const userRole = await getUserRoleFromToken(token);
		if (userRole === null) {
			return res.status(500).send("Error fetching user role");
		}

		// Find user by ID
		const user = await prisma.users.findUnique({
			where: {id: parseInt(userId)}
		});

		if (!user) {
			return res.status(404).send("User not found");
		}

		// Render form with user data
		res.render("form", {userId: userId, user});
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
			updateData.passwd = await bcrypt.hash(passwd, 10);
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
router.put("/lock", async (req, res) => {
	try {
		const token = req.cookies.token;
		const userRole = await getUserRoleFromToken(token);

		if (userRole === 2 || userRole === 1) {
			const userIdToLock = req.body.userId; // Assuming the user ID to lock is sent in the request body

			if (!userIdToLock) {
				return res.status(400).send("User ID is required");
			}

			const userToLock = await prisma.users.findUnique({
				where: {id: parseInt(userIdToLock)}
			});

			if (!userToLock) {
				return res.status(404).send("User not found");
			}

			const result = await prisma.users.update({
				where: {id: parseInt(userIdToLock)},
				data: {is_locked: true}
			});

			res.json({message: "User locked successfully", user: result});
		} else {
			res.status(403).json({message: "Insufficient privileges"});
		}
	} catch (error) {
		console.error(error);
		res.status(500).send("Error locking user");
	}
});
router.put("/unlock", async (req, res) => {
	try {
		const token = req.cookies.token;
		const userRole = await getUserRoleFromToken(token);

		if (userRole === 2 || userRole === 1) {
			const userIdToLock = req.body.userId; // Assuming the user ID to lock is sent in the request body

			if (!userIdToLock) {
				return res.status(400).send("User ID is required");
			}

			const userToLock = await prisma.users.findUnique({
				where: {id: parseInt(userIdToLock)}
			});

			if (!userToLock) {
				return res.status(404).send("User not found");
			}

			const result = await prisma.users.update({
				where: {id: parseInt(userIdToLock)},
				data: {is_locked: false}
			});

			res.json({message: "User unlocked successfully", user: result});
		} else {
			res.status(403).json({message: "Insufficient privileges"});
		}
	} catch (error) {
		console.error(error);
		res.status(500).send("Error locking user");
	}
});

module.exports = router;
