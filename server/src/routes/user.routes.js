const express = require("express");
const authMiddleware = require("../middleware/auth.middleware");
const { getProfile, searchUsers } = require("../controllers/user.controller");


const router = express.Router();

router.get("/profile", authMiddleware, getProfile);
router.get("/", authMiddleware, searchUsers);

module.exports = router;
