// //This is a simple test client for the Socket.IO server.
// //Make sure to replace TOKEN and CHAT_ID with valid values before running.

const { io } = require("socket.io-client");

const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5NjViM2MwYjJmODRjNjRjZTA1ZGY0YiIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzY4Njc0ODgxLCJleHAiOjE3Njg2Nzg0ODF9.n6609mQcUiUTEwKWQ4EQPUtG46CJcUcKLZ_ecFAV1mM";
const CHAT_ID = "69677a5c9a67e5ca11a58b6e";

const socket = io("http://localhost:5000", {
  auth: { token: TOKEN },
});

socket.on("connect", () => {
  console.log("🟢 Akshita connected");

  socket.emit("join-chat", CHAT_ID, () => {
    console.log("✅ Akshita joined chat");

    socket.emit("typing", CHAT_ID);

    setTimeout(() => {
      socket.emit("stop-typing", CHAT_ID);
    }, 2000);

    setTimeout(() => {
      socket.emit("send-message", {
        chatId: CHAT_ID,
        content: "Hello Yashvi BhangavanWala👋",
      });
    }, 3000);
    setTimeout(() => {
      console.log("👀 Opening chat");
      socket.emit("mark-seen", { chatId: CHAT_ID });
    }, 5000);

  });
});

socket.on("online-users", (users) => {
  users.forEach(u => {
    console.log("🟢 ONLINE:", u._id);
  });
});

socket.on("user-online", ({ userId }) => {
  console.log("🟢 User came online:", userId);
});

socket.on("user-offline", ({ userId }) => {
  console.log("🔴 User went offline:", userId);
});

socket.on("typing", ({ userId }) => {
  console.log("✍️ Someone typing:", userId);
});

socket.on("stop-typing", ({ userId }) => {
  console.log("🛑 Someone stopped typing:", userId);
});

socket.on("new-message", (msg) => {
    console.log("💬 New message:", msg.content);
});

socket.on("message-delivered", ({ messageId }) => {
  console.log("✅ Message delivered:", messageId);
});

socket.on("message-seen", ({ chatId, userId }) => {
  console.log("👀 Messages seen in chat:", chatId, "by", userId);
});

// KEEP ALIVE
setInterval(() => {}, 1000);
//for to restart server again after changes