const mongoose = require("mongoose");

const emailOtpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    attemptCount: {
      type: Number,
      default: 0,
    },
    lastSentAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

// Auto-delete expired OTP documents
emailOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
emailOtpSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model("EmailOtp", emailOtpSchema);

