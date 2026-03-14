const Message = require("../models/Message");

exports.getMessagesByChat = async (req, res) => {
  const { chatId } = req.params;

  const messages = await Message.find({ 
    chat: chatId,
    deletedFor: { $ne: req.user.id }
  }).sort({ createdAt: 1 });

  res.json(messages);
};

exports.deleteMessageForMe = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (!message.deletedFor.includes(userId)) {
      message.deletedFor.push(userId);
      await message.save();
    }

    res.status(200).json({ message: "Message deleted for you" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting message", error: error.message });
  }
};

exports.deleteMessageForEveryone = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Only sender can delete for everyone
    if (message.sender.toString() !== userId) {
      return res.status(403).json({ message: "Unauthorized: Only sender can delete for everyone" });
    }

    message.isDeleted = true;
    message.content = "This message was deleted"; // 
    await message.save();

    res.status(200).json({ 
      message: "Message deleted for everyone",
      messageId: message._id,
      chatId: message.chat
    });
  } catch (error) {
    res.status(500).json({ message: "Error deleting message", error: error.message });
  }
};

exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { chatId, content } = req.body;
    const fileUrl = `/uploads/${req.file.filename}`;
    const fileType = req.file.mimetype;
    const fileName = req.file.originalname;

    const message = await Message.create({
      sender: req.user.id,
      chat: chatId,
      content: content || fileName, // Use content if provided, else fileName
      fileUrl,
      fileType,
      fileName
    });

    const populatedMessage = await Message.findById(message._id).populate("sender", "_id name");
    
    const { getIO } = require("../socket");
    const io = getIO();
    if (io) {
      io.to(chatId.toString()).emit("new-message", populatedMessage);
    }

    res.status(201).json(populatedMessage);
  } catch (error) {
    res.status(500).json({ message: "Error uploading file", error: error.message });
  }
};

exports.reactToMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user.id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Find if this user already reacted with THIS SAME emoji
    const existingIndex = message.reactions.findIndex(
      (r) => r.user.toString() === userId.toString() && r.emoji === emoji
    );

    if (existingIndex > -1) {
      // If same emoji, remove it (toggle off)
      message.reactions.splice(existingIndex, 1);
    } else {
      // If different emoji or no reaction, update user's reaction
      const userReactionIndex = message.reactions.findIndex(
        (r) => r.user.toString() === userId.toString()
      );
      
      if (userReactionIndex > -1) {
        // Replace existing emoji
        message.reactions[userReactionIndex].emoji = emoji;
      } else {
        // Add new reaction
        message.reactions.push({ emoji, user: userId });
      }
    }

    await message.save();
    
    // Populate for frontend consistency
    const updatedMessage = await Message.findById(messageId).populate("sender", "_id name");

    const { getIO } = require("../socket");
    const io = getIO();
    if (io) {
      io.to(message.chat.toString()).emit("message-reacted", updatedMessage);
    }

    res.status(200).json(updatedMessage);
  } catch (error) {
    res.status(500).json({ message: "Error reacting to message", error: error.message });
  }
};



