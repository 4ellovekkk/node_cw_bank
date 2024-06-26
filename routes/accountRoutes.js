const express = require("express");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const router = express.Router();

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

router.get("/account-creation", async (req, res) => {
	try {
		const token = req.cookies.token;// Получаем токен из заголовка запроса
		const userRole = await getUserRoleFromToken(token);

		// Проверяем роль пользователя
		if (userRole === 1 || userRole === 2) {
			const accountTypes = await prisma.account_types.findMany();
			const currencies = await prisma.currency.findMany();
			res.render("create_account.ejs", { accountTypes, currencies });
		} else if (userRole === 3) {
			res.status(403).send("insufficient privileges");
		} else {
			res.status(401).send("Unauthorized");
		}
	} catch (error) {
		console.error(error);
		res.status(500).send("Error retrieving data from the database");
	}
});

router.post("/account-creation", async (req, res) => {
	try {
		const token = req.cookies.token; // Получаем токен из заголовка запроса
		const userRole = await getUserRoleFromToken(token);

		// Проверяем роль пользователя
		if (userRole === 1 || userRole === 2) {
			const {accountType, currency} = req.body;
			// Создание счета в базе данных
			const newAccount = await prisma.accounts.create({
				data: {
					account_type: parseInt(accountType),
					currency: parseInt(currency),
					is_locked: false,
					balance: 0,
					owner: parseInt(req.body.owner),
					// Другие поля счета, которые нужно заполнить
				},
			});
			res.json({
				message: "Account created successfully",
				account: newAccount,
			});
		} else if (userRole === 3) {
			res.status(403).json({ error: "insufficient privileges" });
		} else {
			res.status(401).send("Unauthorized");
		}
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Error creating account" });
	}
});

// DELETE запрос для удаления счета
router.delete("/account-deletion/:id", async (req, res) => {
	try {
		const { id } = req.params;
		const role = await getUserRoleFromToken(req.cookies.token);
		// Проверка роли пользователя
		if (role !== 1 && role !== 2) {
			return res.status(403).json({ error: "Insufficient permissions" });
		}

		// Удаление счета из базы данных
		const deletedAccount = await prisma.accounts.delete({
			where: {
				id: parseInt(id),
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
});

router.get("/transfer-money", async (req, res) => {
	try {
		const token = req.cookies.token;
		if (!token) {
			return res.status(401).json({ error: "Unauthorized" });
		}
		const userId = await getUserIdFromToken(token);
		const accounts = await prisma.accounts.findMany({
			where: { owner_id: userId },
		});
		res.render("transferMoney", { accounts });
	} catch (error) {
		console.error("Error fetching accounts:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

router.post("/transfer", async (req, res) => {
	try {
		const token = req.cookies.token;
		if (!token) {
			return res.status(401).json({ error: "Unauthorized" });
		}
		const userRole = await getUserRoleFromToken(token);

		// Проверка роли пользователя
		if (userRole !== 3) {
			return res.status(403).json({ error: "Insufficient privileges" });
		}

		const { fromAccountId, toAccountId, amount } = req.body;
		let intAccountId = parseInt(fromAccountId, 10);
		console.log(fromAccountId);
		console.log(intAccountId);
		// Check if both accounts are not locked
		const fromAccount = await prisma.accounts.findUnique({
			where: { id: intAccountId },
		});
		const toAccount = await prisma.accounts.findUnique({
			where: { id: toAccountId },
		});

		if (!fromAccount || !toAccount) {
			return res.status(404).json({ error: "One or both accounts not found" });
		}

		if (fromAccount.is_locked || toAccount.is_locked) {
			return res.status(403).json({ error: "One or both accounts are locked" });
		}
		if (fromAccount.balance < amount) {
			return res.status(403).json({
				error: "On current account less money than needed for transfer",
			});
		}

		// Check if the fromAccount has sufficient balance
		if (fromAccount.balance < amount) {
			return res
				.status(400)
				.json({ error: "Insufficient balance in the from account" });
		}

		// Perform the transfer
		const updatedFromAccount = await prisma.accounts.update({
			where: { id: fromAccountId },
			data: { balance: { decrement: amount } },
		});

		const updatedToAccount = await prisma.accounts.update({
			where: { id: toAccountId },
			data: { balance: { increment: amount } },
		});

		res.status(200).json({
			message: "Money transferred successfully",
			fromAccount: updatedFromAccount,
			toAccount: updatedToAccount,
		});
	} catch (error) {
		console.error("Error transferring money:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

router.get("/balance/:id", async (req, res) => {
	try {
		const token = req.cookies.token;
		if (!token) {
			return res.status(401).json({ error: "Unauthorized" });
		}
		const userRole = await getUserRoleFromToken(token);

		// Проверка роли пользователя
		if (userRole !== 3) {
			return res.status(403).json({ error: "Insufficient privileges" });
		}

		const accountId = parseInt(req.params.id);
		const account = await prisma.accounts.findUnique({
			where: { id: accountId },
		});
		if (account) {
			res.json({ balance: account.balance });
		} else {
			res.status(404).json({ error: "Account not found" });
		}
	} catch (error) {
		console.error(`Error fetching balance for account ${req.params.id}`, error);
		res.status(500).json({ error: "Internal server error" });
	}
});
router.get("/fill", async (req, res) => {
	try {
		if (await getUserRoleFromToken(req.cookies.token) !== 3) {
			res.status(403).json({error: "Insufficient privileges"});
		}
		const userId = await getUserIdFromToken(req.cookies.token);
		const accountList = await prisma.accounts.findMany({where: {owner_id: userId}});
		res.render("fillAccount", {accountList});
	} catch (error) {
		console.error(`Error fetching accounts for user ${userId}`, error);
		res.status(500).json({error: "Internal server error"});
	}
});

router.post("/fill", async (req, res) => {
	try {
		if (await getUserRoleFromToken(req.cookies.token) !== 3) {
			return res.status(403).json({error: "Insufficient privileges"});
		}
		const {accountId, amount} = req.body;
		const account = await prisma.accounts.findUnique({where: {id: parseInt(accountId)}});

		if (!account) {
			return res.status(404).json({error: "Account not found"});
		}

		await prisma.accounts.update({
			where: {id: parseInt(accountId)},
			data: {balance: account.balance + parseFloat(amount)}
		});

		return res.status(200).json({message: "Account balance updated successfully"});
	} catch (error) {
		console.error(`Error updating balance for account ${req.body.accountId}`, error);
		return res.status(500).json({error: "Internal server error"});
	}
});

module.exports = router;
