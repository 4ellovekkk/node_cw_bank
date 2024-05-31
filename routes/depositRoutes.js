const express = require("express");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const router = express.Router();

async function getUserRoleFromToken(token) {
	try {
		const decodedToken = jwt.verify(token, "secret_key");
		const username = decodedToken.username;

		const user = await prisma.users.findUnique({
			where: {
				username: username,
			},
			include: {
				role: true,
			},
		});

		if (!user) {
			return null;
		}

		return user.role.id;
	} catch (error) {
		console.error("Ошибка при получении роли пользователя из токена:", error);
		return null;
	}
}

router.get("/addDepositType", async (req, res) => {
	try {
		const token = req.cookies.token;
		const userRole = await getUserRoleFromToken(token);

		if (userRole !== 1 && userRole !== 2) {
			return res.status(403).json({ message: "Insufficient privileges" });
		}

		res.render("CreateDepositType");
	} catch (error) {
		console.error("Ошибка при обработке запроса:", error);
		res.status(500).json({ message: "Internal server error" });
	}
});

router.post("/addDepositType", async (req, res) => {
	try {
		const token = req.cookies.token;
		const userRole = await getUserRoleFromToken(token);

		if (userRole !== 1 && userRole !== 2) {
			return res.status(403).json({ message: "Insufficient privileges" });
		}

		const { depositTypeName } = req.body;

		const newDepositType = await prisma.deposit_types.create({
			data: {
				deposit_type_name: depositTypeName,
			},
		});

		res.status(200).json({
			message: "Deposit type added successfully",
			data: newDepositType,
		});
	} catch (error) {
		console.error("Ошибка при добавлении типа депозита:", error);
		res.status(500).json({ message: "Internal server error" });
	}
});

router.get("/addDepositConditions", async (req, res) => {
	try {
		const token = req.cookies.token;
		const userRole = await getUserRoleFromToken(token);

		if (userRole !== 1 && userRole !== 2) {
			return res.status(403).json({ message: "Insufficient privileges" });
		}

		const depositConditions = await prisma.deposit_conditioins.findMany({
			include: {
				deposit_types: true,
			},
		});

		res.render("createDepositCondition", {depositConditions});
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Error retrieving deposit conditions" });
	}
});

router.post("/add-deposit-condition", async (req, res) => {
	try {
		const token = req.cookies.token;
		const userRole = await getUserRoleFromToken(token);

		if (userRole !== 1 && userRole !== 2) {
			return res.status(403).json({ message: "Insufficient privileges" });
		}

		const {
			depositConditionName,
			depositType,
			percentagePerYear,
			currency,
		} = req.body;

		let newDepositCondition;
		if (parseInt(percentagePerYear) > 0) {
			newDepositCondition = await prisma.deposit_conditioins.create({
				data: {
					deposit_condition_name: depositConditionName,
					deposit_type: parseInt(depositType),
					percentage_per_year: parseFloat(percentagePerYear),
					currency: parseInt(currency),
				},
			});
		}

		res.status(200).json({
			message: "Deposit condition added successfully",
			data: newDepositCondition,
		});
	} catch (error) {
		console.error("Ошибка при добавлении депозитных условий:", error);
		res.status(500).json({ message: "Internal server error" });
	}
});

router.delete("/delete-deposit-condition/:id", async (req, res) => {
	try {
		const token = req.cookies.token;
		const userRole = await getUserRoleFromToken(token);

		if (userRole !== 1 && userRole !== 2) {
			return res.status(403).json({ message: "Insufficient privileges" });
		}

		const { id } = req.params;

		const deletedDepositCondition = await prisma.deposit_conditioins.delete({
			where: {
				id: parseInt(id),
			},
		});

		res.status(200).json({
			message: "Deposit condition deleted successfully",
			data: deletedDepositCondition,
		});
	} catch (error) {
		console.error("Ошибка при удалении депозитных условий:", error);
		res.status(500).json({ message: "Internal server error" });
	}
});

router.get("/take-deposit", async (req, res) => {
	try {
		if ((await !getUserRoleFromToken(req.cookies.token)) === 3) {
			res.status(400).json({ error: "Incorrect role" });
		}

		const depositConditions = await prisma.deposit_conditioins.findMany({
			include: {
				deposit_types: true,
			},
		});

		res.render("takeDeposit", { depositConditions });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Error retrieving deposit conditions" });
	}
});

router.post("/take-deposit", async (req, res) => {
	try {
		let role = await getUserRoleFromToken(req.cookies.token);
		if (role !== 3) {
			return res.status(403).json({ error: "Insufficient priveleges" });
		}

		const decodedToken = jwt.verify(req.cookies.token, "secret_key");
		const userId = decodedToken.id;

		const depositConditionName = req.body.depositConditionName;

		if (!depositConditionName) {
			return res.status(400).json({error: "Deposit condition name is required"});
		}

		const depositCondition = await prisma.deposit_conditioins.findUnique({
			where: { deposit_condition_name: depositConditionName },
			include: { deposit_types: true },
		});

		if (!depositCondition) {
			return res.status(404).json({ error: "Deposit condition not found" });
		}

		const newAccount = await prisma.accounts.create({
			data: {
				owner_id: decodedToken.userId,
				account_type: depositCondition.deposit_types.id,
				balance: 0,
				currency: depositCondition.currency,
				is_locked: false,
			},
		});

		await prisma.operation_log.create({
			data: {
				user_id: userId,
				account_id: newAccount.id,
				table_name: "accounts",
				additional_info: `Created account for deposit condition with ID ${depositCondition.id}`,
			},
		});

		res.status(200).json({message: "Deposit taken successfully", account: newAccount});
	} catch (error) {
		console.error("Error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

module.exports = router;
