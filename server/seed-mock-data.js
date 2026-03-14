const mongoose = require("mongoose");
const User = require("./src/models/User");
const Chat = require("./src/models/Chat");
const Message = require("./src/models/Message");
const bcrypt = require("bcryptjs");
require("dotenv").config({ override: true });

async function seedData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const salt = await bcrypt.genSalt(10);
    const yashviPassword = await bcrypt.hash("123456", salt);
    const johnPassword = await bcrypt.hash("123456", salt);
    const defaultPassword = await bcrypt.hash("password123", salt);

    const yashviEmail = "yashvi123@gmail.com";
    let yashvi = await User.findOne({ email: yashviEmail });

    if (!yashvi) {
      console.log(`Yashvi user NOT found with email ${yashviEmail}. Creating one...`);
      yashvi = await User.create({
        name: "Yashvi",
        email: yashviEmail,
        phoneNumber: "+919999999999",
        password: yashviPassword
      });
    } else {
      // Update password and phone just in case it was missing
      yashvi.password = yashviPassword;
      yashvi.phoneNumber = "+919999999999";
      await yashvi.save();
    }
    console.log(`Yashvi user found: ID=${yashvi._id}, Email=${yashvi.email}`);

    const mockUsersData = [
      { name: "John Doe", email: "john@example.com", phoneNumber: "+918888888888", password: johnPassword },
      { name: "Alice Smith", email: "alice@example.com", phoneNumber: "+917777777777", password: defaultPassword },
      { name: "Bob Johnson", email: "bob@example.com", phoneNumber: "+916666666666", password: defaultPassword },
      { name: "Sarah Wilson", email: "sarah@example.com", phoneNumber: "+915555555555", password: defaultPassword }
    ];

    for (const userData of mockUsersData) {
      let user = await User.findOne({ email: userData.email });
      if (!user) {
        user = await User.create({
          name: userData.name,
          email: userData.email,
          phoneNumber: userData.phoneNumber,
          password: userData.password
        });
        console.log(`Created user: ${user.name}`);
      } else {
        // Update password and phone
        user.password = userData.password;
        user.phoneNumber = userData.phoneNumber;
        await user.save();
        console.log(`Updated password for: ${user.name}`);
      }

      // Create Chat
      let chat = await Chat.findOne({
        isGroup: false,
        participants: { $all: [yashvi._id, user._id] }
      });

      if (!chat) {
        chat = await Chat.create({
          participants: [yashvi._id, user._id],
          isGroup: false
        });
        console.log(`Created chat with ${user.name}`);
      }

      // Add a message
      const msg = await Message.create({
        sender: user._id,
        chat: chat._id,
        content: `Hello Yashvi, this is ${user.name}! How are you?`
      });

      await Chat.findByIdAndUpdate(chat._id, { lastMessage: msg._id });
      console.log(`Added message to chat with ${user.name}`);
    }

    console.log("Seeding complete!");
  } catch (error) {
    console.error("Seeding error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

seedData();
