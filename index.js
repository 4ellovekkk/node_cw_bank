
const express = require('express');
const authRoutes = require('./authRoutes');
const path = require('path');
const app = express();


app.use(express.json()) 
app.set('view engine', 'ejs');
app.engine('ejs', require('ejs').__express);
app.set('views', path.join(__dirname, 'views'));
// GET запрос для отображения страницы регистрации
app.get('/register', (req, res) => {
  res.render('register');
});

// GET запрос для отображения страницы входа
app.get('/login', (req, res) => {
  res.render('login');
});

app.use('/auth', authRoutes);

// Конфигурация прослушивания порта
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));