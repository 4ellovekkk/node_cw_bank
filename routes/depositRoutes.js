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

		try {
			const depositTypes = await prisma.deposit_types.findMany();
			const depositConditions = await prisma.deposit_conditioins.findMany();
			const currencies = await prisma.currency.findMany();
			res.render('createDepositCondition', {depositTypes, depositConditions, currencies});
		} catch (error) {
			console.error(error);
			res.status(500).send("Error fetching deposit types");
		}
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


// Маршрут для отображения формы открытия вклада
router.get('/open-deposit', async (req, res) => {
	if (parseInt(await getUserRoleFromToken(req.cookies.token)) !== 3) {
		return res.status(403).json({message: "Insufficient privileges"});
	}
	const depositConditions = await prisma.deposit_conditioins.findMany();
	res.render('open-deposit', {depositConditions});
});

// Маршрут для обработки открытия вклада
router.post('/open-deposit', async (req, res) => {
	const {depositConditionId, initialAmount} = req.body;
	const userId = await getUserIdFromToken(req.cookies.token);
	const newAccount = await prisma.accounts.create({
		data: {
			owner_id: parseInt(userId),
			account_type: 2, // Предполагается, что тип 2 - это тип депозитного счета
			balance: parseFloat(initialAmount),
			currency: (await prisma.deposit_conditioins.findUnique({
				where: {id: parseInt(depositConditionId)}
			})).currency
		}
	});

	await prisma.operation_log.create({
		data: {
			user_id: parseInt(userId),
			account_id: newAccount.id,
			table_name: 'accounts',
			additional_info: `Opened a new deposit with initial amount ${initialAmount}`
		}
	});

	res.send('Deposit account opened successfully');
});

router.get('/my-deposits', async (req, res) => {
	if (parseInt(await getUserRoleFromToken(req.cookies.token)) !== 3) {
		return res.status(401).json({message: "Insufficient privileges"});
	}
	const userId = await getUserIdFromToken(req.cookies.token)// Замените на фактический идентификатор текущего пользователя

	const deposits = await prisma.accounts.findMany({
		where: {
			owner_id: userId,
			account_type: 2 // Предполагается, что тип 2 - это тип депозитного счета
		},
		include: {
			currency_accounts_currencyTocurrency: true
		}
	});

	res.render('my-deposits', {deposits});
});


module.exports = router;
