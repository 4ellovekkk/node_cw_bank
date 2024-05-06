const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();
const router = express.Router();

// GET запрос для отображения страницы изменения информации о пользователе
router.get('/edit-user/:id', async (req, res) => {
  let id = req.params.id;
  try {
    const user = await prisma.users.findUnique({ where: { id: parseInt(id) } });
    if (!user) {
      return res.status(404).send('User not found');
    }
    res.render('form', { userId: id, user });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching user');
  }
});

// PUT запрос для обновления информации о пользователе
router.put('/:id/edit', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { first_name, midle_name, last_name, phone, user_role, username, passwd } = req.body;

    // Обновление информации о пользователе в базе данных
    let updateData = {
      first_name,
      midle_name,
      last_name,
      phone,
      user_role,
      username
    };

    if (passwd && passwd.trim() !== '') {
      let hashedPassword = await bcrypt.hash(passwd, 10);
      updateData.passwd = hashedPassword;
    }

    const updatedUser = await prisma.users.update({
      where: {
        id: userId
      },
      data: updateData
    });

    res.json({ message: 'User information updated successfully', user: updatedUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error updating user information' });
  }
});

module.exports = router;
