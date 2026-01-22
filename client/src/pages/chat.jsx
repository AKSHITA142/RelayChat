import { useState } from "react";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";

export default function Chat() {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar
        chats={chats}
        setChats={setChats}
        setSelectedChat={setSelectedChat}
      />

      <ChatWindow
        selectedChat={selectedChat}
        chats={chats}
        setChats={setChats}
      />
    </div>
  );
}
