const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const router = express.Router();

// Регистрация пользователя
router.post('/register', async (req, res) => {
  try {
    let { username, password, role } = req.body;
    switch (role)
    {
      case "Administrator": role=1;break;
      case "Worker": role=2;break;
      case "User": role=3;break;
    }
     
    // Проверка на уникальность имени пользователя
    const existingUser = await prisma.users.findUnique({
      where: {
        username: username // Поиск пользователя по имени
      }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Хеширование пароля
    const hashedPassword = await bcrypt.hash(password, 10);

    // Создание пользователя
    const user = await prisma.users.create({
      data: {
        username,
        passwd: hashedPassword,
        role: {
          connect: {
            id:role// Подключение роли по ее id
          }
        }
      }
    });
    
    console.log('User registered successfully');
    res.json({ message: 'User registered successfully', user });
  } catch (error) {
    if (error.code === 'P2002' && error.meta?.target?.includes('username')) {
      // Обработка ошибки уникального ограничения
      return res.status(400).json({ error: 'Username already exists' });
    }
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
    const isPasswordValid = await bcrypt.compare(password, user.passwd);
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
module.exports = router;