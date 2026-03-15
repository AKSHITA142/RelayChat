const Chat = require("../models/Chat");
const User = require("../models/User");
const { getIO } = require("../socket");


exports.createChat = async (req, res) => {
  try {
    const { userId } = req.body; 

    if (!userId) {
      return res.status(400).json({
        message: "User ID is required"
      });0
    }

   
    let chat = await Chat.findOne({
      isGroup: false,
     
      participants: { $all: [req.user.id, userId] }
    });

    if (chat) {
      return res.status(200).json(chat);
    }

    
    chat = await Chat.create({
      participants: [req.user.id, userId],
      isGroup: false
    });

    res.status(201).json(chat);

  } catch (error) {
    res.status(500).json({
      message: "Server error"
    });
  }
};

exports.getMyChats = async (req, res) => {
  const userId = req.user.id;

  
  const chats = await Chat.find({ participants: userId })
    .populate("participants", "name email phoneNumber")
    .populate("lastMessage")
    .sort({ updatedAt: -1 })
    .lean();

  const result = chats.map(chat => ({
    _id: chat._id,
    participants: chat.participants,
    lastMessage: chat.lastMessage,
    unreadCount: chat.unreadCounts?.[userId] || 0,
    isGroup: chat.isGroup,
    groupName: chat.groupName,
    groupAdmin: chat.groupAdmin,
    createdAt: chat.createdAt
  }));

  res.json(result);
};

exports.createGroup = async (req, res) => {
  const { name, users } = req.body;

  const chat = await Chat.create({
    isGroup: true,
    groupName: name,
    participants: [...users, req.user.id],
    groupAdmin: req.user.id,
  });

  const fullGroupChat = await Chat.findOne({ _id: chat._id })
    .populate("participants", "name email phoneNumber");

  
  const io = getIO();
  if (io) {
    fullGroupChat.participants.forEach(p => {
      io.to(p._id.toString()).emit("new-chat", fullGroupChat);
    });
  }

  res.status(201).json(fullGroupChat);
};

exports.addToGroup = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { userId } = req.body;

    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ message: "Chat not found" });

    if (!chat.isGroup) {
      return res.status(400).json({ message: "Not a group chat" });
    }

    if (chat.groupAdmin.toString() !== req.user.id) {
      return res.status(403).json({ message: "Only admin can add members" });
    }

    if (chat.participants.some(p => p.toString() === userId)) {
      return res.status(400).json({ message: "User already in group" });
    }

    chat.participants.push(userId);
    await chat.save();

    const fullGroupChat = await Chat.findById(chatId)
      .populate("participants", "name email phoneNumber")
      .populate("lastMessage");

    
    const io = getIO();
    if (io) {
      io.to(userId).emit("new-chat", fullGroupChat);
      

      chat.participants.forEach(p => {
        if (p.toString() !== userId) {
          io.to(p.toString()).emit("chat-updated", fullGroupChat);
        }
      });
    }

    res.json(fullGroupChat);
  } catch (err) {
    console.error("addToGroup error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.removeFromGroup = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { userId } = req.body;

    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ message: "Chat not found" });

    if (!chat.isGroup) {
      return res.status(400).json({ message: "Not a group chat" });
    }

    if (chat.groupAdmin.toString() !== req.user.id && userId !== req.user.id) {
      return res.status(403).json({ message: "Action not authorized" });
    }

    chat.participants.pull(userId);


    if (chat.groupAdmin.toString() === userId && chat.participants.length > 0) {
      chat.groupAdmin = chat.participants[0];
    }

    await chat.save();

    const fullGroupChat = await Chat.findById(chatId)
      .populate("participants", "name email phoneNumber");

    const io = getIO();
    if (io) {
      
      io.to(userId).emit("removed-from-chat", { chatId });

      chat.participants.forEach(p => {
        io.to(p.toString()).emit("chat-updated", fullGroupChat);
      });
    }

    res.json(fullGroupChat || { message: "User removed successfully", chatId });
  } catch (err) {
    console.error("removeFromGroup error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.startChatByPhone = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ message: "Phone number is required" });
    }

    const targetUser = await User.findOne({ phoneNumber: phone });

    if (!targetUser) {
      return res.status(404).json({ message: "User not registered" });
    }

    if (targetUser._id.toString() === req.user.id) {
      return res.status(400).json({ message: "You cannot start a chat with yourself" });
    }

  
    let chat = await Chat.findOne({
      isGroup: false,
      participants: { $all: [req.user.id, targetUser._id] }
    });

    if (chat) {
      return res.status(200).json({
        chat_id: chat._id,
        receiver_id: targetUser._id,
        chat: chat 
      });
    }

    chat = await Chat.create({
      participants: [req.user.id, targetUser._id],
      isGroup: false
    });

    res.status(201).json({
      chat_id: chat._id,
      receiver_id: targetUser._id,
      chat: chat
    });

  } catch (error) {
    console.error("startChatByPhone error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.renameGroup = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "New name is required" });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ message: "Chat not found" });

    if (!chat.participants.includes(req.user.id)) {
      return res.status(403).json({ message: "You are not a participant of this group" });
    }

    chat.groupName = name.trim();
    await chat.save();

    const io = getIO();
    if (io) {
      chat.participants.forEach(p => {
        io.to(p.toString()).emit("chat-renamed", { chatId, name: chat.groupName });
      });
    }

    res.json(chat);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
