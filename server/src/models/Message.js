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
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    deletedFor: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User" }
    ],
    isDeleted: {
      type: Boolean,
      default: false
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);
