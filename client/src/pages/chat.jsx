import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import socket from "../services/socket";

export default function Chat() {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [lastSeenMap, setLastSeenMap] = useState({});

  useEffect(() => {
  socket.on("online-users", users => {
    setOnlineUsers(users.map(u => u._id));
  });

  // socket.on("user-online", ({ userId }) => {
  //   setOnlineUsers(prev => [...new Set([...prev, userId])]);
  // });
  socket.on("user-online", ({ userId }) => {
  setOnlineUsers(prev => [...new Set([...prev, userId])]);

  setLastSeenMap(prev => {
    const copy = { ...prev };
    delete copy[userId];
    return copy;
  });
});


  // socket.on("user-offline", ({ userId }) => {
  //   setOnlineUsers(prev => prev.filter(id => id !== userId));
  // });
  socket.on("user-offline", ({ userId, lastSeen }) => {
  setOnlineUsers(prev => prev.filter(id => id !== userId));

  setLastSeenMap(prev => ({
    ...prev,
    [userId]: lastSeen,
  }));
});


  return () => {
    socket.off("online-users");
    socket.off("user-online");
    socket.off("user-offline");
  };
}, []);

useEffect(() => {
  console.log("ONLINE USERS STATE:", onlineUsers);
}, [onlineUsers]);


  // Update sidebar lastMessage for BOTH users
  useEffect(() => {
    const handler = (msg) => {
      setChats(prev =>
        prev.map(c =>
          c._id === msg.chat ? { ...c, lastMessage: msg } : c
        )
      );
    };

    socket.on("new-message", handler);
    return () => socket.off("new-message", handler);
  }, []);

  //  CRITICAL: join ALL chat rooms once chats load
  useEffect(() => {
    if (!chats.length) return;

    chats.forEach(chat => {
      socket.emit("join-chat", chat._id);
    });
  }, [chats]);

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar
        chats={chats}
        setChats={setChats}
        setSelectedChat={setSelectedChat}
        onlineUsers={onlineUsers}
      />

      <ChatWindow
        selectedChat={selectedChat}
        onlineUsers={onlineUsers}
        lastSeenMap={lastSeenMap}
      />
    </div>
  );
}
