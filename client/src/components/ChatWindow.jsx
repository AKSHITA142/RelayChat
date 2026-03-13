import { useEffect, useState, useRef } from "react";
import Message from "./Message";
import socket from "../services/socket";
import api from "../services/api";
import { getLoggedInUser } from "../utils/auth";


export default function ChatWindow({ selectedChat, onlineUsers = [], lastSeenMap = {} }) {
  const myUserId = getLoggedInUser()?._id;
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeout = useRef(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
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
    socket.emit("mark-seen", { chatId: selectedChat._id });
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

      // Mark as seen immediately if it's from the other user
      if ((msg.sender?._id || msg.sender)?.toString() !== myUserId?.toString()) {
        socket.emit("mark-seen", { chatId: selectedChat._id });
      }
    };

    const statusHandler = ({ messageId }) => {
      setMessages(prev => prev.map(m =>
        m._id === messageId ? { ...m, status: "delivered" } : m
      ));
    };

    const seenHandler = ({ chatId, userId }) => {
      if (chatId === selectedChat?._id && userId !== myUserId) {
        setMessages(prev => prev.map(m =>
          m.status !== "seen" ? { ...m, status: "seen" } : m
        ));
      }
    };

    const deleteForMeHandler = ({ messageId }) => {
      setMessages(prev => prev.filter(m => m._id !== messageId));
    };

    const deleteForEveryoneHandler = ({ messageId }) => {
      setMessages(prev => prev.map(m => 
        m._id === messageId 
          ? { ...m, content: "This message was deleted", isDeleted: true } 
          : m
      ));
    };

    socket.on("new-message", handler);
    socket.on("message-delivered", statusHandler);
    socket.on("message-seen", seenHandler);
    socket.on("message-deleted-for-me", deleteForMeHandler);
    socket.on("message-deleted-for-everyone", deleteForEveryoneHandler);

    return () => {
      socket.off("new-message", handler);
      socket.off("message-delivered", statusHandler);
      socket.off("message-seen", seenHandler);
      socket.off("message-deleted-for-me", deleteForMeHandler);
      socket.off("message-deleted-for-everyone", deleteForEveryoneHandler);
    };
  }, [selectedChat, myUserId]);

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
              : lastSeenText}
        </div>
      </div>

      <div className="messages">
        {messages.map(m => (
          <Message key={m._id} msg={m} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-box">
        {showEmojiPicker && (
          <div className="emoji-picker">
            {["😊", "😂", "❤️", "👍", "🙏", "🔥", "😭", "😮", "🎉", "✨", "💯", "✅", "🙌", "💀", "🤣", "🤔", "😘", "😎", "👀", "👋"].map(emoji => (
              <span 
                key={emoji} 
                onClick={() => {
                  setText(prev => prev + emoji);
                  setShowEmojiPicker(false);
                }}
              >
                {emoji}
              </span>
            ))}
          </div>
        )}
        <button 
          className="emoji-btn"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
        >
          😊
        </button>
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
          placeholder="Type a message..." />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}
