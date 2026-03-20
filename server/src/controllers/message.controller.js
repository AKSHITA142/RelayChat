const Message = require("../models/Message");

exports.getMessagesByChat = async (req, res) => {
  const { chatId } = req.params;
  const { includeDeleted } = req.query;

  const query = { chat: chatId };
  
  // If includeDeleted is not true, filter out messages deleted for the current user
  if (includeDeleted !== "true") {
    query.deletedFor = { $ne: req.user.id };
  }

  const messages = await Message.find(query)
    .populate("sender", "_id name phoneNumber")
    .populate("encryptedContent.encryptedKeys.userId", "_id")
    .populate("encryptedFile.encryptedKeys.userId", "_id")
    .sort({ createdAt: 1 });

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

exports.restoreMessageForMe = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (message.deletedFor.includes(userId)) {
      message.deletedFor = message.deletedFor.filter(id => id.toString() !== userId);
      await message.save();
    }

    res.status(200).json({ message: "Message restored", message });
  } catch (error) {
    res.status(500).json({ message: "Error restoring message", error: error.message });
  }
};

exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { chatId, content, encryptedPayload, encryptedFileMetadata } = req.body;
    const fileUrl = `/uploads/${req.file.filename}`;
    const parsedEncryptedPayload = encryptedPayload ? JSON.parse(encryptedPayload) : null;
    const parsedEncryptedFileMetadata = encryptedFileMetadata ? JSON.parse(encryptedFileMetadata) : null;
    const isEncryptedAttachment = Boolean(parsedEncryptedFileMetadata);
    const fileType = isEncryptedAttachment ? undefined : req.file.mimetype;
    const fileName = isEncryptedAttachment ? undefined : (req.body.fileName || req.file.originalname);

    const message = await Message.create({
      sender: req.user.id,
      chat: chatId,
      content: parsedEncryptedPayload || isEncryptedAttachment ? undefined : (content || fileName),
      encryptedContent: parsedEncryptedPayload ? {
        ciphertext: parsedEncryptedPayload.ciphertext,
        iv: parsedEncryptedPayload.iv,
        algorithm: parsedEncryptedPayload.algorithm,
        version: parsedEncryptedPayload.version,
        encryptedKeys: Array.isArray(parsedEncryptedPayload.encryptedKeys)
          ? parsedEncryptedPayload.encryptedKeys.map((entry) => ({
              userId: entry.userId,
              key: entry.key,
            }))
          : []
      } : undefined,
      fileUrl,
      fileType,
      fileName,
      encryptedFile: parsedEncryptedFileMetadata ? {
        iv: parsedEncryptedFileMetadata.iv,
        metadataIv: parsedEncryptedFileMetadata.metadataIv,
        metadataCiphertext: parsedEncryptedFileMetadata.metadataCiphertext,
        algorithm: parsedEncryptedFileMetadata.algorithm,
        version: parsedEncryptedFileMetadata.version,
        size: parsedEncryptedFileMetadata.size,
        encryptedKeys: Array.isArray(parsedEncryptedFileMetadata.encryptedKeys)
          ? parsedEncryptedFileMetadata.encryptedKeys.map((entry) => ({
              userId: entry.userId,
              key: entry.key,
            }))
          : []
      } : undefined,
    });

    const populatedMessage = await Message.findById(message._id)
      .populate("sender", "_id name")
      .populate("encryptedContent.encryptedKeys.userId", "_id")
      .populate("encryptedFile.encryptedKeys.userId", "_id");
    
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

    const existingIndex = message.reactions.findIndex(
      (r) => r.user.toString() === userId.toString() && r.emoji === emoji
    );

    if (existingIndex > -1) {
      message.reactions.splice(existingIndex, 1);
    } else {
      const userReactionIndex = message.reactions.findIndex(
        (r) => r.user.toString() === userId.toString()
      );
      
      if (userReactionIndex > -1) {
        message.reactions[userReactionIndex].emoji = emoji;
      } else {
        message.reactions.push({ emoji, user: userId });
      }
    }

    await message.save();
    
    const updatedMessage = await Message.findById(messageId)
      .populate("sender", "_id name")
      .populate("encryptedContent.encryptedKeys.userId", "_id")
      .populate("encryptedFile.encryptedKeys.userId", "_id");

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



