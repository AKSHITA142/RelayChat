import { useEffect } from "react";
import api from "../services/api";

export default function Sidebar({ chats, setChats, setSelectedChat }) {
  useEffect(() => {
    api.get("/chat/my-chats")
      .then(res => setChats(res.data))
      .catch(console.error);
  }, []);

  return (
    <div className="sidebar">
      <h3>Chats</h3>
      {chats.map(chat => (
        <div
          key={chat._id}
          className="chat-item"
          onClick={() => setSelectedChat(chat)}
        >
          <p>{chat.lastMessage?.content || "No messages yet"}</p>
        </div>
      ))}
    </div>
  );
}
