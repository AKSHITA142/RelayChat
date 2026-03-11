import { useEffect, useState } from "react";
import api from "../services/api";
import { getLoggedInUser } from "../utils/auth";


export default function Sidebar({ chats, setChats, setSelectedChat, onlineUsers = []}) {
  const myUserId = getLoggedInUser()?._id;
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  useEffect(() => {
    api.get("/chat/my-chats")
      .then(res => setChats(res.data))
      .catch(console.error);
  }, [setChats]);
  return (
    <div className="sidebar">
      <div className="search-container" style={{ marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={async (e) => {
            const query = e.target.value;
            setSearch(query);
            if (!query.trim()) {
              setSearchResults([]);
              return;
            }
            try {
              const res = await api.get(`/user?search=${query}`);
              setSearchResults(res.data);
            } catch (err) {
              console.error("Search error:", err);
            }
          }}
          style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #1e293b", background: "#020617", color: "white" }}
        />
        {searchResults.length > 0 && (
          <div className="search-results" style={{ 
            background: "#1e293b", 
            borderRadius: "4px", 
            marginTop: "5px",
            maxHeight: "200px",
            overflowY: "auto",
            position: "absolute",
            width: "300px",
            zIndex: 10,
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
          }}>
            {searchResults.map(user => (
              <div
                key={user._id}
                className="search-item"
                onClick={async () => {
                  try {
                    const res = await api.post("/chat/create", { userId: user._id });
                    const newChat = res.data;
                    if (!chats.find(c => c._id === newChat._id)) {
                      setChats(prev => [newChat, ...prev]);
                    }
                    setSelectedChat(newChat);
                    setSearch("");
                    setSearchResults([]);
                  } catch (err) {
                    console.error("Error creating chat:", err);
                  }
                }}
                style={{ padding: "8px", cursor: "pointer", borderBottom: "1px solid #020617" }}
              >
                <p style={{ margin: 0, fontSize: "14px" }}>{user.name}</p>
                <p style={{ margin: 0, fontSize: "12px", color: "#94a3b8" }}>{user.email}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      <h3>Chats</h3>

      {chats.map(chat => {
        const otherUser = chat.participants.find(
          u => (u._id?.toString() || u.toString()) !== myUserId?.toString()
        );

        const isOnline = onlineUsers.includes(otherUser?._id || otherUser);

        return (
          <div
            key={chat._id}
            className="chat-item"
            onClick={() => setSelectedChat(chat)}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong style={{ display: "block", fontSize: "14px" }}>{otherUser?.name || "Unknown"}</strong>
                <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#94a3b8" }}>
                  {chat.lastMessage?.content || "No messages yet"}
                </p>
              </div>
              <span
                className={isOnline ? "online-dot" : "offline-dot"}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}