import { io } from "socket.io-client";

const socket = io("http://localhost:5002", {
  autoConnect: false,
});

// Update token before connecting
socket.on("connect", () => {
  console.log("Connected to Socket.io server", socket.id);
});

export const connectSocket = () => {
  const token = localStorage.getItem("token");
  if (token) {
    socket.auth = { token };
    socket.connect();
  }
};

export default socket;
