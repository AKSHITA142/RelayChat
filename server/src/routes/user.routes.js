const express = require("express");
const authMiddleware = require("../middleware/auth.middleware");
const { getProfile, searchUsers, checkPhoneNumber, saveContact, getUserEncryptionKey, upsertEncryptionKey } = require("../controllers/user.controller");


const router = express.Router();

router.get("/profile", authMiddleware, getProfile);
router.get("/:userId/key", authMiddleware, getUserEncryptionKey);
router.get("/", authMiddleware, searchUsers);
router.post("/check-number", authMiddleware, checkPhoneNumber);
router.post("/save-contact", authMiddleware, saveContact);
router.post("/encryption-key", authMiddleware, upsertEncryptionKey);

module.exports = router;
