const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("./models/User");
const Message = require("./models/Message");
const Chat = require("./models/Chat");

function initSocket(server) {
  const io = new Server(server, {
    cors: { origin: "http://localhost:5173" },
    credentials: true,
  });

  // AUTH
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("No token"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
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

      //This line Means:"Target everyone in roomId EXCEPT this socket"
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
    // OPEN CHAT
    socket.on("open-chat", async (chatId) => {
      const roomId = chatId.toString();
      const chat = await Chat.findById(roomId);
      chat.unreadCounts.set(socket.userId, 0);
      await chat.save();
      socket.to(roomId).emit("chat-opened");//this is just for clerification
    });
    // MARK CURRENT USER ONLINE (first)
    await User.findByIdAndUpdate(socket.userId, {
      isOnline: true,
      lastSeen: null,
    });

    //  SEND EXISTING ONLINE USERS
    const onlineUsers = await User.find({
      isOnline: true,
      _id: { $ne: socket.userId },
    }).select("_id");

    socket.emit(
      "online-users",
      onlineUsers.map(u => ({ _id: u._id }))
    );


    // BROADCAST USER ONLINE
    socket.broadcast.emit("user-online", {
      userId: socket.userId,
    });

    // SEND MESSAGE
    socket.on("send-message", async ({ chatId, content }) => {
      try{
      const roomId = chatId.toString();


      if (!mongoose.Types.ObjectId.isValid(roomId)) {
        console.log(" Invalid chatId");
        return;
      }

      // 2 Check chat exists
      const chat = await Chat.findById(roomId);
      if (!chat) {
        console.log(" Chat not found in DB");
        return;
      }
      // 3 Save message

      const message = await Message.create({
        sender: socket.userId,
        chat: roomId,
        content,
      });
      console.log(" Message saved:", message._id);

      // 4 Update last message
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
      const populatedMessage = await Message.findById(message._id).populate("sender", "_id name");
        io.to(roomId).emit("new-message", populatedMessage);

      // notify receiver(s)
      socket.to(roomId).emit("message-delivered", {
        messageId: message._id,
      });

      chat.participants.forEach((userId) => {
        if (userId.toString() !== socket.userId) {
          const count = chat.unreadCounts.get(userId.toString()) || 0;
          chat.unreadCounts.set(userId.toString(), count + 1);
        }
      });

      await chat.save();

    } catch (err) {

      console.error("🔥 SEND MESSAGE ERROR:", err);
    }
    });
    // MARK SEEN
    socket.on("mark-seen", async ({ chatId }) => {
      const roomId = chatId.toString();
      const messages = await Message.updateMany(
        {
          // $addToSet avoids duplicates
          // Only marks others’ messages
          chat: roomId,
          sender: { $ne: socket.userId },
          seenBy: { $ne: socket.userId },
        },
        {
          $addToSet: { seenBy: socket.userId },
          $set: { status: "seen" },
        }
      );

      socket.to(roomId).emit("message-seen", {
          chatId: roomId,
          userId: socket.userId,
      });
    });
    // DELETE MESSAGE
    socket.on("delete-for-me", async ({ messageId }) => {
      const msgId = messageId.toString();
      await Message.findByIdAndUpdate(msgId, {
        $addToSet: { deletedFor: socket.userId },
      });

      socket.emit("message-deleted-for-me", { messageId: msgId });
    });

    socket.on("delete-for-everyone", async ({ messageId, chatId }) => {
      const msgId = messageId.toString();
      const roomId = chatId.toString();
      const msg = await Message.findById(msgId);
      if (!msg || msg.sender.toString() !== socket.userId) return;

      msg.isDeleted = true;
      msg.content = "This message was deleted";
      await msg.save();

      io.to(roomId).emit("message-deleted-for-everyone", {
        messageId: msgId,
      });
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

      console.log(" Disconnected:", socket.userId);

    });


  });
}

module.exports = initSocket;

