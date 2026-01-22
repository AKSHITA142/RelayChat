import { useEffect, useState } from "react";
import Message from "./Message";
import socket from "../services/socket";
import api from "../services/api";

export default function ChatWindow({ selectedChat, chats, setChats }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  useEffect(() => {
    if (!selectedChat) return;    
    api.get(`/chat/${selectedChat._id}/messages`)
      .then(res => setMessages(res.data))
      .catch(console.error);

    socket.emit("join-chat", selectedChat._id);
  }, [selectedChat]);

  useEffect(() => {
  socket.on("new-message", msg => {
  // ❌ Ignore if this message is already added optimistically
  if (msg.sender === "me") return;

  setChats(prev =>
    prev.map(c =>
      c._id === msg.chat ? { ...c, lastMessage: msg } : c
    )
  );

  if (msg.chat === selectedChat?._id) {
    setMessages(prev => [...prev, msg]);
  }

  });

  return () => socket.off("new-message");
}, []);


  const sendMessage = () => {
  if (!text.trim()) return;

  const tempMessage = {
    _id: Date.now(), // temporary id
    content: text,
    chat: selectedChat._id,
    sender: "me", // optional
  };

  // ✅ UPDATE UI IMMEDIATELY
  setMessages(prev => [...prev, tempMessage]);

  setChats(prev =>
    prev.map(c =>
      c._id === selectedChat._id
        ? { ...c, lastMessage: tempMessage }
        : c
    )
  );

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
          placeholder="Type a message..."
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}
