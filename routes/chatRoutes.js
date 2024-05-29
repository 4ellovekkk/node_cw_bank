const express = require("express");
const router = express.Router();

let userMessages = [];
let adminMessages = [];
module.exports = (io) => {
    router.get("/:role", async (req, res) => {
        try {
            const role = req.params.role;
            const userRole = role === "admin" ? "user" : "admin";
            const userMessagesToShow = userRole === "admin" ? adminMessages : userMessages;
            const adminMessagesToShow = userRole === "admin" ? userMessages : adminMessages;
            res.render("chat", {userRole, userMessagesToShow, adminMessagesToShow});
        } catch (error) {
            console.error("Error loading chat page:", error);
            res.status(500).json({error: "Could not load chat page"});
        }
    });

    router.post("/messages", (req, res) => {
        const role = req.body.role;
        const message = req.body.message;
        if (role === "admin") {
            userMessages.push(message);
        } else {
            adminMessages.push(message);
        }
        io.emit("newMessage");
        res.redirect(`/chat/${role}`);
    });

    return router;
};
