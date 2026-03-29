const User = require("../models/User");
const EmailOtp = require("../models/EmailOtp");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { sendEmailViaSendgrid } = require("../config/sendgrid");

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const setAuthCookie = (res, token) => {
  const isProduction = process.env.NODE_ENV === "production";

  res.cookie("token", token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "None" : "Lax",
    maxAge: 2 * 60 * 60 * 1000,
    path: "/",
  });
};

const clearAuthCookie = (res) => {
  const isProduction = process.env.NODE_ENV === "production";

  res.cookie("token", "", {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "None" : "Lax",
    expires: new Date(0),
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

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "5h",
    });

    setAuthCookie(res, token);

    res.json({
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
    console.error("login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getOtpConfig = () => {
  const ttlSeconds = Number(process.env.OTP_TTL_SECONDS || 300);
  const cooldownSeconds = Number(process.env.OTP_COOLDOWN_SECONDS || 60);
  const maxAttempts = Number(process.env.OTP_MAX_ATTEMPTS || 5);
  const otpSecret =
    process.env.OTP_SECRET ||
    process.env.JWT_SECRET ||
    "default-otp-secret-change-in-production";

  if (!otpSecret || otpSecret === "default-otp-secret-change-in-production") {
    console.warn(
      "Using default OTP secret. Set OTP_SECRET (or JWT_SECRET) in production."
    );
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
    if (!req.body || !req.body.email) {
      return res.status(400).json({ message: "Email is required" });
    }

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
          email,
          retryAfterSeconds: waitSeconds,
          cooldownSeconds,
        });
      }
    }

    const otp = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
    const otpHash = hashOtp(otp, otpSecret);
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

    const otpRecord = await EmailOtp.findOneAndUpdate(
      { email },
      { email, otpHash, expiresAt, attemptCount: 0, lastSentAt: now },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const textMsg = `Your RelayChat verification code is: ${otp}\n\nThis code expires in ${Math.round(
      ttlSeconds / 60
    )} minutes.`;

    try {
      await sendEmailViaSendgrid(email, "Your RelayChat verification code", textMsg);
    } catch (sendError) {
      // Avoid locking the user out with cooldown if email delivery fails.
      try {
        if (otpRecord?._id) {
          await EmailOtp.deleteOne({ _id: otpRecord._id });
        } else {
          await EmailOtp.deleteOne({ email });
        }
      } catch {
        /* ignore cleanup errors */
      }
      throw sendError;
    }

    res.status(200).json({
      message: "OTP sent successfully",
      email,
      ttlSeconds,
      cooldownSeconds,
    });
  } catch (error) {
    const statusCode = error?.code || error?.response?.statusCode;
    if (statusCode === 401) {
      return res.status(500).json({
        message:
          "Email provider unauthorized. Check SENDGRID_API_KEY on the deployed server.",
      });
    }
    if (statusCode === 403) {
      return res.status(500).json({
        message:
          "Email provider forbidden. Verify SENDGRID_FROM sender identity/domain in SendGrid.",
      });
    }
    res.status(500).json({ message: "Failed to send OTP", error: error.message });
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
      return res
        .status(429)
        .json({ message: "Too many attempts. Please request a new OTP." });
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

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "5h",
    });

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

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "2h",
    });

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

exports.logout = async (req, res) => {
  try {
    clearAuthCookie(res);
    res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    console.error("logout error:", error);
    res.status(500).json({ message: "Failed to logout" });
  }
};

