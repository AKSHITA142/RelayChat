const express = require("express");
const authMiddleware = require("../middleware/auth.middleware");
const { getProfile } = require("../controllers/user.controller");


const router = express.Router();

//Middleware sits b/w routes and controller
router.get("/profile", authMiddleware, getProfile);

module.exports = router;
