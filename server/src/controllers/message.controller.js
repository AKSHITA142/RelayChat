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



