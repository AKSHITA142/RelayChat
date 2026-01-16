const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth.middleware");
const { getMessagesByChat } = require("../controllers/message.controller");

router.get("/:chatId", auth, getMessagesByChat);

module.exports = router;
