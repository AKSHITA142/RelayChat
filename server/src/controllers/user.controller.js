const User = require("../models/User");
const { getIO } = require("../socket");

const buildEncryptionDevices = (user) => {
  if (Array.isArray(user?.encryptionDevices) && user.encryptionDevices.length > 0) {
    return user.encryptionDevices.map((device) => ({
      deviceId: device.deviceId,
      publicKey: device.publicKey,
      label: device.label || "Browser",
      lastSeenAt: device.lastSeenAt,
    }));
  }

  if (user?.encryptionPublicKey) {
    return [
      {
        deviceId: `legacy-${user._id}`,
        publicKey: user.encryptionPublicKey,
        label: "Legacy Device",
        lastSeenAt: user.updatedAt || user.createdAt || null,
      }
    ];
  }

  return [];
};

const getProfile = async (req, res) => {
  try {
     const user = await User.findById(req.user.id).select("-password");

    res.status(200).json({
      message: "User profile fetched",
      user: {
        ...user.toObject(),
        encryptionDevices: buildEncryptionDevices(user),
      }
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error"
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, status, signalVisibility, vaultProtocol, globalTheme } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const prevVisibility = user.signalVisibility;
    
    if (name !== undefined) user.name = name;
    if (status !== undefined) user.status = status;
    if (signalVisibility !== undefined) user.signalVisibility = signalVisibility;
    if (vaultProtocol !== undefined) user.vaultProtocol = vaultProtocol;
    if (globalTheme !== undefined) user.globalTheme = globalTheme;

    await user.save();

    // Broadcast visibility changes immediately via Socket
    const io = getIO();
    if (io) {
      if (prevVisibility === false && user.signalVisibility === true && user.isOnline) {
        // User became visible while online
        io.emit("user-online", { userId: user._id });
      } else if (prevVisibility === true && user.signalVisibility === false) {
        // User turned off visibility
        io.emit("user-offline", { userId: user._id, lastSeen: user.lastSeen });
      }
    }

    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        ...user.toObject(),
        encryptionDevices: buildEncryptionDevices(user),
      }
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Server error" });
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
    const user = await User.findById(userId).select("_id name phoneNumber encryptionPublicKey encryptionDevices");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      user: {
        _id: user._id,
        name: user.name,
        phoneNumber: user.phoneNumber,
        encryptionPublicKey: user.encryptionPublicKey,
        encryptionDevices: buildEncryptionDevices(user),
      }
    });
  } catch (error) {
    console.error("Error fetching user encryption key:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const upsertEncryptionKey = async (req, res) => {
  try {
    const { publicKey, deviceId, deviceLabel } = req.body;

    if (!publicKey || typeof publicKey !== "object" || !deviceId) {
      return res.status(400).json({ message: "A valid public key and device ID are required" });
    }

    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!Array.isArray(user.encryptionDevices)) {
      user.encryptionDevices = [];
    }

    const existingDeviceIndex = Array.isArray(user.encryptionDevices)
      ? user.encryptionDevices.findIndex((device) => device.deviceId === deviceId)
      : -1;

    if (existingDeviceIndex >= 0) {
      user.encryptionDevices[existingDeviceIndex].publicKey = publicKey;
      user.encryptionDevices[existingDeviceIndex].label = deviceLabel || user.encryptionDevices[existingDeviceIndex].label || "Browser";
      user.encryptionDevices[existingDeviceIndex].lastSeenAt = new Date();
    } else {
      user.encryptionDevices.push({
        deviceId,
        publicKey,
        label: deviceLabel || "Browser",
        lastSeenAt: new Date(),
      });
    }

    // Preserve the last active device key in the legacy field for backward compatibility.
    user.encryptionPublicKey = publicKey;
    await user.save();

    res.status(200).json({
      message: "Encryption key saved",
      user: {
        ...user.toObject(),
        encryptionDevices: buildEncryptionDevices(user),
      }
    });
  } catch (error) {
    console.error("Error saving encryption key:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const saveBackupKey = async (req, res) => {
  try {
    const { encryptedKey, salt, iv } = req.body;
    if (!encryptedKey || !salt || !iv) {
      return res.status(400).json({ message: "Missing backup data" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.encryptedBackupKey = JSON.stringify({ encryptedKey, iv });
    user.backupSalt = salt;
    await user.save();

    res.status(200).json({ message: "Backup saved successfully" });
  } catch (error) {
    console.error("Error saving backup key:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getBackupKey = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.encryptedBackupKey || !user.backupSalt) {
      return res.status(404).json({ message: "No backup found" });
    }

    const { encryptedKey, iv } = JSON.parse(user.encryptedBackupKey);

    res.status(200).json({
      encryptedKey,
      iv,
      salt: user.backupSalt
    });
  } catch (error) {
    console.error("Error fetching backup key:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const updateAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Store the relative path to the uploaded file
    user.avatar = `/uploads/${req.file.filename}`;
    await user.save();

    // Broadcast avatar update via Socket
    const io = getIO();
    if (io) {
      io.emit("user-avatar-updated", { 
        userId: user._id, 
        avatar: user.avatar 
      });
    }

    res.status(200).json({
      message: "Avatar updated successfully",
      user: {
        ...user.toObject(),
        encryptionDevices: buildEncryptionDevices(user),
      }
    });
  } catch (error) {
    console.error("Update avatar error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const verifyMobileForKeyReset = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "Identity not found." });

    if (user.phoneNumber !== phoneNumber) {
      return res.status(403).json({ message: "Verification failed: Phone number mismatch." });
    }

    res.status(200).json({ message: "Mobile verified. Access granted for terminal reset." });
  } catch (error) {
    res.status(500).json({ message: "System error: Verification failed.", error: error.message });
  }
};

module.exports = { 
  getProfile, 
  updateProfile, 
  updateAvatar, 
  searchUsers, 
  checkPhoneNumber, 
  saveContact, 
  getUserEncryptionKey, 
  upsertEncryptionKey, 
  saveBackupKey, 
  getBackupKey,
  verifyMobileForKeyReset
};
