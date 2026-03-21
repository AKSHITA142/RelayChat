const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: true
    },
    content: {
      type: String,
      required: false
    },
    encryptedContent: {
      ciphertext: {
        type: String,
        required: false
      },
      iv: {
        type: String,
        required: false
      },
      algorithm: {
        type: String,
        required: false
      },
      version: {
        type: Number,
        required: false
      },
      encryptedKeys: [
        {
          userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
          },
          deviceId: {
            type: String,
            required: false
          },
          key: {
            type: String,
            required: true
          }
        }
      ]
    },
    fileUrl: {
      type: String,
      required: false
    },
    encryptedFile: {
      iv: {
        type: String,
        required: false
      },
      metadataIv: {
        type: String,
        required: false
      },
      metadataCiphertext: {
        type: String,
        required: false
      },
      algorithm: {
        type: String,
        required: false
      },
      version: {
        type: Number,
        required: false
      },
      size: {
        type: Number,
        required: false
      },
      encryptedKeys: [
        {
          userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
          },
          deviceId: {
            type: String,
            required: false
          },
          key: {
            type: String,
            required: true
          }
        }
      ]
    },
    fileType: {
      type: String,
      required: false
    },
    fileName: {
      type: String,
      required: false
    },
    status: {
      type: String,
      enum: ["sent", "delivered", "seen"],
      default: "sent",
    },
    seenBy: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        readAt: { type: Date }
      }
    ],
    deliveredAt: {
      type: Date,
      default: () => new Date()
    },
    deletedFor: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User" }
    ],
    isDeleted: {
      type: Boolean,
      default: false
    },
    reactions: [
      {
        emoji: { type: String, required: true },
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);
