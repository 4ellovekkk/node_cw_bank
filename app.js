const express = require("express");
const authRoutes = require("./routes/authRoutes");
const userRouter = require("./routes/userRoutes"); // Путь к файлу с роутером
const accountRoutes = require("./routes/accountRoutes");
const creditRoutes = require("./routes/creditRoutes");
const path = require("path");
const app = express();
const cookieParser = require("cookie-parser");
//MIDDLEWARE
app.use(cookieParser());
app.use(express.json());
app.set("view engine", "ejs");
app.engine("ejs", require("ejs").__express);
app.set("views", path.join(__dirname, "views"));
// ROUTES
app.use("/auth", authRoutes);
app.use("/users", userRouter);
app.use("/account", accountRoutes);
app.use("/credit", creditRoutes);

// Конфигурация прослушивания порта
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
