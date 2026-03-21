import { io } from "socket.io-client";
import { getCurrentDeviceId } from "./e2ee";

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
    socket.auth = { token, deviceId: getCurrentDeviceId() };
    socket.connect();
  }
};

export default socket;
