const User = require("../models/User");

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

module.exports = { getProfile, searchUsers, checkPhoneNumber, saveContact, getUserEncryptionKey, upsertEncryptionKey };
