const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const app = express();

// Cookie parser middleware (must be before cors)
app.use(cookieParser());

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allowed origins for development
    const allowedDevOrigins = [
      "http://localhost:5173",
      "http://localhost:5174", 
      "http://localhost:5175",
      "http://localhost:5176",
      "http://localhost:5177",
      "http://localhost:5178",
      "http://localhost:5179",
      "http://localhost:5180",
      "http://localhost:5181",
      "http://localhost:5182",
      "http://localhost:5183",
      "http://localhost:5184",
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:8080",
      "http://127.0.0.1:5173",
      "https://relay-chat-am.vercel.app",
      process.env.BASE_URL,
      process.env.CORS_ORIGIN
    ];
    
    // Production frontend URL from environment variable
    const prodOrigin = process.env.CORS_ORIGIN;
    
    if (allowedDevOrigins.includes(origin) || origin === prodOrigin || origin.endsWith(".vercel.app")) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// helmet is used to add header for security purpose
const helmet = require("helmet");

// Dynamic CSP configuration for dev/prod
const getCspDirectives = () => {
  const isDev = process.env.NODE_ENV === 'development';
  const baseUrl = isDev ? 'http://localhost:5002' : process.env.BASE_URL || 'https://relaychat-backend.onrender.com';
  
  return {
    ...helmet.contentSecurityPolicy.getDefaultDirectives(),
    // Allow STUN servers for WebRTC ICE negotiation
    "connect-src": [
      "'self'",
      baseUrl,
      baseUrl.replace('http', 'ws'), // WebSocket version
      "stun:stun.l.google.com:19302",
      "stun:stun1.l.google.com:19302",
      "stun:stun2.l.google.com:19302",
    ],
    // Allow browser to capture and play media (microphone/camera/speakers)
    "media-src": ["'self'", "blob:", "mediastream:"],
    "img-src": ["'self'", "data:", baseUrl],
  };
};

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: getCspDirectives(),
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
