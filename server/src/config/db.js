const mongoose = require("mongoose");
require("dotenv").config({ override: true });

const connectDB = async () => {
  try {
    const dbName = process.env.MONGODB_DB_NAME || "RelayChat";
    console.log("Connecting to URI:", process.env.MONGODB_URI ? process.env.MONGODB_URI.substring(0, 30) + "..." : "undefined");
    
    // Fix: Ensure database name doesn't have spaces and is properly formatted
    const finalDbName = dbName.replace(/\s+/g, ''); // Remove spaces
    const connectionOptions = {
      dbName: finalDbName,
      // Add additional options for better connection handling
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };
    
    await mongoose.connect(process.env.MONGODB_URI, connectionOptions);
    console.log(`MongoDB connected to database: ${finalDbName}`);
  } catch (error) {
    console.error("MongoDB connection failed", error);
    process.exit(1);
  }
};

module.exports = connectDB;
