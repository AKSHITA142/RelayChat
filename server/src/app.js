const express = require("express");

const app = express();

// middleware
app.use(express.json());

// routes
const authRoutes = require("./routes/auth.routes");
app.use("/api/auth", authRoutes);

// test route
app.get("/health", (req, res) => {
  res.status(200).json({ message: "Server is healthy" });
});

module.exports = app;
