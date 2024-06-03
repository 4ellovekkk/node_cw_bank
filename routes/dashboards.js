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

	// Получение ближайшей даты оплаты по кредиту из таблицы credit_history
	const credits = await prisma.credit_history.findMany({
		where: {
			user_id: userId
		},
		include: {
			credit_conditions: true
		}
	});

	let nextPaymentDate = 'No upcoming payments';

	if (credits.length > 0) {
		const today = new Date();
		let nearestDate = null;

		for (const credit of credits) {
			const [month, day] = credit.credit_conditions.paydate.split('-').map(Number); // Assuming paydate is in "MM-DD" format

			const thisYearPayment = new Date(today.getFullYear(), month - 1, day);
			const nextYearPayment = new Date(today.getFullYear() + 1, month - 1, day);

			let paymentDate;
			if (thisYearPayment >= today) {
				paymentDate = thisYearPayment;
			} else {
				paymentDate = nextYearPayment;
			}

			if (!nearestDate || paymentDate < nearestDate) {
				nearestDate = paymentDate;
			}
		}

		if (nearestDate) {
			nextPaymentDate = nearestDate;
		}
	}

	res.render("user-dashboard", {currentDate, nextPaymentDate});
});

module.exports = router;
