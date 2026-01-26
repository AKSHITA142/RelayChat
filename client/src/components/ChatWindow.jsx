import { useEffect, useState } from "react";
import Message from "./Message";
import socket from "../services/socket";
import api from "../services/api";

export default function ChatWindow({ selectedChat }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  // Load messages when chat changes
  useEffect(() => {
    if (!selectedChat) return;

    api.get(`/message/${selectedChat._id}`)
      .then(res => {
        const sorted = res.data.sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        );
        setMessages(sorted);
      });

    socket.emit("join-chat", selectedChat._id);
  }, [selectedChat]);

  // Receive messages only from socket
  useEffect(() => {
    const handler = (msg) => {
      if (msg.chat !== selectedChat?._id) return;
      setMessages(prev => [...prev, msg]);
    };

    socket.on("new-message", handler);
    return () => socket.off("new-message", handler);
  }, [selectedChat]);

  // FINAL SEND
  const sendMessage = () => {
    if (!text.trim() || !selectedChat) return;

    socket.emit("join-chat", selectedChat._id); // safety
    socket.emit("send-message", {
      chatId: selectedChat._id,
      content: text,
    });

    setText("");
  };

  if (!selectedChat) return <div>Select a chat</div>;

  return (
    <div className="chat-window">
      <div className="messages">
        {messages.map(m => (
          <Message key={m._id} msg={m} />
        ))}
      </div>

      <div className="input-box">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === "Enter" && sendMessage()}
          placeholder="Type a message..."
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}
