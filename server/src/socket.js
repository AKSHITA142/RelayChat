const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("./models/User");
const Message = require("./models/Message");
const Chat = require("./models/Chat");

function initSocket(server) {
  const io = new Server(server, {
    cors: { origin: "*" },
  });

  // 🔐 AUTH
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("No token"));

      const decoded = jwt.verify(token, "SECRET_KEY");
      socket.userId = decoded.id;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", async (socket) => {
    console.log("✅ Connected:", socket.userId);

    // 🔵 SEND EXISTING ONLINE USERS
    const onlineUsers = await User.find({
      isOnline: true,
      _id: { $ne: socket.userId },
    }).select("_id");

    socket.emit(
      "online-users",
      onlineUsers.map(u => ({ _id: u._id }))
    );

    // 🔵 MARK CURRENT USER ONLINE
    await User.findByIdAndUpdate(socket.userId, {
      isOnline: true,
      lastSeen: null,
    });

    // 🔵 BROADCAST USER ONLINE
    socket.broadcast.emit("user-online", {
      userId: socket.userId,
    });

    // 🔔 JOIN PERSONAL ROOM
    socket.join(socket.userId);

    // 🔔 JOIN CHAT ROOM
    socket.on("join-chat", (chatId) => {
      socket.join(chatId);
      console.log(`➡️ ${socket.userId} joined chat ${chatId}`);
    });

    // 💬 SEND MESSAGE TO CHAT
    socket.on("send-message", async ({ chatId, content }) => {
      if (!mongoose.Types.ObjectId.isValid(chatId)) return;

      const message = await Message.create({
        sender: socket.userId,
        chat: chatId,
        content,
      });

      await Chat.findByIdAndUpdate(chatId, {
        lastMessage: message._id,
      });

      io.to(chatId).emit("new-message", {
        _id: message._id,
        chat: chatId,
        sender: socket.userId,
        content,
        createdAt: message.createdAt,
      });
    });

    // 🔴 DISCONNECT
    socket.on("disconnect", async () => {
      await User.findByIdAndUpdate(socket.userId, {
        isOnline: false,
        lastSeen: new Date(),
      });

      socket.broadcast.emit("user-offline", {
        userId: socket.userId,
        lastSeen: new Date(),
      });

      console.log("❌ Disconnected:", socket.userId);
    });
  });
}

module.exports = initSocket;
