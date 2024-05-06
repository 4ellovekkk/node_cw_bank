const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const router = express.Router();

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
module.exports = router;
