const express = require("express");
const router = express.Router();


router.get("/admin-dashboard", (req, res) => {
	res.render("admin-dashboard");
});
router.get("/user-dashboard", (req, res) => {
	res.render("user-dashboard");
});
router.get("/moderator-dashboard", (req, res) => {
	res.render("worker");
});

module.exports = router;