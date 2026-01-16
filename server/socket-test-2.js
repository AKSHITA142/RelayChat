//This is a simple test client for the Socket.IO server.
//Make sure to replace TOKEN and CHAT_ID with valid values before running.
const { io } = require("socket.io-client");

const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5Njc3MjY0ZmU1MTI1Y2ZmNTY1YTI3YiIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzY4NTM3MTMzLCJleHAiOjE3Njg1NDA3MzN9.AMWBdKDZNOLv3k8U_ixIaTr0FD48F6ysuVqhaqjYDlU";
const CHAT_ID = "69677a5c9a67e5ca11a58b6e";

const socket = io("http://localhost:5000", {
  auth: { token: TOKEN },
});

socket.on("connect", () => {
  console.log("🟢 Yashvi connected");
  socket.emit("join-chat", CHAT_ID);
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

socket.on("new-message", (msg) => {
  console.log("Message Came");
  console.log("💬 New message:", msg.content);
});

setTimeout(() => {
  socket.emit("send-message", {
    chatId: CHAT_ID,
    content: "Hello from Yashvi Hello 12345👋",
  });
}, 3000);
