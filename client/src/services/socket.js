import { io } from "socket.io-client";
import { getCurrentDeviceId } from "./e2ee";
import { config } from "../config";

const socket = io(config.socketUrl, {
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
