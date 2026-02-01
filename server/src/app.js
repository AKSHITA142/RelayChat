const express = require("express");
const cors = require("cors");


const app = express();

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

//helmet is used to add header for security purpose
const helmet = require("helmet");
app.use(helmet());

// middleware
app.use(express.json());

// routes
//app.use() is used to mount (attach) a group of routes under a common base path.
const rateLimiter = require("./middleware/rateLimit");
app.use("/api", rateLimiter);

const authRoutes = require("./routes/auth.routes");
app.use("/api/auth", authRoutes);

const userRoutes = require("./routes/user.routes");
app.use("/api/user", userRoutes);

const chatRoutes = require("./routes/chat.routes");
app.use("/api/chat", chatRoutes);

const messageRoutes = require("./routes/message.routes");
app.use("/api/message", messageRoutes);


const deleteUser = require("./routes/admin.route");
app.use("/api/admin", deleteUser);

// test route
app.get("/health", (req, res) => {
  res.status(200).json({ message: "Server is healthy" });
});

module.exports = app;
