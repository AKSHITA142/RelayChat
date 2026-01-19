const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");
const { createChat } = require("../controllers/chat.controller");
const { getMyChats } = require("../controllers/chat.controller");
const { createGroup } = require("../controllers/chat.controller");
const {addToGroup} = require("../controllers/chat.controller");
const { removeFromGroup } = require("../controllers/chat.controller");

router.post("/create", authMiddleware, createChat);
router.get("/my-chats", authMiddleware, getMyChats);
router.post("/create-group", authMiddleware, createGroup);
router.post("/:chatId/add-to-group", authMiddleware, addToGroup);
router.post("/:chatId/remove-from-group", authMiddleware, removeFromGroup);

module.exports = router;

