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
    console.log("🔵 SOCKET CONNECTED:", socket.id, socket.userId);

    // JOIN CHAT ROOM
    socket.on("join-chat", (chatId, cb) => {
      const roomId = chatId.toString();
      socket.join(roomId);

      console.log("🟣 JOIN-CHAT:", socket.userId, roomId);
      cb && cb();
    });


    // TYPING
    socket.on("typing", (chatId) => {
      const roomId = chatId.toString();

      console.log("✍️ TYPING:", socket.userId, roomId);

      //This line Means:“Target everyone in roomId EXCEPT this socket”
      socket.to(roomId).emit("typing", {
        userId: socket.userId,
      });
    });

    // STOP TYPING
    socket.on("stop-typing", (chatId) => {
      const roomId = chatId.toString();

      console.log("🛑 STOP-TYPING:", socket.userId, roomId);

      socket.to(roomId).emit("stop-typing", {
        userId: socket.userId,
      });
    });
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

    // SEND MESSAGE
    socket.on("send-message", async ({ chatId, content }) => {
      try{
      const roomId = chatId.toString();


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

      message.status = "delivered";
      await message.save();

      // notify sender
      socket.emit("message-delivered", {
        messageId: message._id,
      });

      io.to(roomId).emit("new-message", {
        _id: message._id,
        chat: roomId,
        sender: socket.userId,
        content: message.content,
        createdAt: message.createdAt,
      });
      console.log("📨 SEND-MESSAGE:", socket.userId, roomId);

      // notify receiver(s)
      socket.to(roomId).emit("message-delivered", {
        messageId: message._id,
      });

      socket.on("mark-seen", async ({ chatId }) => {
      const messages = await Message.updateMany(
        {
          //📌 $addToSet avoids duplicates
          //📌 Only marks others’ messages
          chat: chatId,
          sender: { $ne: socket.userId },
          seenBy: { $ne: socket.userId },
        },
        {
          $addToSet: { seenBy: socket.userId },
          $set: { status: "seen" },
        }
      );

      socket.to(chatId).emit("message-seen", {
        chatId,
        userId: socket.userId,
      });
    });
    } catch (err) {

      console.error("🔥 SEND MESSAGE ERROR:", err);
    }
    });
    // DISCONNECT
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

