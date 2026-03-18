const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("./models/User");
const Message = require("./models/Message");
const Chat = require("./models/Chat");

let io;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ["polling", "websocket"]
  });

  // Middleware
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
    try {
      console.log("🔵 SOCKET CONNECTED:", socket.id, socket.userId);

      // Safety Shield: Prevent crashes from invalid/stale demo IDs
      if (!mongoose.Types.ObjectId.isValid(socket.userId)) {
        console.warn(`⚠️ Socket connection refused: Invalid User ID format (${socket.userId}). Please clear browser storage.`);
        return socket.disconnect();
      }

      socket.join(socket.userId.toString());
      socket.data.activeChatId = null;

      //  JOIN CHAT ROOM
      socket.on("join-chat", (chatId, cb) => {
        const roomId = chatId.toString();
        socket.join(roomId);
        console.log("🟣 JOIN-CHAT:", socket.userId, roomId);
        cb && cb();
      });


      // TYPING
      socket.on("typing", (chatId) => {
        try {
          const roomId = chatId.toString();
          socket.to(roomId).emit("typing", { userId: socket.userId });
        } catch (err) {
          console.error("Typing emit error:", err);
        }
      });

      // STOP TYPING
      socket.on("stop-typing", (chatId) => {
        try {
          const roomId = chatId.toString();
          socket.to(roomId).emit("stop-typing", { userId: socket.userId });
        } catch (err) {
          console.error("Stop-typing emit error:", err);
        }
      });

      // OPEN CHAT
      socket.on("open-chat", async (chatId) => {
        try {
          const roomId = chatId.toString();
          socket.data.activeChatId = roomId;
          const chat = await Chat.findById(roomId);
          if (chat) {
            chat.unreadCounts.set(socket.userId, 0);
            await chat.save();
            socket.to(roomId).emit("chat-opened");
          }
        } catch (err) {
          console.error("Open chat error:", err);
        }
      });

      socket.on("close-chat", (chatId) => {
        const roomId = chatId?.toString?.();
        if (socket.data.activeChatId === roomId) {
          socket.data.activeChatId = null;
        }
      });

      // MARK CURRENT USER ONLINE
      await User.findByIdAndUpdate(socket.userId, {
        isOnline: true,
        lastSeen: null,
      });

      //  SEND EXISTING ONLINE USERS
      const onlineUsers = await User.find({
        isOnline: true,
        _id: { $ne: socket.userId },
      }).select("_id");

      socket.emit("online-users", onlineUsers.map(u => ({ _id: u._id })));

      // BROADCAST USER ONLINE
      socket.broadcast.emit("user-online", { userId: socket.userId });

      // SEND MESSAGE
      socket.on("send-message", async ({ chatId, content }) => {
        try {
          const roomId = chatId.toString();
          if (!mongoose.Types.ObjectId.isValid(roomId)) return;

          const chat = await Chat.findById(roomId);
          if (!chat) return;

          const message = await Message.create({
            sender: socket.userId,
            chat: roomId,
            content,
          });

          chat.lastMessage = message._id;
          await chat.save();

          message.status = "delivered";
          await message.save();

          socket.emit("message-delivered", { messageId: message._id });
          let populatedMessage = await Message.findById(message._id)
            .populate("sender", "_id name")
            .populate("seenBy.userId", "_id name phoneNumber");
          io.to(roomId).emit("new-message", populatedMessage);

          socket.to(roomId).emit("message-delivered", { messageId: message._id });

          const roomSockets = await io.in(roomId).fetchSockets();
          const activeReaders = Array.from(
            new Set(
              roomSockets
                .filter((roomSocket) =>
                  roomSocket.userId?.toString() !== socket.userId.toString() &&
                  roomSocket.data.activeChatId === roomId
                )
                .map((roomSocket) => roomSocket.userId.toString())
            )
          );

          if (activeReaders.length > 0) {
            const readAt = new Date();
            message.seenBy = activeReaders.map((readerId) => ({
              userId: readerId,
              readAt,
            }));
            message.status = "seen";
            await message.save();

            populatedMessage = await Message.findById(message._id)
              .populate("sender", "_id name")
              .populate("seenBy.userId", "_id name phoneNumber");

            io.to(roomId).emit("message-seen", {
              chatId: roomId,
              readerIds: activeReaders,
              readAt,
              messageIds: [message._id.toString()],
              messages: [populatedMessage]
            });
          }

          chat.participants.forEach((userId) => {
            if (
              userId.toString() !== socket.userId &&
              !activeReaders.includes(userId.toString())
            ) {
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
        try {
          const roomId = chatId.toString();
          const readAt = new Date();
          
          // Update messages to add read receipt with timestamp
          await Message.updateMany(
            { 
              chat: roomId, 
              sender: { $ne: socket.userId }, 
              seenBy: { $not: { $elemMatch: { userId: socket.userId } } }
            },
            { 
              $push: { seenBy: { userId: socket.userId, readAt } },
              $set: { status: "seen" }
            }
          );
          
          // Fetch the updated messages with seenBy data
          const messagesWithSeen = await Message.find(
            { chat: roomId, sender: { $ne: socket.userId } }
          ).populate("sender", "_id name")
           .populate("seenBy.userId", "_id name phoneNumber");
          
          // Broadcast updated messages to all users in the room
          io.to(roomId).emit("message-seen", { 
            chatId: roomId, 
            readerId: socket.userId,
            readAt,
            messageIds: messagesWithSeen.map((message) => message._id.toString()),
            messages: messagesWithSeen 
          });
        } catch (err) {
          console.error("Mark seen error:", err);
        }
      });

      socket.on("delete-for-me", async ({ messageId }) => {
        try {
          const msgId = messageId.toString();
          await Message.findByIdAndUpdate(msgId, { $addToSet: { deletedFor: socket.userId } });
          socket.emit("message-deleted-for-me", { messageId: msgId });
        } catch (err) {
          console.error("Delete for me error:", err);
        }
      });

      socket.on("restore-for-me", async ({ messageId }) => {
        try {
          const msgId = messageId.toString();
          await Message.findByIdAndUpdate(msgId, { $pull: { deletedFor: socket.userId } });
          socket.emit("message-restored-for-me", { messageId: msgId });
        } catch (err) {
          console.error("Restore for me error:", err);
        }
      });

      socket.on("delete-for-everyone", async ({ messageId, chatId }) => {
        try {
          const msgId = messageId.toString();
          const roomId = chatId.toString();
          const msg = await Message.findById(msgId);
          if (!msg || msg.sender.toString() !== socket.userId) return;

          msg.isDeleted = true;
          msg.content = "This message was deleted";
          await msg.save();

          io.to(roomId).emit("message-deleted-for-everyone", { messageId: msgId });
        } catch (err) {
          console.error("Delete for everyone error:", err);
        }
      });
      
      // --- VIDEO CALL SIGNALING ---
      socket.on("call-user", ({ to, offer, fromName }) => {
        io.to(to.toString()).emit("incoming-call", { from: socket.userId, fromName, offer });
      });

      socket.on("answer-call", ({ to, answer }) => {
        io.to(to.toString()).emit("call-accepted", { answer });
      });

      socket.on("ice-candidate", ({ to, candidate }) => {
        io.to(to.toString()).emit("ice-candidate", { candidate });
      });

      socket.on("end-call", ({ to }) => {
        io.to(to.toString()).emit("call-ended");
      });

      // DISCONNECT
      socket.on("disconnect", async () => {
        try {
          await User.findByIdAndUpdate(socket.userId, { isOnline: false, lastSeen: new Date() });
          socket.broadcast.emit("user-offline", { userId: socket.userId, lastSeen: new Date() });
          console.log(" Disconnected:", socket.userId);
        } catch (err) {
          console.error("Disconnect sync error:", err);
        }
      });

    } catch (err) {
      console.error("🚨 CRITICAL SOCKET ERROR:", err);
      socket.disconnect();
    }
  });
}

module.exports = {
  initSocket,
  getIO: () => io
};

