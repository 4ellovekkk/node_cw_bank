const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const router = express.Router();

// Middleware для проверки JWT токена
function authenticateToken(req, res, next) {
	const authHeader = req.headers["authorization"];
	const token = authHeader && authHeader.split(" ")[1];
	if (token == null) return res.sendStatus(401);

	jwt.verify(token, "secret_key", (err, user) => {
		if (err) return res.sendStatus(403);
		req.user = user;
		next();
	});
}

router.get("/take-credit", authenticateToken, async (req, res) => {
	try {
		// Получение данных из базы данных
		const creditConditions = await prisma.credit_conditions.findMany({
			include: {
				credit_types: true,
			},
		});

		// Рендеринг шаблона EJS и передача данных в него
		res.render("creditTake", { creditConditions });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Error retrieving credit conditions" });
	}
});

module.exports = router;
