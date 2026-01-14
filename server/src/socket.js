const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Message = require("./models/Message");
const Chat = require("./models/Chat");

let io;

function initSocket(server) {
  io = new Server(server, {
    cors: { origin: "*" },
  });

  // 🔐 JWT AUTH — THIS MUST EXIST
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("No token"));

      const decoded = jwt.verify(token, "SECRET_KEY");
      socket.userId = decoded.id; // 🔥 REQUIRED

      console.log("🔐 Socket user:", socket.userId);
      next();
    } catch (err) {
      next(new Error("Invalid token"));
    }
  });


  io.on("connection", (socket) => {
    console.log("✅ Socket connected:", socket.id);
    console.log("👤 User ID:", socket.userId);

    // join personal room
    socket.join(socket.userId);

    // join chat room
    socket.on("join-chat", (chatId) => {
      socket.join(chatId);
      console.log(`📥 User ${socket.userId} joined chat ${chatId}`);
    });

    // send message
    socket.on("send-message", async ({ chatId, content }) => {
  try {
    console.log("📨 Incoming:", { chatId, content });
    console.log("👤 Sender:", socket.userId);

    // 🔴 HARD VALIDATION (NO GUESSING)
    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      throw new Error("Invalid chatId");
    }

    if (!mongoose.Types.ObjectId.isValid(socket.userId)) {
      throw new Error("Invalid sender id");
    }

    // 🔥 SAVE MESSAGE (MATCHES YOUR SCHEMA)
    const message = await Message.create({
      sender: socket.userId,
      chat: chatId,
      content,
    });

    // 🔥 UPDATE CHAT
    await Chat.findByIdAndUpdate(chatId, {
      lastMessage: message._id,
    });

    // 🔥 EMIT
    io.to(chatId).emit("new-message", {
      _id: message._id,
      chat: message.chat,
      sender: message.sender,
      content: message.content,
      createdAt: message.createdAt,
    });

    console.log("✅ Message saved:", message._id);

  } catch (error) {
    console.error("❌ REAL ERROR:", error.message);
    socket.emit("error-message", error.message);
  }
});


    socket.on("disconnect", () => {
      console.log("❌ Socket disconnected:", socket.id);
    });
  });
}

module.exports = initSocket;
