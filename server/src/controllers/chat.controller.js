const Chat = require("../models/Chat");

// create or get one-to-one chat
exports.createChat = async (req, res) => {
  try {
    const { userId } = req.body; // other user

    if (!userId) {
      return res.status(400).json({
        message: "User ID is required"
      });
    }

    // check if chat already exists
    let chat = await Chat.findOne({
      isGroup: false,
      //$all is a MongoDB query operator.
      participants: { $all: [req.user.id, userId] }
    });

    if (chat) {
      return res.status(200).json(chat);
    }

    // create new chat
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

  //populate means:Replace the LastMessage ObjectId with the actual referenced document
  //lean does:Returns plain JavaScript objects instead of Mongoose documents
  const chats = await Chat.find({ participants: userId })
    .populate("lastMessage")
    .lean();

  const result = chats.map(chat => ({
    _id: chat._id,
    participants: chat.participants,
    lastMessage: chat.lastMessage,
    unreadCount: chat.unreadCounts?.[userId] || 0
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

  res.json(chat);
};

exports.addToGroup = async (req, res) => {
  const chat = await Chat.findById(req.params.chatId);

  if (chat.groupAdmin.toString() !== req.user.id)
    return res.status(403).json({ msg: "Only admin" });

  chat.participants.addToSet(req.body.userId);
  await chat.save();

  res.json(chat);
};

exports.removeFromGroup = async (req, res) => {
  const chat = await Chat.findById(req.params.chatId);

  if (chat.groupAdmin.toString() !== req.user.id)
    return res.status(403).json({ msg: "Only admin" });

  chat.participants.pull(req.body.userId);
  await chat.save();

  res.json(chat);
};
