// //This is a simple test client for the Socket.IO server.
// //Make sure to replace TOKEN and CHAT_ID with valid values before running.

const { io } = require("socket.io-client");

const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5Njc3MjY0ZmU1MTI1Y2ZmNTY1YTI3YiIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzY4NzM0ODUzLCJleHAiOjE3Njg3Mzg0NTN9.-AF8FcMyZPVI0y_3jwSqnIQHmfufF09oYvKfaLJauuA";
const CHAT_ID = "69677a5c9a67e5ca11a58b6e";
const messageId1 = "696cc0b72b62834778dd424c";
// const messageId2 = "696ca814569c1d2449b530e2";

const socket = io("http://localhost:5000", {
  auth: { token: TOKEN },
});

socket.on("connect", () => {
  console.log("🟢 Yashvi connected");

  socket.emit("join-chat", CHAT_ID, () => {
    console.log("✅ Yashvi joined chat");

    // START TYPING
    socket.emit("typing", CHAT_ID);

    setTimeout(() => {
      socket.emit("stop-typing", CHAT_ID);
    }, 2000);

    setTimeout(() => {
      socket.emit("send-message", {
        chatId: CHAT_ID,
        content: "Hi Akshitaa how r u??👋",
      });
    }, 3000);
    setTimeout(() => {
      console.log("👀 Opening chat");
      socket.emit("mark-seen", { chatId: CHAT_ID });
    }, 6000);
    setTimeout(() => {
      socket.emit("delete-for-me", { 
        messageId: messageId1 });
    }, 9000);
    // setTimeout(() => {
    //   socket.emit("delete-for-everyone", {
    //     messageId: messageId2,
    //     chatId: CHAT_ID,
    //   });
    // }, 13000);
  });
});


socket.on("typing", ({ userId }) => {
  console.log("✍️ Someone typing:", userId);
});

socket.on("stop-typing", ({ userId }) => {
  console.log("🛑 Someone stopped typing:", userId);
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

socket.on("message-delivered", ({ messageId }) => {
  console.log("✅ Message delivered:", messageId);
});

socket.on("new-message", (msg) => {
  console.log("💬 New message:", msg.content);
});

socket.on("message-seen", ({ chatId, userId }) => {
  console.log("👀 Messages seen in chat:", chatId, "by", userId);
});

socket.on("message-deleted-for-me", ({ messageId }) =>
  console.log("🗑️ Deleted for me:", messageId)
);

socket.on("message-deleted-for-everyone", ({ messageId }) =>
  console.log("❌ Deleted for everyone:", messageId)
);

// KEEP ALIVE
setInterval(() => {}, 1000);
//for to restart server again after changes
//Here it is nessasary to write but in server it's not nessasary if want to change any server code b/c there nodemon is used and it is automatically restart the server after changes

