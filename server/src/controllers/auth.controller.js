const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const redisClient = require("../config/redis");
const { sendSms } = require("../utils/sms");

// Helper function to set secure cookies
const setAuthCookie = (res, token) => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  res.cookie('token', token, {
    httpOnly: true,
    secure: isProduction, // Only send over HTTPS in production
    sameSite: isProduction ? 'None' : 'Lax', // None for cross-site in production
    maxAge: 2 * 60 * 60 * 1000, // 2 hours
    path: '/'
  });
};

// Helper function to clear cookies
const clearAuthCookie = (res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  res.cookie('token', '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'None' : 'Lax',
    expires: new Date(0), // Immediately expire
    path: '/'
  });
};

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
      { expiresIn: "5h" }
    );

    // Set secure cookie
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
        encryptionDevices: user.encryptionDevices || []
      }
    });

  } catch (error) {
    res.status(500).json({
      message: "Server error"
    });
  }
};


exports.sendOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ message: "Invalid phone number format. Use international format like +919876543210" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
    
    const otpData = {
      phone_number: phone,
      otp,
      expires_at: expiresAt,
      attempt_count: 0
    };

    await redisClient.set(phone, JSON.stringify(otpData), {
      EX: 300
    });

    try {
      await sendSms(phone, `Your RelayChat verification code is: ${otp}. It expires in 5 minutes.`);
    } catch (smsErr) {
      console.error("SMS Sending failed, fallback to console log:", smsErr.message);
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

    const dataString = await redisClient.get(phone);
    if (!dataString) {
      return res.status(400).json({ message: "OTP expired or not found" });
    }

    const otpData = JSON.parse(dataString);


    if (otpData.attempt_count >= 5) {
      await redisClient.del(phone); 
      return res.status(429).json({ message: "Too many failed attempts. Please request a new OTP." });
    }

    if (Date.now() > otpData.expires_at) {
      await redisClient.del(phone);
      return res.status(400).json({ message: "OTP has expired" });
    }

   
    if (otpData.otp !== otp) {
      
      otpData.attempt_count += 1;
      await redisClient.set(phone, JSON.stringify(otpData), { KEEPTTL: true });
      return res.status(400).json({ message: "Invalid OTP" });
    }

 
    await redisClient.del(phone);

    let user = await User.findOne({ phoneNumber: phone });
    
    if (!user) {
      return res.status(202).json({
        message: "New user detected. Please complete registration.",
        isNewUser: true,
        phoneNumber: phone
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    // Set secure cookie
    setAuthCookie(res, token);

    res.status(200).json({
      message: "Login successful",
      token, // Still send token for client-side storage
      user: {
        _id: user._id,
        name: user.name,
        phoneNumber: user.phoneNumber,
        role: user.role,
        contacts: user.contacts,
        encryptionPublicKey: user.encryptionPublicKey,
        encryptionDevices: user.encryptionDevices || []
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

    // Check only the primary database to avoid resurrecting legacy records in fresh environments
    let user = await User.findOne({ phoneNumber });
    if (user) {
      return res.status(400).json({ message: "User already exists with this phone number" });
    }

    // Optional
    if (email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({ message: "Email already in use" });
      }
    }

    let hashedPassword;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password, salt);
    }

    user = await User.create({
      name,
      email,
      password: hashedPassword,
      phoneNumber
    });

  
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    // Set secure cookie
    setAuthCookie(res, token);

    res.status(201).json({
      message: "Registration complete",
      token, // Still send token for client-side storage
      user: {
        _id: user._id,
        name: user.name,
        phoneNumber: user.phoneNumber,
        role: user.role,
        contacts: user.contacts,
        encryptionPublicKey: user.encryptionPublicKey,
        encryptionDevices: user.encryptionDevices || []
      }
    });

  } catch (error) {
    console.error("completeRegistration error:", error);
    res.status(500).json({ message: "Failed to complete registration" });
  }
};

// Logout function to clear cookies
exports.logout = async (req, res) => {
  try {
    // Clear the auth cookie
    clearAuthCookie(res);
    
    res.status(200).json({
      message: "Logout successful"
    });
  } catch (error) {
    console.error("logout error:", error);
    res.status(500).json({ message: "Failed to logout" });
  }
};
