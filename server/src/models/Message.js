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
    fileUrl: {
      type: String,
      required: false
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
