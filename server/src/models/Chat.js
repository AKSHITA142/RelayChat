const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],
    isGroup: {
      type: Boolean,
      default: false
    },
    groupAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    groupName: String,  
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message"
    },
    unreadCounts: {
      type: Map,
      of: Number,
      default: {}
      //key: userId, value: count
    },
    visibleTo: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],
    deletedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],
    pinnedMessages: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message"
      }
    ]
  },  
  { timestamps: true }
);

module.exports = mongoose.model("Chat", chatSchema);
