const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true
    },
    phoneNumber: {
      type: String,
      unique: true,
      sparse: true,
    },
    password: {
      type: String,
    },
    encryptionPublicKey: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    encryptionDevices: [
      {
        deviceId: {
          type: String,
          required: true,
        },
        publicKey: {
          type: mongoose.Schema.Types.Mixed,
          required: true,
        },
        label: {
          type: String,
          default: "Browser",
        },
        lastSeenAt: {
          type: Date,
          default: Date.now,
        }
      }
    ],
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user"
    },
    lastSeen: {
      type: Date,
      default: null,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    contacts: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"
        },
        savedName: {
          type: String,
          required: true
        }
      }
    ]
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
module.exports = User;
