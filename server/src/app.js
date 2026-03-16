const express = require("express");
const cors = require("cors");


const app = express();

app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176"],
  credentials: true
}));

// helmet is used to add header for security purpose
const helmet = require("helmet");
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        // Allow STUN servers for WebRTC ICE negotiation
        "connect-src": [
          "'self'",
          "http://localhost:5002",
          "ws://localhost:5002",
          "stun:stun.l.google.com:19302",
          "stun:stun1.l.google.com:19302",
          "stun:stun2.l.google.com:19302",
        ],
        // Allow browser to capture and play media (microphone/camera/speakers)
        "media-src": ["'self'", "blob:", "mediastream:"],
        "img-src":   ["'self'", "data:", "http://localhost:5002"],
      },
    },
    crossOriginResourcePolicy:     { policy: "cross-origin" },
    crossOriginOpenerPolicy:       { policy: "unsafe-none" },   // needed for SharedArrayBuffer + WebRTC on some browsers
    crossOriginEmbedderPolicy:     false,                        // don't block mediastream
  })
);

// middleware
app.use(express.json());
const path = require("path");
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

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
