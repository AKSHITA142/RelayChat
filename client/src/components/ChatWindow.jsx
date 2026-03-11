import { useEffect, useState, useRef } from "react";
import Message from "./Message";
import socket from "../services/socket";
import api from "../services/api";
import { getLoggedInUser } from "../utils/auth";


export default function ChatWindow({ selectedChat , onlineUsers = [],lastSeenMap = {} }) {
  const myUserId = getLoggedInUser()?._id;
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeout = useRef(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const messagesEndRef = useRef(null);

  const otherUser = selectedChat?.participants?.find(
    u => (u._id?.toString() || u.toString()) !== myUserId?.toString()
  );

// const isOnline = onlineUsers.includes(otherUser?._id);
const isOnline = onlineUsers.some(
  id => id.toString() === otherUser?._id?.toString()
);
const lastSeen = lastSeenMap[otherUser?._id];

const lastSeenText = lastSeen
  ? `last seen at ${new Date(lastSeen).toLocaleTimeString()}`
  : "offline";

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


  // Receive messages only from socket
  useEffect(() => {
    const handler = (msg) => {
      console.log("📨 NEW MESSAGE RECEIVED AT CLIENT:", msg);
      if (msg.chat?.toString() !== selectedChat?._id?.toString()) {
        console.log("DEBUG: Chat ID mismatch. msg.chat:", msg.chat, "selectedChat._id:", selectedChat?._id);
        return;
      }
      setMessages(prev => [...prev, msg]);
    };

    socket.on("new-message", handler);
    return () => socket.off("new-message", handler);
  }, [selectedChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // FINAL SEND
  const sendMessage = () => {
    console.log("DEBUG: Attempting to send message. text:", text, "selectedChat:", selectedChat?._id);
    if (!text.trim() || !selectedChat) {
      console.log("DEBUG: Send aborted. text empty or no selectedChat.");
      return;
    }

    if (!socket.connected) {
      console.log("DEBUG: Socket not connected! Attempting to reconnect...");
      socket.connect();
    }

    socket.emit("join-chat", selectedChat._id);
    socket.emit("send-message", {
      chatId: selectedChat._id,
      content: text,
    }, (ack) => {
      console.log("DEBUG: Server acknowledged message receipt:", ack);
    });

    console.log("DEBUG: socket.emit('send-message') called.");
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
      <div className="chat-header">
        <div className="chat-title">
          {selectedChat?.isGroup ? selectedChat?.groupName : (otherUser?.name || "Chat")}
        </div>

        <div className="chat-status">
          {isTyping
            ? "typing..."
            : isOnline
            ? "online"
            : lastSeenText  }
        </div>
      </div>

      <div className="messages">
        {messages.map(m => (
          <Message key={m._id} msg={m} />
        ))}
        <div ref={messagesEndRef} />
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
