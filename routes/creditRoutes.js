const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const { error } = require("console");

const prisma = new PrismaClient();
const router = express.Router();

// Middleware для проверки JWT токена
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
router.get("/take-credit", async (req, res) => {
	try {
		if ((await !getUserRoleFromToken(req.cookies.token)) == 3) {
			res.status(400).json({ error: "Incorrect role" });
		}
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

router.post("/take-credit", async (req, res) => {
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
		const { creditConditionId } = await prisma.credit_conditions.findUnique({
			where: { credit_name: req.body.creditName },
		});

		// Получаем информацию о условиях кредита
		const creditCondition = await prisma.credit_conditions.findUnique({
			where: { credit_name: req.body.creditName },
			include: { credit_types: true }, // Включаем информацию о типе кредита
		});

		if (!creditCondition) {
			return res.status(404).json({ error: "Credit condition not found" });
		}

		// Создаем счет для пользователя
		const newAccount = await prisma.accounts.create({
			data: {
				owner_id: decodedToken.userId,
				account_type: creditCondition.credit_types.id,
				balance: creditCondition.max_sum, // Заполняем баланс суммой кредита
				currency: creditCondition.currency,
				is_locked: false, // По умолчанию счет не блокируется
			},
		});

		// Записываем создание счета в журнал операций
		await prisma.operation_log.create({
			data: {
				user_id: userId,
				account_id: newAccount.id,
				table_name: "accounts",
				additional_info: `Created account for credit condition with ID ${creditCondition.id}`,
			},
		});

		// Возвращаем успешный ответ
		res
			.status(200)
			.json({ message: "Credit taken successfully", account: newAccount });
	} catch (error) {
		console.error("Error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

// GET запрос для страницы добавления типа кредита
router.get("/addCreditType", async (req, res) => {
	try {
		const token = req.cookies.token;
		const userRole = await getUserRoleFromToken(token);

		// Проверка роли пользователя
		if (userRole !== 1 && userRole !== 2) {
			// Доступ только для ролей worker и administrator
			return res.status(403).json({ message: "Insufficient privileges" });
		}

		// Отправка страницы добавления типа кредита
		res.render("CreateCreditType.ejs");
	} catch (error) {
		console.error("Ошибка при обработке запроса:", error);
		res.status(500).json({ message: "Internal server error" });
	}
});

router.get("/addCreditConditions", async (req, res) => {
	try {
		const token = req.cookies.token;
		const userRole = await getUserRoleFromToken(token);

		// Проверка роли пользователя
		if (userRole !== 1 && userRole !== 2) {
			// Доступ только для ролей worker и administrator
			return res.status(403).json({ message: "Insufficient privileges" });
		}
		const credit_types = await prisma.credit_types.findMany();
		const currencies = await prisma.currency.findMany();
		// Отправка страницы добавления данных в credit_conditions
		res.render("createCreditConditions.ejs", {
			credit_types: credit_types,
			currencies: currencies,
		});
	} catch (error) {
		console.error("Ошибка при обработке запроса:", error);
		res.status(500).json({ message: "Internal server error" });
	}
});

router.post("/addCreditConditions", async (req, res) => {
	try {
		const token = req.cookies.token;
		const userRole = await getUserRoleFromToken(token);

		// Проверка роли пользователя
		if (userRole !== 1 && userRole !== 2) {
			// Доступ только для ролей worker и administrator
			return res.status(403).json({ message: "Insufficient privileges" });
		}

		// Получение данных из тела запроса
		const {
			creditName,
			creditType,
			percentagePerYear,
			maxSum,
			currency,
			paydate,
		} = req.body;

		// Добавление данных в базу данных
		const newCreditCondition = await prisma.credit_conditions.create({
			data: {
				credit_name: creditName,
				credit_type: parseInt(creditType),
				percentage_per_year: parseFloat(percentagePerYear),
				max_sum: parseFloat(maxSum),
				currency: parseInt(currency),
				paydate: paydate,
			},
		});

		// Отправка успешного ответа
		res.status(200).json({
			message: "Credit condition added successfully",
			data: newCreditCondition,
		});
	} catch (error) {
		console.error("Ошибка при добавлении данных в credit_conditions:", error);
		res.status(500).json({ message: "Internal server error" });
	}
});

router.post("/addCreditType", async (req, res) => {
	try {
		const token = req.cookies.token;
		const userRole = await getUserRoleFromToken(token);

		// Проверка роли пользователя
		if (userRole !== 1 && userRole !== 2) {
			// Доступ только для ролей worker и administrator
			return res.status(403).json({ message: "Insufficient privileges" });
		}

		// Получение данных из тела запроса
		const { creditTypeName } = req.body;

		// Добавление нового типа кредита в базу данных
		const newCreditType = await prisma.credit_types.create({
			data: {
				credit_type_name: creditTypeName,
			},
		});

		// Отправка успешного ответа
		res
			.status(200)
			.json({ message: "Credit type added successfully", data: newCreditType });
	} catch (error) {
		console.error("Ошибка при добавлении типа кредита:", error);
		res.status(500).json({ message: "Internal server error" });
	}
});

router.delete("/deleteCreditConditions", async (req, res) => {
	try {
		const token = req.cookies.token;
		const userRole = await getUserRoleFromToken(token);

		// Проверка роли пользователя
		if (userRole !== 1 && userRole !== 2) {
			// Доступ только для ролей worker и administrator
			return res.status(403).json({ message: "Insufficient privileges" });
		}

		// Получение данных из тела запроса
		const { creditConditionId } = req.body;

		// Удаление данных из базы данных
		const deletedCreditCondition = await prisma.credit_conditions.delete({
			where: {
				id: parseInt(creditConditionId),
			},
		});

		// Отправка успешного ответа
		res.status(200).json({
			message: "Credit condition deleted successfully",
			data: deletedCreditCondition,
		});
	} catch (error) {
		console.error("Ошибка при удалении данных из credit_conditions:", error);
		res.status(500).json({ message: "Internal server error" });
	}
});

router.post("/addCreditType", async (req, res) => {
	try {
		const token = req.cookies.token;
		const userRole = await getUserRoleFromToken(token);

		// Проверка роли пользователя
		if (userRole !== 1 && userRole !== 2) {
			// Доступ только для ролей worker и administrator
			return res.status(403).json({ message: "Insufficient privileges" });
		}

		// Получение данных из тела запроса
		const { creditTypeName } = req.body;

		// Создание нового типа кредита в базе данных
		const newCreditType = await prisma.credit_types.create({
			data: {
				credit_type_name: creditTypeName,
			},
		});

		// Отправка успешного ответа
		res.status(200).json({
			message: "Credit type added successfully",
			data: newCreditType,
		});
	} catch (error) {
		console.error("Ошибка при добавлении типа кредита:", error);
		res.status(500).json({ message: "Internal server error" });
	}
});

// Удаление типа кредита
router.delete("/deleteCreditType", async (req, res) => {
	try {
		const token = req.cookies.token;
		const userRole = await getUserRoleFromToken(token);

		// Проверка роли пользователя
		if (userRole !== 1 && userRole !== 2) {
			// Доступ только для ролей worker и administrator
			return res.status(403).json({ message: "Insufficient privileges" });
		}

		// Получение данных из тела запроса
		const { creditTypeId } = req.body;

		// Удаление типа кредита из базы данных
		const deletedCreditType = await prisma.credit_types.delete({
			where: {
				id: parseInt(creditTypeId),
			},
		});

		// Отправка успешного ответа
		res.status(200).json({
			message: "Credit type deleted successfully",
			data: deletedCreditType,
		});
	} catch (error) {
		console.error("Ошибка при удалении типа кредита:", error);
		res.status(500).json({ message: "Internal server error" });
	}
});

module.exports = router;
