const mongoose = require("mongoose");
require("dotenv").config({ override: true });

const connectDB = async () => {
  try {
    const dbName = process.env.MONGODB_DB_NAME || "RelayChat";
    console.log("Connecting to URI:", process.env.MONGODB_URI ? process.env.MONGODB_URI.substring(0, 30) + "..." : "undefined");
    await mongoose.connect(process.env.MONGODB_URI, { dbName });
    console.log(`MongoDB connected to database: ${dbName}`);
  } catch (error) {
    console.error("MongoDB connection failed", error);
    process.exit(1);
  }
};

module.exports = connectDB;
