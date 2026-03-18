import { useState, useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

// Ensure `motion` is treated as used by the linter (used in JSX via <motion.* />)
void motion;

import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import socket, { connectSocket } from "../services/socket";
import { getLoggedInUser } from "../utils/auth";
import VideoCall from "../components/VideoCall";
import { AnimatePresence } from "framer-motion";

export default function Chat() {
  const containerRef = useRef(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth the mouse movement
  const springConfig = { damping: 20, stiffness: 150 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  const x = useTransform(smoothX, (v) => `${v}px`);
  const y = useTransform(smoothY, (v) => `${v}px`);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const { left, top } = containerRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - left);
    mouseY.set(e.clientY - top);
  };

  useEffect(() => {
    connectSocket();
    // Kill any rogue ringer audio left over from a previous call/hot-reload
    // eslint-disable-next-line no-empty
    document.querySelectorAll("audio").forEach(a => { try { a.pause(); a.src = ""; } catch {} });
  }, []);
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [lastSeenMap, setLastSeenMap] = useState({});
  const [contacts, setContacts] = useState(() => getLoggedInUser()?.contacts || []);
  
  // Shared UI States for Side Panels
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [activeVideoCall, setActiveVideoCall] = useState(null);

  useEffect(() => {
    socket.on("online-users", users => {
      setOnlineUsers(users.map(u => u._id));
    });

    socket.on("user-online", ({ userId }) => {
      setOnlineUsers(prev => [...new Set([...prev, userId])]);

      setLastSeenMap(prev => {
        const copy = { ...prev };
        delete copy[userId];
        return copy;
      });
    });

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

  // Update sidebar lastMessage for BOTH users
  useEffect(() => {
    const handler = (msg) => {
      setChats(prev => {
        const msgChatId = (msg.chat?._id || msg.chat)?.toString();
        const chatIdx = prev.findIndex(c => c._id?.toString() === msgChatId);
        if (chatIdx === -1) return prev; 
        const updatedChat = { ...prev[chatIdx], lastMessage: msg };
        const rest = prev.filter((_, i) => i !== chatIdx);
        return [updatedChat, ...rest];
      });
    };

    socket.on("new-message", handler);
    return () => socket.off("new-message", handler);
  }, []);

  // Listen for newly created chats (like groups)
  useEffect(() => {
    const newChatHandler = (newChat) => {
      setChats(prev => {
        if (prev.find(c => c._id?.toString() === newChat._id?.toString())) {
          return prev;
        }
        socket.emit("join-chat", newChat._id); 
        return [newChat, ...prev];
      });
    };

    socket.on("new-chat", newChatHandler);
    return () => socket.off("new-chat", newChatHandler);
  }, []);

  // Listen for chat renames
  useEffect(() => {
    const renameHandler = ({ chatId, name }) => {
      setChats(prev => prev.map(c => c._id === chatId ? { ...c, groupName: name } : c));
      setSelectedChat(prev => (prev?._id === chatId ? { ...prev, groupName: name } : prev));
    };
    socket.on("chat-renamed", renameHandler);
    return () => socket.off("chat-renamed", renameHandler);
  }, []);

  // Listen for chat membership/data updates
  useEffect(() => {
    const chatUpdateHandler = (updatedChat) => {
      setChats(prev => prev.map(c => c._id === updatedChat._id ? updatedChat : c));
      setSelectedChat(prev => (prev?._id === updatedChat._id ? updatedChat : prev));
    };
    socket.on("chat-updated", chatUpdateHandler);
    return () => socket.off("chat-updated", chatUpdateHandler);
  }, []);

  // Video Call Signaling
  useEffect(() => {
    const handleIncomingCall = ({ from, fromName, offer }) => {
      console.log("📞 Incoming call from:", fromName);
      setActiveVideoCall({ to: from, fromName, initialOffer: offer, isIncoming: true, callId: Date.now() });
    };

    socket.off("incoming-call"); // PREVENT DUPLICATES
    socket.on("incoming-call", handleIncomingCall);
    return () => socket.off("incoming-call", handleIncomingCall);
  }, []);

  //  CRITICAL: join ALL chat rooms once chats load
  useEffect(() => {
    if (!chats.length) return;

    chats.forEach(chat => {
      socket.emit("join-chat", chat._id);
    });
  }, [chats]);

  return (
    <motion.div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      style={{
        "--x": x,
        "--y": y
      }}
      className="relative flex h-screen bg-whatsapp-bg-dark overflow-hidden group"
    >
      {/* Interactive Border Glow Layer */}
      <div className="proximity-glow opacity-0 group-hover:opacity-100" />

      <Sidebar
        chats={chats}
        setChats={setChats}
        setSelectedChat={setSelectedChat}
        selectedChat={selectedChat}
        onlineUsers={onlineUsers}
        contacts={contacts}
        isAddingContact={isAddingContact}
        setIsAddingContact={setIsAddingContact}
        isCreatingGroup={isCreatingGroup}
        setIsCreatingGroup={setIsCreatingGroup}
      />

      <ChatWindow
        selectedChat={selectedChat}
        chats={chats}
        setSelectedChat={setSelectedChat}
        onlineUsers={onlineUsers}
        lastSeenMap={lastSeenMap}
        contacts={contacts}
        setContacts={setContacts}
        setChats={setChats}
        setIsAddingContact={setIsAddingContact}
        setIsCreatingGroup={setIsCreatingGroup}
        setActiveVideoCall={setActiveVideoCall}
      />

      {/* Global Video Call Overlay */}
      <AnimatePresence mode="wait">
        {activeVideoCall && (
          <VideoCall 
            key={activeVideoCall.callId || "call"}
            {...activeVideoCall} 
            onClose={() => {
              if (activeVideoCall) {
                const personId = (activeVideoCall.to?._id || activeVideoCall.to)?.toString();
                
                if (personId) {
                  const targetChat = chats.find(c => 
                    !c.isGroup && c.participants?.some(p => (p._id || p).toString() === personId)
                  );
                  
                  if (targetChat) {
                    setSelectedChat(targetChat);
                  }
                }
              }
              setActiveVideoCall(null);
            }} 
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
