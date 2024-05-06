const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");

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

router.get("/account-creation", async (req, res) => {
	try {
		const accountTypes = await prisma.account_types.findMany();
		const currencies = await prisma.currency.findMany();

		res.render("create_account.ejs", { accountTypes, currencies });
	} catch (error) {
		console.error(error);
		res.status(500).send("Error retrieving data from the database");
	}
});

router.post("/account-creation", async (req, res) => {
	try {
		const { account_type, currency } = req.body;

		// Проверка, что пользователь является администратором или работником,
		// или что id пользователя совпадает с полем owner
		let userRole = authenticateAndCheckRole(req.cookies.token);
		if (userRole == 3) {
			const newAccount = await prisma.accounts.create({
				data: {
					account_type: parseInt(account_type),
					currency: parseInt(currency),
					is_locked: false,
					balance: 0,
					owner: parseInt(jwt.verify(token, "secret_key").id),
				},
			});
		} else {
			const newAccount = await prisma.accounts.create({
				data: {
					account_type: parseInt(account_type),
					currency: parseInt(currency),
					is_locked: false,
					balance: 0,
					owner: req.body.owner,
				},
			});
		}

		// Создание счета в базе данных
		const newAccount = await prisma.accounts.create({
			data: {
				account_type: parseInt(account_type),
				currency: parseInt(currency),
				is_locked: false,
				balance: 0,
				owner: parseInt(req.body.owner),

				// Другие поля счета, которые нужно заполнить
			},
		});

		res.json({ message: "Account created successfully", account: newAccount });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Error creating account" });
	}
});

// DELETE запрос для удаления счета
router.delete("/account-deletion/:id", async (req, res) => {
	try {
		const { id } = req.params;
		const role = getUserRoleFromToken(req.cookies.token);
		// Проверка роли пользователя
		if (role !== 1 && role !== 2) {
			return res.status(403).json({ error: "Insufficient permissions" });
		}

		// Удаление счета из базы данных
		const deletedAccount = await prisma.accounts.delete({
			where: {
				OR: [{ id: parseInt(id) }],
			},
		});

		res.json({
			message: "Account deleted successfully",
			account: deletedAccount,
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Error deleting account" });
	}
});

module.exports = router;
