const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { io } = require("socket.io-client");
const User = require("./src/models/User");
const Chat = require("./src/models/Chat");
require("dotenv").config({ override: true });

async function simulateJohnRealTimeReply() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // 1. Find John and Yashvi
    const john = await User.findOne({ email: "john@example.com" });
    const yashvi = await User.findOne({ email: "yashvi123@gmail.com" });
    
    if (!john || !yashvi) {
      console.error("Users not found. Ensure John is created via seed-mock-data.js.");
      return;
    }

    // 2. Find their chat
    const chat = await Chat.findOne({
      participants: { $all: [john._id, yashvi._id] }
    });

    if (!chat) {
      console.error("Chat not found.");
      return;
    }

    // 3. Generate a token for John
    const token = jwt.sign(
      { id: john._id, role: john.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // 4. Connect to the socket server
    const socket = io("http://localhost:5001", {
      auth: { token }
    });

    socket.on("connect", () => {
      console.log("Connected to server as John Doe (Socket ID:", socket.id, ")");
      
      // 5. Join the chat room
      socket.emit("join-chat", chat._id);

      // 6. Simulate typing
      setTimeout(() => {
        console.log("John is typing...");
        socket.emit("typing", chat._id);

        // 7. Send the message after 2 seconds
        setTimeout(() => {
          socket.emit("stop-typing", chat._id);
          const content = "Hey Yashvi! I just received your message. The real-time update worked perfectly! 🥳";
          
          socket.emit("send-message", {
            chatId: chat._id,
            content
          });

          console.log("John sent: ", content);
          
          // Disconnect after sending
          setTimeout(() => {
            console.log("Simulation finished. Disconnecting...");
            socket.disconnect();
            mongoose.disconnect();
            process.exit(0);
          }, 1000);
        }, 2000);
      }, 1000);
    });

    socket.on("connect_error", (err) => {
      console.error("Socket Connection Error:", err.message);
      mongoose.disconnect();
    });

  } catch (err) {
    console.error("Simulation failed:", err);
    process.exit(1);
  }
}

simulateJohnRealTimeReply();
