const express = require("express");
const authMiddleware = require("../middleware/auth.middleware");
const { getProfile, searchUsers, checkPhoneNumber, saveContact } = require("../controllers/user.controller");


const router = express.Router();

router.get("/profile", authMiddleware, getProfile);
router.get("/", authMiddleware, searchUsers);
router.post("/check-number", authMiddleware, checkPhoneNumber);
router.post("/save-contact", authMiddleware, saveContact);

module.exports = router;
