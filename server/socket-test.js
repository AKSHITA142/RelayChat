const { io } = require("socket.io-client");

console.log("🚀 Starting socket client...");

// 🔑 JWT TOKEN (PASTE FROM LOGIN RESPONSE — NO "Bearer")
const TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5NjViM2MwYjJmODRjNjRjZTA1ZGY0YiIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzY4NDA1Nzk3LCJleHAiOjE3Njg0MDkzOTd9.8-7DRFIUIpaRNJcHHlM2sLSv_vvKZJAJopObFEhBRRg";

// 🔗 CHAT ID (COPY FROM MongoDB chats COLLECTION)
const CHAT_ID = "69677a5c9a67e5ca11a58b6e";

const socket = io("http://127.0.0.1:5000", {
  auth: {
    token: TOKEN,
  },
  transports: ["websocket"],
});

socket.on("connect", () => {
  console.log("✅ Connected:", socket.id);

  // join chat room
  socket.emit("join-chat", CHAT_ID);

  // send message
  socket.emit("send-message", {
    chatId: CHAT_ID,
    content: "Hello 👋 message stored in MongoDB",
  });
});

socket.on("new-message", (message) => {
  console.log("📩 New message received:");
  console.log(message);
});

socket.on("connect_error", (err) => {
  console.error("❌ Connect error:", err.message);
});

socket.on("error-message", (err) => {
  console.error("❌ Server error:", err);
});

// keep Node process alive
setInterval(() => {}, 1000);
