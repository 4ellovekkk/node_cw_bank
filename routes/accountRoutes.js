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
		const role = await getUserRoleFromToken(req.cookies.token);
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

router.get("/transfer-money", async (req, res) => {
	try {
		const token = req.cookies.token;
		if (!token) {
			return res.status(401).json({ error: "Unauthorized" });
		}
		const userId = jwt.verify(token, "secret_key").id;
		const accounts = await prisma.accounts.findMany({
			where: { owner_id: userId },
		});
		res.render("transferMoney", { accounts });
	} catch (error) {
		console.error("JWT Verification Error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});
router.post("/transfer", async (req, res) => {
	try {
		const { fromAccountId, toAccountId, amount } = req.body;

		// Check if both accounts are not locked
		const fromAccount = await prisma.accounts.findUnique({
			where: { id: fromAccountId },
		});
		const toAccount = await prisma.accounts.findUnique({
			where: { id: toAccountId },
		});

		if (!fromAccount || !toAccount) {
			return res.status(404).json({ error: "One or both accounts not found" });
		}

		if (fromAccount.is_locked || toAccount.is_locked) {
			return res.status(403).json({ error: "One or both accounts are locked" });
		}

		// Check if the fromAccount has sufficient balance
		if (fromAccount.balance < amount) {
			return res
				.status(400)
				.json({ error: "Insufficient balance in the from account" });
		}

		// Perform the transfer
		const updatedFromAccount = await prisma.accounts.update({
			where: { id: fromAccountId },
			data: { balance: { decrement: amount } },
		});

		const updatedToAccount = await prisma.accounts.update({
			where: { id: toAccountId },
			data: { balance: { increment: amount } },
		});
		
		res.status(200).json({
			message: "Money transferred successfully",
			fromAccount: updatedFromAccount,
			toAccount: updatedToAccount,
		});
	} catch (error) {
		console.error("Error transferring money:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

module.exports = router;
