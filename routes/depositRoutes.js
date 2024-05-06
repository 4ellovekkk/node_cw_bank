const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const { error } = require("console");

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

		const userRole = user.role.id;
		return userRole;
	} catch (error) {
		console.error("Ошибка при получении роли пользователя из токена:", error);
		return null;
	}
}

router.get("/addDepositType", async (req, res) => {
	try {
		const token = req.cookies.token;
		const userRole = await getUserRoleFromToken(token);

		// Проверка роли пользователя
		if (userRole !== 1 && userRole !== 2) {
			// Доступ только для ролей worker и administrator
			return res.status(403).json({ message: "Insufficient privileges" });
		}

		// Отправка страницы добавления типа депозита
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

		// Проверка роли пользователя
		if (userRole !== 1 && userRole !== 2) {
			// Доступ только для ролей worker и administrator
			return res.status(403).json({ message: "Insufficient privileges" });
		}

		// Получение данных из тела запроса
		const { depositTypeName } = req.body;

		// Добавление нового типа депозита в базу данных
		const newDepositType = await prisma.deposit_types.create({
			data: {
				deposit_type_name: depositTypeName,
			},
		});

		// Отправка успешного ответа
		res.status(200).json({
			message: "Deposit type added successfully",
			data: newDepositType,
		});
	} catch (error) {
		console.error("Ошибка при добавлении типа депозита:", error);
		res.status(500).json({ message: "Internal server error" });
	}
});

router.get("/add-deposit-condition", async (req, res) => {
	try {
		const token = req.cookies.token;
		const userRole = await getUserRoleFromToken(token);

		if (userRole !== 1 && userRole !== 2) {
			return res.status(403).json({ message: "Insufficient privileges" });
		}

		const depositConditions = await prisma.deposit_conditions.findMany({
			include: {
				deposit_types: true,
				currency: true,
			},
		});

		res.render("creteDepositCondition", { depositConditions });
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
			currencyDepositConditionCurrencyId,
		} = req.body;

		const newDepositCondition = await prisma.deposit_conditions.create({
			data: {
				deposit_condition_name: depositConditionName,
				deposit_type: depositType,
				percentage_per_year: percentagePerYear,
				currency: currency,
				currency_deposit_conditioins_currencyTocurrency: {
					connect: {
						id: currencyDepositConditionCurrencyId,
					},
				},
			},
		});

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

		const deletedDepositCondition = await prisma.deposit_conditions.delete({
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
		if ((await !getUserRoleFromToken(req.cookies.token)) == 3) {
			res.status(400).json({ error: "Incorrect role" });
		}
		// Получение данных из базы данных
		const depositConditions = await prisma.deposit_conditioins.findMany({
			include: {
				deposit_types: true,
			},
		});

		// Рендеринг шаблона EJS и передача данных в него
		res.render("takeDeposit", { depositConditions });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Error retrieving deposit conditions" });
	}
});

router.post("/take-deposit", async (req, res) => {
	try {
		// Проверяем наличие токена в заголовках запроса
		let role = await getUserRoleFromToken(req.cookies.token);
		if (role !== 3) {
			return res.status(403).json({ error: "Insufficient priveleges" });
		}

		// Проверяем токен и получаем id пользователя
		const decodedToken = jwt.verify(req.cookies.token, "secret_key");
		const userId = decodedToken.id;

		// Получаем данные из тела запроса
		const { depositConditionId } = await prisma.deposit_conditioins.findUnique({
			where: { deposit_condition_name: req.body.depositConditionName },
		});

		// Получаем информацию о условиях депозита
		const depositCondition = await prisma.deposit_conditioins.findUnique({
			where: { deposit_condition_name: req.body.depositConditionName },
			include: { deposit_types: true }, // Включаем информацию о типе депозита
		});

		if (!depositCondition) {
			return res.status(404).json({ error: "Deposit condition not found" });
		}

		// Создаем счет для пользователя
		const newAccount = await prisma.accounts.create({
			data: {
				owner_id: decodedToken.userId,
				account_type: depositCondition.deposit_types.id,
				balance: 0, // При открытии депозита баланс равен 0
				currency: depositCondition.currency,
				is_locked: false, // По умолчанию счет не блокируется
			},
		});

		// Записываем создание счета в журнал операций
		await prisma.operation_log.create({
			data: {
				user_id: userId,
				account_id: newAccount.id,
				table_name: "accounts",
				additional_info: `Created account for deposit condition with ID ${depositCondition.id}`,
			},
		});

		// Возвращаем успешный ответ
		res
			.status(200)
			.json({ message: "Deposit taken successfully", account: newAccount });
	} catch (error) {
		console.error("Error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});
module.exports = router;
