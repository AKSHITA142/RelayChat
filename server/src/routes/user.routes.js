const express = require("express");
const authMiddleware = require("../middleware/auth.middleware");
const { getProfile, updateProfile, updateAvatar, searchUsers, checkPhoneNumber, saveContact, deleteContact, getUserEncryptionKey, upsertEncryptionKey, saveBackupKey, getBackupKey, verifyMobileForKeyReset } = require("../controllers/user.controller");
const upload = require("../middleware/upload.middleware");

const router = express.Router();

router.get("/profile", authMiddleware, getProfile);
router.put("/profile", authMiddleware, updateProfile);
router.post("/profile/avatar", authMiddleware, upload.single("file"), updateAvatar);
router.get("/:userId/key", authMiddleware, getUserEncryptionKey);
router.get("/", authMiddleware, searchUsers);
router.post("/check-number", authMiddleware, checkPhoneNumber);
router.post("/save-contact", authMiddleware, saveContact);
router.delete("/delete-contact/:targetUserId", authMiddleware, deleteContact);
router.post("/encryption-key", authMiddleware, upsertEncryptionKey);
router.post("/backup", authMiddleware, saveBackupKey);
router.post("/verify-reset", authMiddleware, verifyMobileForKeyReset);
router.get("/backup", authMiddleware, getBackupKey);

module.exports = router;
