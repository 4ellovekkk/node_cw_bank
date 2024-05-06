const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const router = express.Router();

// Middleware для проверки JWT токена и роли пользователя
function authenticateAndCheckRole(req, res, next) {
	const authHeader = req.headers["authorization"];
	const token = authHeader && authHeader.split(" ")[1];
	if (token == null) return res.sendStatus(401);

	jwt.verify(token, "secret_key", (err, user) => {
		if (err) return res.sendStatus(403);
		if (user.role !== "Administrator" && user.role !== "Worker") {
			return res.status(403).json({ error: "Insufficient permissions" });
		}
		req.user = user;
		next();
	});
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

		// Создание счета в базе данных
		const newAccount = await prisma.accounts.create({
			data: {
				account_type: parseInt(account_type),
				currency: parseInt(currency),
				is_locked: false,
				balance: 0,

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
router.delete(
	"/account-deletion/:id",
	authenticateAndCheckRole,
	async (req, res) => {
		try {
			const { id } = req.params;

			// Проверка роли пользователя
			const role = req.user.role;
			if (role !== "Administrator" && role !== "Worker") {
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
	}
);

module.exports = router;
