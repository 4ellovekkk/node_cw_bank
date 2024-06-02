const express = require("express");
const router = express.Router();
const {PrismaClient} = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require("jsonwebtoken")

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

router.get("/user-dashboard", async (req, res) => {
	if (parseInt(await getUserRoleFromToken(req.cookies.token)) !== 3) {
		return res.status(401).json({message: "Insufficient privileges"});
	}
	const userId = await getUserIdFromToken(req.cookies.token); // Получаем id пользователя из токена

	// Если не удалось получить id пользователя из токена, возвращаем ошибку
	if (!userId) {
		return res.status(401).json({error: "Unauthorized"});
	}

	// Получение текущей даты
	const currentDate = new Date();

	// Получение ближайшей даты оплаты по кредиту
	const nextPayment = await prisma.accounts.findMany({
		where: {
			owner_id: userId,
			account_type: 3 // Предполагается, что тип 3 - это тип кредитного счета
		},
		include: {
			operation_log: {
				select: {
					action_time: true
				},
				where: {
					table_name: 'credit_payments'
				},
				orderBy: {
					action_time: 'asc'
				},
				take: 1
			}
		}
	});
	let nextPaymentDate;
	if (nextPayment.length > 0) {
		if (nextPayment[0].operation_log.length > 0) {
			nextPaymentDate = nextPayment[0].operation_log[0].action_time;
		} else {
			nextPaymentDate = 'No upcoming payments';
		}
	} else {
		nextPaymentDate = 'No upcoming payments';
	}

	res.render("user-dashboard", {currentDate, nextPaymentDate});
});

module.exports = router;
