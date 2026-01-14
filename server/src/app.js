const express = require("express");


const app = express();

// middleware
app.use(express.json());

// routes
const authRoutes = require("./routes/auth.routes");
app.use("/api/auth", authRoutes);

const userRoutes = require("./routes/user.routes");
app.use("/api/user", userRoutes);

const chatRoutes = require("./routes/chat.routes");
app.use("/api/chat", chatRoutes);


const deleteUser = require("./routes/admin.route");
app.use("/api/admin", deleteUser);

// test route
app.get("/health", (req, res) => {
  res.status(200).json({ message: "Server is healthy" });
});

module.exports = app;
