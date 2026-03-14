const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const redisClient = require("../config/redis");
const { sendSms } = require("../utils/sms");


exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "All fields are required"
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        message: "User already exists"
      });
    }

    //passwords hashing
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      name,
      email,
      password: hashedPassword
    });

    await user.save();

    res.status(201).json({
      message: "User registered successfully"
    });

  } catch (error) {
    res.status(500).json({
      message: "Server error"
    });
  }
};

// LOGIN CONTROLLER
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        message: "Invalid credentials"
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid credentials"
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        contacts: user.contacts
      }
    });

  } catch (error) {
    res.status(500).json({
      message: "Server error"
    });
  }
};

// OTP CONTROLLERS
exports.sendOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    // Basic international phone format validation (+ followed by 10-15 digits)
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ message: "Invalid phone number format. Use international format like +919876543210" });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
    
    const otpData = {
      phone_number: phone,
      otp,
      expires_at: expiresAt,
      attempt_count: 0
    };

    // Store in Redis (Key: phone number) with a TTL of 300 seconds (5 mins)
    await redisClient.set(phone, JSON.stringify(otpData), {
      EX: 300
    });

    // Real SMS sending via Twilio
    try {
      await sendSms(phone, `Your RelayChat verification code is: ${otp}. It expires in 5 minutes.`);
    } catch (smsErr) {
      console.error("SMS Sending failed, fallback to console log:", smsErr.message);
      // Fallback for development if Twilio keys are missing
      console.log(`\n===========================================`);
      console.log(`📱 SMS TO: ${phone}`);
      console.log(`🔑 OTP: ${otp}`);
      console.log(`===========================================\n`);
    }

    res.status(200).json({ message: "OTP sent successfully" });

  } catch (error) {
    console.error("sendOtp error:", error);
    res.status(500).json({ message: "Failed to send OTP" });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ message: "Phone number and OTP are required" });
    }

    // Get OTP data from Redis
    const dataString = await redisClient.get(phone);
    if (!dataString) {
      return res.status(400).json({ message: "OTP expired or not found" });
    }

    const otpData = JSON.parse(dataString);

    // Limit attempts to 5
    if (otpData.attempt_count >= 5) {
      await redisClient.del(phone); // Delete to prevent further guessing
      return res.status(429).json({ message: "Too many failed attempts. Please request a new OTP." });
    }

    // Check expiration manually as a fallback (Redis EX should handle this mostly)
    if (Date.now() > otpData.expires_at) {
      await redisClient.del(phone);
      return res.status(400).json({ message: "OTP has expired" });
    }

    // Verify the OTP
    if (otpData.otp !== otp) {
      // Increment attempt count
      otpData.attempt_count += 1;
      await redisClient.set(phone, JSON.stringify(otpData), { KEEPTTL: true });
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // OTP is valid, clear it from Redis
    await redisClient.del(phone);

    // Find or create user
    let user = await User.findOne({ phoneNumber: phone });
    
    // HYBRID FLOW: If user doesn't exist, don't create yet.
    // Return 202 Accepted to signal frontend to show Registration Form.
    if (!user) {
      return res.status(202).json({
        message: "New user detected. Please complete registration.",
        isNewUser: true,
        phoneNumber: phone
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        _id: user._id,
        name: user.name,
        phoneNumber: user.phoneNumber,
        role: user.role,
        contacts: user.contacts
      }
    });

  } catch (error) {
    console.error("verifyOtp error:", error);
    res.status(500).json({ message: "Failed to verify OTP" });
  }
};

exports.completeRegistration = async (req, res) => {
  try {
    const { name, email, password, phoneNumber } = req.body;

    if (!name || !phoneNumber) {
      return res.status(400).json({ message: "Name and Phone Number are required" });
    }

    // Check if user already exists
    let user = await User.findOne({ phoneNumber });
    if (user) {
      return res.status(400).json({ message: "User already exists with this phone number" });
    }

    // Optional: Check if email exists if provided
    if (email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({ message: "Email already in use" });
      }
    }

    // Hash password if provided
    let hashedPassword;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password, salt);
    }

    // Create user
    user = await User.create({
      name,
      email,
      password: hashedPassword,
      phoneNumber
    });

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.status(201).json({
      message: "Registration complete",
      token,
      user: {
        _id: user._id,
        name: user.name,
        phoneNumber: user.phoneNumber,
        role: user.role,
        contacts: user.contacts
      }
    });

  } catch (error) {
    console.error("completeRegistration error:", error);
    res.status(500).json({ message: "Failed to complete registration" });
  }
};
