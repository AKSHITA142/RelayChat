import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import socket, { connectSocket } from "../services/socket";
import { getLoggedInUser } from "../utils/auth";

export default function Chat() {
  useEffect(() => {
    connectSocket();
  }, []);
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [lastSeenMap, setLastSeenMap] = useState({});
  const [contacts, setContacts] = useState(() => getLoggedInUser()?.contacts || []);

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
      setChats(prev => {
        const msgChatId = (msg.chat?._id || msg.chat)?.toString();
        // Find if this chat exists in our list
        const chatIdx = prev.findIndex(c => c._id?.toString() === msgChatId);
        
        if (chatIdx === -1) return prev; 

        // Update the chat object
        const updatedChat = { ...prev[chatIdx], lastMessage: msg };
        
        // Remove it from current position and put at top
        const rest = prev.filter((_, i) => i !== chatIdx);
        return [updatedChat, ...rest];
      });
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
        contacts={contacts}
      />

      <ChatWindow
        selectedChat={selectedChat}
        onlineUsers={onlineUsers}
        lastSeenMap={lastSeenMap}
        contacts={contacts}
        setContacts={setContacts}
      />
    </div>
  );
}
