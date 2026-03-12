require("dotenv").config({ override: true });
const http = require("http");
const app = require("./app");
const connectDB = require("./config/db");
const initSocket = require("./socket");

const PORT = process.env.PORT || 5000;

(async () => {
  await connectDB();        

  const server = http.createServer(app);
  initSocket(server); 

  server.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
})();
