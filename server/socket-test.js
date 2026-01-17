//This is a simple test client for the Socket.IO server.
//Make sure to replace TOKEN and CHAT_ID with valid values before running.
const { io } = require("socket.io-client");

const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5NjViM2MwYjJmODRjNjRjZTA1ZGY0YiIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzY4NjI1OTc2LCJleHAiOjE3Njg2Mjk1NzZ9.nvC6MwZRC_R4bYiMqRkkJKsqyNP3c1C3rgG5H4VlIDI";

const CHAT_ID = "69677a5c9a67e5ca11a58b6e";

const socket = io("http://localhost:5000", {
  auth: { token: TOKEN },
});

socket.on("connect", () => {
  console.log("🟢 Akshita connected");
  socket.emit("join",socket.id);
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
  console.log("💬 New message:", msg.content);
});

setTimeout(() => {
  socket.emit("send-message", {
    chatId: CHAT_ID,
    content: "Hello from Akshita Hello 12345👋.... how r you",
  });
}, 3000);
