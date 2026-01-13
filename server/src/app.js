const express = require("express");

const app = express();

// middleware
app.use(express.json());

// routes
const authRoutes = require("./routes/auth.routes");
app.use("/api/auth", authRoutes);

const userRoutes = require("./routes/user.routes");
app.use("/api/user", userRoutes);

// test route
app.get("/health", (req, res) => {
  res.status(200).json({ message: "Server is healthy" });
});

module.exports = app;
