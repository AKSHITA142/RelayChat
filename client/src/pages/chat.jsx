import { useState,useEffect } from "react";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import socket from "../services/socket";
export default function Chat() {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  useEffect(() => {
    const handler = (msg) => {

     

      // Update sidebar
      setChats(prev =>
        prev.map(c =>
          c._id === msg.chat ? { ...c, lastMessage: msg } : c
        )
      );
    };

    socket.on("new-message", handler);

    return () => socket.off("new-message", handler);
  }, []);

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar
        chats={chats}
        setChats={setChats}
        setSelectedChat={setSelectedChat}
      />

      <ChatWindow
        selectedChat={selectedChat}
        setChats={setChats}
      />
    </div>
  );
}
