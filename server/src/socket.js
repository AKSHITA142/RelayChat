const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("./models/User");
const Message = require("./models/Message");
const Chat = require("./models/Chat");

let io;
const pendingHistorySyncRequests = new Map();

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
      socket.deviceId = socket.handshake.auth?.deviceId || null;
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

      socket.on("logout", () => {
        socket.disconnect();
      });

      socket.on("close-chat", (chatId) => {
        const roomId = chatId?.toString?.();
        if (socket.data.activeChatId === roomId) {
          socket.data.activeChatId = null;
        }
      });

      socket.on("request-history-sync", ({ requesterDeviceId, requesterLabel }, callback) => {
        try {
          if (!requesterDeviceId) {
            callback && callback({ ok: false, deliveredCount: 0, message: "Missing requester device ID" });
            return;
          }
          const requestId = new mongoose.Types.ObjectId().toString();
          pendingHistorySyncRequests.set(requestId, {
            requesterSocketId: socket.id,
            userId: socket.userId.toString(),
            requesterDeviceId,
          });

          io.in(socket.userId.toString()).fetchSockets()
            .then((userSockets) => {
              const targetSockets = userSockets
                .filter((userSocket) =>
                  userSocket.id !== socket.id &&
                  userSocket.userId?.toString() === socket.userId.toString() &&
                  userSocket.deviceId !== requesterDeviceId
                );

              targetSockets.forEach((userSocket) => {
                  userSocket.emit("history-sync-requested", {
                    requestId,
                    requesterDeviceId,
                    requesterLabel,
                  });
                });

              callback && callback({
                ok: targetSockets.length > 0,
                deliveredCount: targetSockets.length,
                message: targetSockets.length > 0
                  ? "History sync request sent"
                  : "No other logged-in device was found for this account",
              });
            })
            .catch((fetchError) => {
              console.error("Fetch sockets for history sync error:", fetchError);
              callback && callback({
                ok: false,
                deliveredCount: 0,
                message: "Failed to look up trusted devices",
              });
            });
        } catch (err) {
          console.error("Request history sync error:", err);
          callback && callback({
            ok: false,
            deliveredCount: 0,
            message: "Failed to request history sync",
          });
        }
      });

      socket.on("respond-history-sync", ({ requestId, approved }) => {
        try {
          const pendingRequest = pendingHistorySyncRequests.get(requestId);
          if (!pendingRequest || pendingRequest.userId !== socket.userId.toString()) {
            return;
          }

          io.to(pendingRequest.requesterSocketId).emit("history-sync-response", {
            requestId,
            approved: Boolean(approved),
            approverDeviceId: socket.deviceId,
            requesterDeviceId: pendingRequest.requesterDeviceId,
          });

          if (!approved) {
            pendingHistorySyncRequests.delete(requestId);
          }
        } catch (err) {
          console.error("Respond history sync error:", err);
        }
      });

      socket.on("history-sync-finished", ({ requestId, requesterDeviceId, syncedCount = 0 }) => {
        try {
          const pendingRequest = pendingHistorySyncRequests.get(requestId);
          if (!pendingRequest || pendingRequest.userId !== socket.userId.toString()) {
            return;
          }

          io.to(pendingRequest.requesterSocketId).emit("history-sync-complete", {
            requestId,
            requesterDeviceId: requesterDeviceId || pendingRequest.requesterDeviceId,
            syncedCount,
          });
          pendingHistorySyncRequests.delete(requestId);
        } catch (err) {
          console.error("History sync finished error:", err);
        }
      });

      // MARK CURRENT USER ONLINE
      const user = await User.findById(socket.userId);
      if (user) {
        user.isOnline = true;
        user.lastSeen = null;
        await user.save();
        
        //  SEND EXISTING ONLINE USERS (only those who are online AND visible)
        const onlineUsers = await User.find({
          isOnline: true,
          signalVisibility: true,
          _id: { $ne: socket.userId },
        }).select("_id");

        socket.emit("online-users", onlineUsers.map(u => ({ _id: u._id })));

        // BROADCAST USER ONLINE (only if user is visible)
        if (user.signalVisibility) {
          socket.broadcast.emit("user-online", { userId: socket.userId });
        }
      }

      // SEND MESSAGE
      socket.on("send-message", async ({ chatId, content, encryptedPayload, clientTempId }) => {
        try {
          const roomId = chatId.toString();
          if (!mongoose.Types.ObjectId.isValid(roomId)) return;

          const chat = await Chat.findById(roomId);
          if (!chat) return;

          const message = await Message.create({
            sender: socket.userId,
            chat: roomId,
            content: encryptedPayload ? undefined : content,
            encryptedContent: encryptedPayload ? {
              ciphertext: encryptedPayload.ciphertext,
              iv: encryptedPayload.iv,
              algorithm: encryptedPayload.algorithm,
              version: encryptedPayload.version,
              encryptedKeys: Array.isArray(encryptedPayload.encryptedKeys)
                ? encryptedPayload.encryptedKeys.map((entry) => ({
                    userId: entry.userId,
                    deviceId: entry.deviceId,
                    key: entry.key,
                  }))
                : []
            } : undefined,
          });

          chat.lastMessage = message._id;
          await chat.save();

          message.status = "delivered";
          await message.save();

          socket.emit("message-delivered", { messageId: message._id });
          let populatedMessage = await Message.findById(message._id)
            .populate("sender", "_id name")
            .populate("encryptedContent.encryptedKeys.userId", "_id")
            .populate("seenBy.userId", "_id name phoneNumber");
          populatedMessage = populatedMessage.toObject();
          if (clientTempId) {
            populatedMessage.clientTempId = clientTempId;
          }
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
              .populate("encryptedContent.encryptedKeys.userId", "_id")
              .populate("seenBy.userId", "_id name phoneNumber");
            populatedMessage = populatedMessage.toObject();
            if (clientTempId) {
              populatedMessage.clientTempId = clientTempId;
            }

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
          
          // Broadcast updated messages to all users(participants) in the room
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
      socket.on("call-user", ({ to, offer, fromName } = {}) => {
        if (!to) return;
        io.to(to.toString()).emit("incoming-call", { from: socket.userId, fromName, offer });
      });

      socket.on("answer-call", ({ to, answer } = {}) => {
        if (!to) return;
        io.to(to.toString()).emit("call-accepted", { answer });
      });

      socket.on("ice-candidate", ({ to, candidate } = {}) => {
        if (!to) return;
        io.to(to.toString()).emit("ice-candidate", { candidate });
      });

      socket.on("call-re-offer", ({ to, offer } = {}) => {
        if (!to) return;
        io.to(to.toString()).emit("call-re-offer", { from: socket.userId, offer });
      });

      socket.on("call-re-answer", ({ to, answer } = {}) => {
        if (!to) return;
        io.to(to.toString()).emit("call-re-answer", { answer });
      });

      socket.on("end-call", ({ to } = {}) => {
        if (!to) return;
        io.to(to.toString()).emit("call-ended");
      });


      // DISCONNECT
      socket.on("disconnect", async () => {
        try {
          const user = await User.findById(socket.userId);
          if (user) {
            user.isOnline = false;
            user.lastSeen = new Date();
            await user.save();
            
            // Only broadcast offline if they were visible
            if (user.signalVisibility) {
              socket.broadcast.emit("user-offline", { 
                userId: socket.userId, 
                lastSeen: user.lastSeen 
              });
            }
          }
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

