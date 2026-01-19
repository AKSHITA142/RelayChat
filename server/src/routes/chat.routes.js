const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");
const { createChat } = require("../controllers/chat.controller");
const { getMyChats } = require("../controllers/chat.controller");

router.post("/create", authMiddleware, createChat);
router.get("/my-chats", authMiddleware, getMyChats);

module.exports = router;

