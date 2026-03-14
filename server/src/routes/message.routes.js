const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth.middleware");
const { getMessagesByChat, deleteMessageForMe, deleteMessageForEveryone, uploadFile } = require("../controllers/message.controller");
const upload = require("../middleware/upload.middleware");

router.get("/:chatId", auth, getMessagesByChat);
router.post("/upload", auth, upload.single("file"), uploadFile);
router.delete("/:messageId/me", auth, deleteMessageForMe);
router.delete("/:messageId/everyone", auth, deleteMessageForEveryone);


module.exports = router;


