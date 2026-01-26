import { useEffect, useState, useRef } from "react";
import Message from "./Message";
import socket from "../services/socket";
import api from "../services/api";

export default function ChatWindow({ selectedChat }) {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeout = useRef(null);
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


  // TYPING INDICATOR
  useEffect(() => {
  const handleTyping = () => {
    setIsTyping(true);
  };

  const handleStopTyping = () => {
    setIsTyping(false);
  };

  socket.on("typing", handleTyping);
  socket.on("stop-typing", handleStopTyping);

  return () => {
    socket.off("typing", handleTyping);
    socket.off("stop-typing", handleStopTyping);
  };
}, []);

useEffect(() => {
  socket.on("online-users", users => {
    setOnlineUsers(users.map(u => u._id));
  });

  socket.on("user-online", ({ userId }) => {
    setOnlineUsers(prev => [...new Set([...prev, userId])]);
  });

  socket.on("user-offline", ({ userId }) => {
    setOnlineUsers(prev => prev.filter(id => id !== userId));
  });

  return () => {
    socket.off("online-users");
    socket.off("user-online");
    socket.off("user-offline");
  };
}, []);

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

  if (!selectedChat) {
  return (
    <div className="chat-empty">
      <div className="empty-actions">
        <div className="empty-card">
          <span>📄</span>
          <p>Send document</p>
        </div>

        <div
          className="empty-card"
          onClick={() => alert("Open Add User / New Chat Modal")}
        >
          <span>👤➕</span>
          <p>Add contact</p>
        </div>

        <div className="empty-card">
          <span>🤖</span>
          <p>Ask AI</p>
        </div>
      </div>
    </div>
  );
}


  return (
    <div className="chat-window">
      <div className="messages">
        {messages.map(m => (
          <Message key={m._id} msg={m} />
        ))}
      </div>

      <div className="input-box">
        {isTyping && (
          <div className="typing-indicator">
            typing...
          </div>
        )}
        <input
          value={text}
          onChange={e => {
            setText(e.target.value); 
            socket.emit("typing", selectedChat._id);
            clearTimeout(typingTimeout.current);

            typingTimeout.current = setTimeout(() => {
              socket.emit("stop-typing", selectedChat._id);
            }, 1000);
            
          }}
          onKeyDown={e => e.key === "Enter" && sendMessage()}
          placeholder="Type a message..."/>
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}
