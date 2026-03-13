const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth.middleware");
const { getMessagesByChat, deleteMessageForMe, deleteMessageForEveryone } = require("../controllers/message.controller");

router.get("/:chatId", auth, getMessagesByChat);
router.delete("/:messageId/me", auth, deleteMessageForMe);
router.delete("/:messageId/everyone", auth, deleteMessageForEveryone);


module.exports = router;
