const express = require("express");

const { register , login, sendOtp, verifyOtp } = require("../controllers/auth.controller");

const router = express.Router();

// REGISTER API
router.post("/register", register);
router.post("/login",login)

// OTP API
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);

module.exports = router;
