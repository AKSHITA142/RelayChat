const http = require("http");
const app = require("./app");
const connectDB = require("./config/db");
const initSocket = require("./socket");

const PORT = process.env.PORT || 5000;

connectDB();

// 🔥 MUST CREATE HTTP SERVER
const server = http.createServer(app);

// 🔥 MUST PASS SERVER TO SOCKET
initSocket(server);

// 🔥 LISTEN ON SERVER (NOT app)
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
