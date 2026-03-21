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
              deviceId: entry.deviceId,
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
              deviceId: entry.deviceId,
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

exports.syncDeviceHistoryKeys = async (req, res) => {
  try {
    const { updates } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ message: "No history sync updates provided" });
    }

    const processedMessageIds = [];

    for (const update of updates) {
      if (!update?.messageId) continue;

      const message = await Message.findById(update.messageId).populate("chat", "participants");
      if (!message || !message.chat?.participants?.some((participantId) => participantId.toString() === req.user.id.toString())) {
        continue;
      }

      if (update.encryptedContentKey?.key) {
        const exists = (message.encryptedContent?.encryptedKeys || []).some((entry) =>
          entry.userId?.toString() === update.encryptedContentKey.userId?.toString() &&
          entry.deviceId === update.encryptedContentKey.deviceId
        );

        if (!exists) {
          if (!message.encryptedContent) {
            message.encryptedContent = { encryptedKeys: [] };
          }
          message.encryptedContent.encryptedKeys.push({
            userId: update.encryptedContentKey.userId,
            deviceId: update.encryptedContentKey.deviceId,
            key: update.encryptedContentKey.key,
          });
        }
      }

      if (update.encryptedFileKey?.key) {
        const exists = (message.encryptedFile?.encryptedKeys || []).some((entry) =>
          entry.userId?.toString() === update.encryptedFileKey.userId?.toString() &&
          entry.deviceId === update.encryptedFileKey.deviceId
        );

        if (!exists) {
          if (!message.encryptedFile) {
            message.encryptedFile = { encryptedKeys: [] };
          }
          message.encryptedFile.encryptedKeys.push({
            userId: update.encryptedFileKey.userId,
            deviceId: update.encryptedFileKey.deviceId,
            key: update.encryptedFileKey.key,
          });
        }
      }

      await message.save();
      processedMessageIds.push(message._id.toString());
    }

    res.status(200).json({
      message: "History sync keys saved",
      processedMessageIds,
    });
  } catch (error) {
    console.error("Error syncing device history keys:", error);
    res.status(500).json({ message: "Error syncing device history keys", error: error.message });
  }
};

exports.clearChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    await Message.updateMany(
      { chat: chatId, deletedFor: { $ne: userId } },
      { $addToSet: { deletedFor: userId } }
    );

    res.status(200).json({ message: "Chat cleared successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error clearing chat", error: error.message });
  }
};
