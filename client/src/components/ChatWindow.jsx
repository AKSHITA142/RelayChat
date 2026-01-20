import Message from "./Message";
import { useEffect } from "react";
import socket from "../services/socket";

export default function ChatWindow() {
  useEffect(() => {
    socket.on("new-message", msg => {
      console.log("New message:", msg);
    });

    return () => socket.off("new-message");
  }, []);
  return (
    <div className="chat-window">
      <div className="chat-header">User A</div>

      <div className="messages">
        <Message text="Hello 👋" isMe />
        <Message text="Hi, how are you?" />
        <Message text="All good!" isMe />
      </div>

      <div className="input-box">
        <input placeholder="Type a message…" />
      </div>
    </div>
  );
}
