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
      console.log(decoded);
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
    socket.on("join-chat", (chatId, cb) => {
      const roomId = chatId.toString();   // 👈 FORCE STRING
      socket.join(roomId);

      console.log(
        "✅ joined chat room:",
        roomId,
        "socket:",
        socket.id
      );

      cb && cb();
    });

    // 💬 SEND MESSAGE TO CHAT
    socket.on("send-message", async ({ chatId, content }) => {
    try {
      const roomId = chatId.toString();
      console.log("📩 send-message EVENT HIT");
      console.log("📩 chatId:", roomId);
      console.log("📩 content:", content);

      // 1️⃣ Validate chatId
      if (!mongoose.Types.ObjectId.isValid(roomId)) {
        console.log("❌ Invalid chatId");
        return;
      }

      // 2️⃣ Check chat exists
      const chat = await Chat.findById(roomId);
      if (!chat) {
        console.log("❌ Chat not found in DB");
        return;
      }

      // 3️⃣ Create message
      const message = await Message.create({
        sender: socket.userId,
        chat: roomId,
        content,
      });

      console.log("✅ Message saved:", message._id);

      // 4️⃣ Update last message
      await Chat.findByIdAndUpdate(roomId, {
        lastMessage: message._id,
      });

      console.log("✅ Chat updated");

      // 5️⃣ Emit to room
      console.log("📤 Emitting to room",
        roomId,
        "Sockets in room:",
        io.sockets.adapter.rooms.get(roomId)?.size
      );

      io.to(roomId).emit("new-message", {
        _id: message._id,
        chat: roomId,
        sender: socket.userId,
        content: message.content,
        createdAt: message.createdAt,
      });

      console.log("📤 Message emitted to room");

    } catch (err) {
      console.error("🔥 SEND MESSAGE ERROR:", err);
    }
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
