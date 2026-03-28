const express = require("express");

const {
  login,
  sendEmailOtp,
  verifyEmailOtp,
  completeRegistration,
  logout,
} = require("../controllers/auth.controller");

const router = express.Router();

router.post("/login",login)
router.post("/send-email-otp", sendEmailOtp);
router.post("/verify-email-otp", verifyEmailOtp);
router.post("/complete-registration", completeRegistration);
router.post("/logout", logout);

module.exports = router;
