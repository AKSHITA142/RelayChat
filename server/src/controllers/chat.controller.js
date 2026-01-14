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
