const express = require("express");

const { login, sendOtp, verifyOtp, completeRegistration } = require("../controllers/auth.controller");

const router = express.Router();

router.post("/login",login)

// OTP API
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/complete-registration", completeRegistration);

module.exports = router;
