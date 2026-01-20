import { useEffect, useState } from "react";
import api from "../services/api";

export default function Sidebar() {
  const [chats, setChats] = useState([]);

  useEffect(() => {
    api.get("/chat/my-chats").then(res => setChats(res.data));
  }, []);

  return (
    <div className="sidebar">
      <h3>Chats</h3>
      {chats.map(chat => (
        <div key={chat._id} className="chat-item">
          {chat.lastMessage?.content || "No messages"}
          {chat.unreadCount > 0 && (
            <span className="unread">{chat.unreadCount}</span>
          )}
        </div>
      ))}
    </div>
  );
}

