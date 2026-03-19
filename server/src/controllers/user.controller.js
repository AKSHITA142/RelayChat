const User = require("../models/User");

const getProfile = async (req, res) => {
  try {
     const user = await User.findById(req.user.id).select("-password");

    res.status(200).json({
      message: "User profile fetched",
      user
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error"
    });
  }
};

const searchUsers = async (req, res) => {
  try {
    
    const keyword = req.query.search
      ? {
          $or: [
            //$regex used for partial matching
            //i used for case insensitive
            { name: { $regex: req.query.search, $options: "i" } },
            { email: { $regex: req.query.search, $options: "i" } },
          ],
        }
      : {};

    const users = await User.find(keyword).find({ _id: { $ne: req.user.id } }).select("-password");
    res.send(users);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

const checkPhoneNumber = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ message: "Phone number is required" });
    }

    const user = await User.findOne({ phoneNumber: phone });

    if (user) {
      return res.json({
        exists: true,
        user_id: user._id
      });
    }

    return res.json({
      exists: false
    });
  } catch (error) {
    console.error("Error checking phone number:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const saveContact = async (req, res) => {
  try {
    const { targetUserId, savedName } = req.body;

    if (!targetUserId || !savedName) {
      return res.status(400).json({ message: "Target user ID and saved name are required" });
    }

    const user = await User.findById(req.user.id);


    const existingContactIndex = user.contacts.findIndex(
      c => c.userId.toString() === targetUserId
    );

    if (existingContactIndex > -1) {
      user.contacts[existingContactIndex].savedName = savedName;
    } else {
      user.contacts.push({ userId: targetUserId, savedName });
    }

    await user.save();

    res.status(200).json({
      message: "Contact saved successfully",
      contacts: user.contacts
    });

  } catch (error) {
    console.error("Error saving contact:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getUserEncryptionKey = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select("_id name phoneNumber encryptionPublicKey");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      user: {
        _id: user._id,
        name: user.name,
        phoneNumber: user.phoneNumber,
        encryptionPublicKey: user.encryptionPublicKey,
      }
    });
  } catch (error) {
    console.error("Error fetching user encryption key:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const upsertEncryptionKey = async (req, res) => {
  try {
    const { publicKey } = req.body;

    if (!publicKey || typeof publicKey !== "object") {
      return res.status(400).json({ message: "A valid public key is required" });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { encryptionPublicKey: publicKey },
      { new: true }
    ).select("-password");

    res.status(200).json({
      message: "Encryption key saved",
      user
    });
  } catch (error) {
    console.error("Error saving encryption key:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getProfile, searchUsers, checkPhoneNumber, saveContact, getUserEncryptionKey, upsertEncryptionKey };
