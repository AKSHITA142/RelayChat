import { useEffect } from "react";
import api from "../services/api";
import { getLoggedInUser } from "../utils/auth";

const myUserId = getLoggedInUser()?._id;

export default function Sidebar({ chats, setChats, setSelectedChat , onlineUsers = []}) {
  useEffect(() => {
    api.get("/chat/my-chats")
      .then(res => setChats(res.data))
      .catch(console.error);
  }, [setChats]);
  return (
    <div className="sidebar">
      <h3>Chats</h3>

      {chats.map(chat => {
        const otherUserId = chat.participants.find(
          id => id !== myUserId
        );

        const isOnline = onlineUsers.includes(otherUserId);

        return (
          <div
            key={chat._id}
            className="chat-item"
            onClick={() => setSelectedChat(chat)}
          >
            <p>{chat.lastMessage?.content || "No messages yet"}</p>
            <span
              className={isOnline ? "online-dot" : "offline-dot"}
            />
          </div>
        );
      })}
    </div>
  );
}