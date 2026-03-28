const User = require("../models/User");
const EmailOtp = require("../models/EmailOtp");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { sendEmailViaSendgrid } = require("../config/sendgrid");

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

// Helper function to set secure cookies
const setAuthCookie = (res, token) => {
  const isProduction = process.env.NODE_ENV === "production";

  res.cookie("token", token, {
    httpOnly: true,
    secure: isProduction, // Only send over HTTPS in production
    sameSite: isProduction ? "None" : "Lax", // None for cross-site in production
    maxAge: 2 * 60 * 60 * 1000, // 2 hours
    path: "/",
  });
};

// Helper function to clear cookies
const clearAuthCookie = (res) => {
  const isProduction = process.env.NODE_ENV === "production";

  res.cookie("token", "", {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "None" : "Lax",
    expires: new Date(0), // Immediately expire
    path: "/",
  });
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "5h" }
    );

    setAuthCookie(res, token);

    res.json({
      message: "Login successful",
      token, // Still send token for client-side storage
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        contacts: user.contacts,
        encryptionPublicKey: user.encryptionPublicKey,
        encryptionDevices: user.encryptionDevices || [],
        lastLoginAt: user.lastLoginAt,
      },
    });
  } catch (error) {
    console.error("login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getOtpConfig = () => {
  const ttlSeconds = Number(process.env.OTP_TTL_SECONDS || 300);
  const cooldownSeconds = Number(process.env.OTP_COOLDOWN_SECONDS || 60);
  const maxAttempts = Number(process.env.OTP_MAX_ATTEMPTS || 5);
  const otpSecret = process.env.OTP_SECRET || process.env.JWT_SECRET;

  if (!otpSecret) {
    throw new Error("Missing OTP_SECRET (or JWT_SECRET) for OTP hashing");
  }

  return {
    ttlSeconds,
    cooldownSeconds,
    maxAttempts,
    otpSecret,
  };
};

const hashOtp = (otp, otpSecret) => {
  return crypto.createHmac("sha256", otpSecret).update(String(otp)).digest("hex");
};

const timingSafeEqualHex = (aHex, bHex) => {
  const a = Buffer.from(String(aHex), "hex");
  const b = Buffer.from(String(bHex), "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};

// POST /auth/send-email-otp
// body: { email }
exports.sendEmailOtp = async (req, res) => {
  try {
    const { ttlSeconds, cooldownSeconds, otpSecret } = getOtpConfig();
    const email = normalizeEmail(req.body?.email);

    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ message: "Valid email is required" });
    }

    const now = new Date();
    const existing = await EmailOtp.findOne({ email });

    if (existing?.lastSentAt) {
      const msSinceLastSend = now.getTime() - new Date(existing.lastSentAt).getTime();
      const msCooldown = cooldownSeconds * 1000;
      if (msSinceLastSend < msCooldown) {
        const waitSeconds = Math.ceil((msCooldown - msSinceLastSend) / 1000);
        return res.status(429).json({
          message: `Please wait ${waitSeconds}s before requesting another OTP`,
        });
      }
    }

    const otp = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
    const otpHash = hashOtp(otp, otpSecret);
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

    await EmailOtp.findOneAndUpdate(
      { email },
      { email, otpHash, expiresAt, attemptCount: 0, lastSentAt: now },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const textMsg = `Your RelayChat verification code is: ${otp}\n\nThis code expires in ${Math.round(ttlSeconds / 60)} minutes.`;
    
    // Call Sendgrid
    await sendEmailViaSendgrid(email, "Your RelayChat verification code", textMsg);

    res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    console.error("sendEmailOtp error:", error);
    res.status(500).json({ message: "Failed to send OTP" });
  }
};

// POST /auth/verify-email-otp
// body: { email, otp }
exports.verifyEmailOtp = async (req, res) => {
  try {
    const { maxAttempts, otpSecret } = getOtpConfig();
    const email = normalizeEmail(req.body?.email);
    const otp = String(req.body?.otp || "").trim();

    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ message: "Valid email is required" });
    }
    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({ message: "Valid 6-digit OTP is required" });
    }

    const record = await EmailOtp.findOne({ email });
    if (!record) {
      return res.status(400).json({ message: "OTP expired or not requested" });
    }

    const now = new Date();
    if (record.expiresAt && now > new Date(record.expiresAt)) {
      await EmailOtp.deleteOne({ _id: record._id });
      return res.status(400).json({ message: "OTP expired" });
    }

    if ((record.attemptCount || 0) >= maxAttempts) {
      await EmailOtp.deleteOne({ _id: record._id });
      return res.status(429).json({ message: "Too many attempts. Please request a new OTP." });
    }

    const submittedHash = hashOtp(otp, otpSecret);
    const isValid = timingSafeEqualHex(submittedHash, record.otpHash);

    if (!isValid) {
      await EmailOtp.updateOne({ _id: record._id }, { $inc: { attemptCount: 1 } });
      return res.status(400).json({ message: "Invalid OTP" });
    }

    await EmailOtp.deleteOne({ _id: record._id });

    let user = await User.findOne({ email });
    if (!user) {
      const defaultName = email.split("@")[0] ? `User ${email.split("@")[0]}` : "User";
      user = await User.create({ email, name: defaultName, lastLoginAt: now });
    } else {
      user.lastLoginAt = now;
      await user.save();
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "5h" }
    );

    setAuthCookie(res, token);

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        contacts: user.contacts,
        encryptionPublicKey: user.encryptionPublicKey,
        encryptionDevices: user.encryptionDevices || [],
        lastLoginAt: user.lastLoginAt,
      },
    });
  } catch (error) {
    console.error("verifyEmailOtp error:", error);
    res.status(500).json({ message: "Failed to verify OTP" });
  }
};

exports.completeRegistration = async (req, res) => {
  try {
    const { name, email, password, phoneNumber } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    const normalizedEmail = email ? normalizeEmail(email) : undefined;

    let hashedPassword;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password, salt);
    }

    let user = null;
    if (phoneNumber) user = await User.findOne({ phoneNumber });
    if (!user && normalizedEmail) user = await User.findOne({ email: normalizedEmail });

    if (normalizedEmail) {
      const existingEmail = await User.findOne({ email: normalizedEmail });
      if (existingEmail && (!user || String(existingEmail._id) !== String(user._id))) {
        return res.status(400).json({ message: "Email already in use" });
      }
    }

    if (!user) {
      user = await User.create({
        name,
        email: normalizedEmail,
        password: hashedPassword,
        phoneNumber,
        lastLoginAt: new Date(),
      });
    } else {
      user.name = name;
      if (normalizedEmail !== undefined) user.email = normalizedEmail;
      if (hashedPassword) user.password = hashedPassword;
      if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
      user.lastLoginAt = new Date();
      await user.save();
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    setAuthCookie(res, token);

    res.status(200).json({
      message: "Registration complete",
      token,
      user: {
        _id: user._id,
        name: user.name,
        phoneNumber: user.phoneNumber,
        email: user.email,
        role: user.role,
        contacts: user.contacts,
        encryptionPublicKey: user.encryptionPublicKey,
        encryptionDevices: user.encryptionDevices || [],
        lastLoginAt: user.lastLoginAt,
      },
    });
  } catch (error) {
    console.error("completeRegistration error:", error);
    res.status(500).json({ message: "Failed to complete registration" });
  }
};

// Logout function to clear cookies
exports.logout = async (req, res) => {
  try {
    clearAuthCookie(res);
    res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    console.error("logout error:", error);
    res.status(500).json({ message: "Failed to logout" });
  }
};
