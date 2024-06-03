const express = require("express");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");

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

router.get('/open-credit', async (req, res) => {
	if (parseInt(await getUserRoleFromToken(req.cookies.token)) !== 3) {
		return res.status(401).json({message: "Insufficient privileges"});
	}
	const creditConditions = await prisma.credit_conditions.findMany();
	res.render('open-credit', {creditConditions});
});

// Маршрут для обработки открытия кредита
router.post('/open-credit', async (req, res) => {
	if (parseInt(await getUserRoleFromToken(req.cookies.token)) !== 3) {
        return res.status(401).json({message: "Insufficient privileges"});
	}
    const userId = parseInt(await getUserIdFromToken(req.cookies.token));

    const {creditConditionId, initialAmount} = req.body;
    const credit = await prisma.credit_conditions.findUnique({where: {id: parseInt(creditConditionId)}});
    if (!credit) {
        return res.status(404).json({message: "Credit condition not found"});
    }
	if (initialAmount > parseInt(credit.max_sum)) {
        return res.status(402).json({message: "Select another credit type or lower amount"});
	}

	const newAccount = await prisma.accounts.create({
		data: {
			owner_id: userId,
            account_type: 3, // Assuming type 3 is the credit account type
			balance: parseFloat(initialAmount),
            currency: credit.currency
		}
	});

	await prisma.operation_log.create({
		data: {
            user_id: userId,
			account_id: newAccount.id,
			table_name: 'accounts',
			additional_info: `Opened a new credit with initial amount ${initialAmount}`
		}
	});

    await prisma.credit_history.create({
        data: {
            user_id: userId,
            credit_id: parseInt(creditConditionId),
            amount: parseFloat(initialAmount)
        }
    });

	res.send('Credit account opened successfully');
});


// Маршрут для получения всех кредитов текущего пользователя
router.get('/my-credits', async (req, res) => {
	if (parseInt(await getUserRoleFromToken(req.cookies.token)) !== 3) {
		return res.status(401).json({message: "Insufficient privileges"});
	}
	const userId = parseInt(await getUserIdFromToken(req.cookies.token))

	const credits = await prisma.accounts.findMany({
		where: {
			owner_id: userId,
			account_type: 3 // Предполагается, что тип 3 - это тип кредитного счета
		},
		include: {
			currency_accounts_currencyTocurrency: true
		}
	});

	res.render('my-credits', {credits});
});

router.get('/calculator', async (req, res) => {
	const creditConditions = await prisma.credit_conditions.findMany();
	res.render('calculator', {creditConditions});
});

router.post('/calculate', (req, res) => {
	const {amount, interestRate, years} = req.body;
	const monthlyRate = interestRate / 100 / 12;
	const numberOfPayments = years * 12;
	const monthlyPayment = amount * monthlyRate / (1 - (Math.pow(1 / (1 + monthlyRate), numberOfPayments)));

	res.render('result', {amount, interestRate, years, monthlyPayment});
});

module.exports = router;
