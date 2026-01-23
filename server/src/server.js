require("dotenv").config();
const http = require("http");
const app = require("./app");
const connectDB = require("./config/db");
const initSocket = require("./socket");

const PORT = process.env.PORT || 5000;

(async () => {
  await connectDB();         //  DB FIRST

  const server = http.createServer(app);
  initSocket(server);      //  Socket AFTER DB

  server.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
})();
