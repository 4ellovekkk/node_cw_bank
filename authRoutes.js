const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const router = express.Router();

// Регистрация пользователя
router.post('/register', async (req, res) => {
  try {
    // const { username, password, role } = req.body; // Данные формы извлекаются из req.body
    const username=req.body.username
    const password = req.body.password
    const role = req.body.role
    // Хеширование пароля
    const hashedPassword = await bcrypt.hash(password, 10);

    // Создание пользователя
    const user = await prisma.users.create({
      data: {
        username,
        password: hashedPassword,
        role
      }
    });

    res.json({ message: 'User registered successfully', user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error registering user' });
  }
});


// Вход пользователя
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Поиск пользователя по имени пользователя
    const user = await prisma.users.findUnique({
      where: {
        username
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Проверка пароля
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Создание JWT токена
    const token = jwt.sign({ userId: user.id, role: user.role }, 'secret_key');

    res.json({ message: 'Login successful', token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error logging in' });
  }
});

module.exports = router