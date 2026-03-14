import { useEffect, useState } from "react";
import api from "../services/api";
import { getLoggedInUser } from "../utils/auth";


export default function Sidebar({ chats, setChats, setSelectedChat, onlineUsers = [], contacts = []}) {
  const myUserId = getLoggedInUser()?._id;
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  
  // Contact Discovery State
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [contactPhone, setContactPhone] = useState("");
  const [contactLoading, setContactLoading] = useState(false);
  const [contactError, setContactError] = useState("");

  useEffect(() => {
    api.get("/chat/my-chats")
      .then(res => setChats(res.data))
      .catch(console.error);
  }, [setChats]);

  const handleStartChat = async () => {
    if (!contactPhone.trim()) {
      return setContactError("Please enter a phone number");
    }
    
    setContactLoading(true);
    setContactError("");

    try {
      const res = await api.post("/chat/start", { phone: contactPhone });
      const newChat = res.data.chat;

      // Check if chat is already in the list
      if (!chats.find(c => c._id === newChat._id)) {
        setChats(prev => [newChat, ...prev]);
      }
      
      setSelectedChat(newChat);
      setIsAddingContact(false);
      setContactPhone("");
    } catch (err) {
      console.error("Error starting chat:", err);
      setContactError(err.response?.data?.message || "User not found");
    } finally {
      setContactLoading(false);
    }
  };

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

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
        <h3 style={{ margin: 0 }}>Chats</h3>
        <button 
          onClick={() => {
            setIsAddingContact(!isAddingContact);
            setContactError("");
          }}
          style={{
            background: "#25d366",
            border: "none",
            borderRadius: "50%",
            width: "30px",
            height: "30px",
            cursor: "pointer",
            fontWeight: "bold",
            color: "#0b141a"
          }}
          title="New Chat"
        >
          {isAddingContact ? "✕" : "+"}
        </button>
      </div>

      {isAddingContact && (
        <div style={{ marginBottom: "20px", padding: "10px", background: "#1e293b", borderRadius: "8px" }}>
          <p style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#e9edef" }}>Start chat via phone number in International format (+xxx)</p>
          <input
            type="text"
            placeholder="+91987..."
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #1e293b", background: "#020617", color: "white", marginBottom: "10px", boxSizing: "border-box" }}
          />
          {contactError && <p style={{ color: "#ef4444", fontSize: "12px", margin: "0 0 10px 0" }}>{contactError}</p>}
          <button
            onClick={handleStartChat}
            disabled={contactLoading}
            style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "none", background: "#25d366", color: "#0b141a", fontWeight: "bold", cursor: "pointer" }}
          >
            {contactLoading ? "Starting..." : "Start Chat"}
          </button>
        </div>
      )}

      {chats.map(chat => {
        const otherUser = chat.participants.find(
          u => (u._id?.toString() || u.toString()) !== myUserId?.toString()
        );

        const isOnline = onlineUsers.includes(otherUser?._id || otherUser);

        const savedContact = contacts.find(c => c.userId?.toString() === otherUser?._id?.toString());
        const displayName = savedContact ? savedContact.savedName : (otherUser?.phoneNumber || "Unknown");

        return (
          <div
            key={chat._id}
            className="chat-item"
            onClick={() => setSelectedChat(chat)}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong style={{ display: "block", fontSize: "14px" }}>{displayName}</strong>
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