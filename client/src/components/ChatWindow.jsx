import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Ensure `motion` is treated as used by the linter (used in JSX via <motion.* />)
void motion;

import { 
  Smile, 
  Paperclip, 
  Send, 
  UserPlus, 
  Users,
  X, 
  Check, 
  MoreHorizontal, 
  Cpu, 
  FilePlus, 
  UserCheck, 
  Loader2,
  Circle,
  Edit2,
  Mic,
  Search as SearchIcon,
  ChevronUp,
  ChevronDown,
  UserMinus,
  AlertTriangle,
  Shield,
  Info,
  Phone,
  Plus,
  Video as VideoIcon,
  Palette
} from "lucide-react";
import Message from "./Message";
import VoiceRecorder from "./VoiceRecorder";
import ThemeSelector from "./ThemeSelector";
import { useChatTheme, THEMES } from "../hooks/useChatTheme";
import socket from "../services/socket";
import api from "../services/api";
import { getLoggedInUser } from "../utils/auth";

export default function ChatWindow({ 
  selectedChat, 
  setSelectedChat,
  chats = [],
  onlineUsers = [], 
  lastSeenMap = {}, 
  contacts = [], 
  setContacts, 
  setChats,
  setIsAddingContact,
  setIsCreatingGroup,
  setActiveVideoCall
}) {
  const myUserId = getLoggedInUser()?._id;
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeout = useRef(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const [isRenaming, setIsRenaming] = useState(false);
  const [tempGroupName, setTempGroupName] = useState("");
  
  const [showAddMember, setShowAddMember] = useState(false);
  const [showRemoveMember, setShowRemoveMember] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [adminNotice, setAdminNotice] = useState("");
  const [phoneToAdd, setPhoneToAdd] = useState("");
  const [isAddingByPhone, setIsAddingByPhone] = useState(false);

  const otherUser = Array.isArray(selectedChat?.participants) 
    ? selectedChat.participants.find(u => u && (u._id?.toString() || u.toString()) !== myUserId?.toString())
    : null;

  const isOnline = Array.isArray(onlineUsers) && otherUser?._id && onlineUsers.some(
    id => id?.toString() === otherUser._id.toString()
  );
  
  const lastSeen = lastSeenMap[otherUser?._id];
  const lastSeenText = (() => {
    try {
      if (!lastSeen) return "Offline";
      const date = new Date(lastSeen);
      if (isNaN(date.getTime())) return "Offline";
      return `Available ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return "Offline";
    }
  })();

  const savedContact = otherUser ? contacts.find(c => c.userId?.toString() === otherUser?._id?.toString()) : null;
  const displayName = (selectedChat?.isGroup ? selectedChat.groupName : (savedContact ? savedContact.savedName : (otherUser?.phoneNumber || otherUser?.name || "Unknown"))) || "Unknown";

  const [showAddContact, setShowAddContact] = useState(false);
  const [newContactName, setNewContactName] = useState("");
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  
  // New Menu & Search State
  const [showMenu, setShowMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);
  const [searchResults, setSearchResults] = useState([]);
  const [showDeleted, setShowDeleted] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);

  // Per-chat theme
  const [savedThemeName, setSavedThemeName] = useChatTheme(selectedChat?._id);
  const [activeThemeName, setActiveThemeName] = useState(savedThemeName);
  const theme = THEMES[activeThemeName] || THEMES.blue;

  // Message info modal
  const [showMessageInfo, setShowMessageInfo] = useState(false);
  const [selectedMessageForInfo, setSelectedMessageForInfo] = useState(null);

  const handleShowMessageInfo = (message) => {
    setSelectedMessageForInfo(message);
    setShowMessageInfo(true);
  };

  const handleThemeSelect = useCallback((name) => {
    setActiveThemeName(name);
    setSavedThemeName(name);
    setShowThemePicker(false);
  }, [setSavedThemeName]);

  const menuRef = useRef(null);

  const pastChatUsers = Array.from(new Map(
    chats
      .filter(c => !c.isGroup)
      .map(c => {
        const u = c.participants.find(p => (p?._id?.toString() || p?.toString()) !== myUserId?.toString());
        return u ? [(u._id || u).toString(), u] : null;
      })
      .filter(Boolean)
  ).values());

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (q) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      setCurrentSearchIndex(-1);
      return;
    }
    const results = messages
      .map((m, idx) => m.content?.toLowerCase().includes(q.toLowerCase()) ? idx : null)
      .filter(idx => idx !== null);
    setSearchResults(results);
    if (results.length > 0) {
      setCurrentSearchIndex(results.length - 1); // Point to latest match first
      const firstMatchId = messages[results[results.length - 1]]._id;
      document.getElementById(`msg-${firstMatchId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      setCurrentSearchIndex(-1);
    }
  };

  const navigateSearch = (dir) => {
    if (searchResults.length === 0) return;
    let nextIdx = currentSearchIndex + dir;
    if (nextIdx < 0) nextIdx = searchResults.length - 1;
    if (nextIdx >= searchResults.length) nextIdx = 0;
    setCurrentSearchIndex(nextIdx);
    const matchId = messages[searchResults[nextIdx]]._id;
    document.getElementById(`msg-${matchId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleVoiceSend = async (blob) => {
    try {
      const file = new File([blob], `voice-note-${Date.now()}.webm`, { type: "audio/webm" });
      const formData = new FormData();
      formData.append("file", file);
      formData.append("chatId", selectedChat._id);
      formData.append("content", "🎤 Voice Message");

      await api.post("/message/upload", formData);
      setIsVoiceRecording(false);
    } catch (err) {
      console.error("Error sending voice message:", err);
      setIsVoiceRecording(false);
    }
  };

  const handleRenameChat = async () => {
    if (!tempGroupName.trim() || tempGroupName === displayName) {
      return setIsRenaming(false);
    }
    try {
      if (selectedChat.isGroup) {
        const res = await api.put(`/chat/${selectedChat._id}/rename`, { name: tempGroupName });
        selectedChat.groupName = res.data.groupName;
        setChats(prev => prev.map(c => c._id === selectedChat._id ? { ...c, groupName: res.data.groupName } : c));
      } else {
        const res = await api.post("/user/save-contact", { 
          targetUserId: otherUser._id, 
          savedName: tempGroupName 
        });
        const myUser = getLoggedInUser();
        const updatedUser = { ...myUser, contacts: res.data.contacts };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setContacts(res.data.contacts);
      }
      setIsRenaming(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddContact = async () => {
    if (!newContactName.trim()) return;
    try {
      const res = await api.post("/user/save-contact", { 
        targetUserId: otherUser._id, 
        savedName: newContactName 
      });
      const myUser = getLoggedInUser();
      const updatedUser = { ...myUser, contacts: res.data.contacts };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setContacts(res.data.contacts);
      setShowAddContact(false);
      setNewContactName("");
    } catch(err) {
      console.error(err);
    }
  };

  const handleAddMemberToGroup = async (userId) => {
    try {
      const res = await api.post(`/chat/${selectedChat._id}/add-to-group`, { userId });
      // Update the chat in local state
      setChats(prev => prev.map(c => c._id === selectedChat._id ? res.data : c));
      setSelectedChat(res.data);
      setShowAddMember(false);
      setPhoneToAdd("");
    } catch (err) {
      console.error(err);
      setAdminNotice(err.response?.data?.message || "Failed to add member");
      setTimeout(() => setAdminNotice(""), 3000);
    } finally {
      setIsAddingByPhone(false);
    }
  };

  const handleAddMemberByPhone = async () => {
    if (!phoneToAdd.trim()) return;
    setIsAddingByPhone(true);
    try {
      const res = await api.post("/chat/start", { phone: phoneToAdd.trim() });
      const targetUserId = res.data.chat?.participants?.find(p => (p._id || p).toString() !== myUserId?.toString())?._id || res.data.receiver_id;
      
      if (!targetUserId) throw new Error("User not found");
      
      await handleAddMemberToGroup(targetUserId);
    } catch (err) {
      console.error(err);
      setAdminNotice(err.response?.data?.message || "User not found or unreachable");
      setTimeout(() => setAdminNotice(""), 3000);
      setIsAddingByPhone(false);
    }
  };

  const handleRemoveMemberFromGroup = async (userId) => {
    try {
      const res = await api.post(`/chat/${selectedChat._id}/remove-from-group`, { userId });
      setChats(prev => prev.map(c => c._id === selectedChat._id ? res.data : c));
      setSelectedChat(res.data);
      setShowRemoveMember(false);
    } catch (err) {
      console.error(err);
      setAdminNotice(err.response?.data?.message || "Failed to remove member");
      setTimeout(() => setAdminNotice(""), 3000);
    }
  };

  useEffect(() => {
    if (!selectedChat) return;
    api.get(`/message/${selectedChat._id}?includeDeleted=${showDeleted}`)
      .then(res => {
        if (Array.isArray(res.data)) {
          const sorted = res.data.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          setMessages(sorted);
        } else {
          setMessages([]);
        }
      })
      .catch(err => {
        console.error("Failed to fetch messages:", err);
        setMessages([]);
      });
    socket.emit("join-chat", selectedChat._id);
    socket.emit("mark-seen", { chatId: selectedChat._id });

    // Reset overlays on chat change
    setShowParticipants(false);
    setShowAddMember(false);
    setShowRemoveMember(false);
    setShowMenu(false);
    setShowSearch(false);
    setShowAddContact(false);
    setAdminNotice("");
    setIsRenaming(false);
    setShowThemePicker(false);
  }, [selectedChat, showDeleted]);

  // Sync theme when chat changes
  useEffect(() => {
    if (selectedChat?._id) {
      const stored = localStorage.getItem(`chat-theme-${selectedChat._id}`) || "blue";
      setActiveThemeName(stored);
    }
  }, [selectedChat?._id]);

  useEffect(() => {
    const handleTyping = () => setIsTyping(true);
    const handleStopTyping = () => setIsTyping(false);
    socket.on("typing", handleTyping);
    socket.on("stop-typing", handleStopTyping);
    return () => {
      socket.off("typing", handleTyping);
      socket.off("stop-typing", handleStopTyping);
    };
  }, []);

  useEffect(() => {
    const handler = (msg) => {
      if (!msg || !selectedChat?._id || !msg.chat) return;
      if (msg.chat.toString() !== selectedChat._id.toString()) return;
      setMessages(prev => [...prev, msg]);
      if (msg.sender && (msg.sender?._id || msg.sender)?.toString() !== myUserId?.toString()) {
        socket.emit("mark-seen", { chatId: selectedChat._id });
      }
    };

    const statusHandler = ({ messageId }) => {
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, status: "delivered" } : m));
    };

    const seenHandler = ({ chatId, userId, messages: updatedMessages }) => {
      if (chatId?.toString() === selectedChat?._id?.toString()) {
        // If we have updated messages from server, use those
        if (updatedMessages && Array.isArray(updatedMessages)) {
          setMessages(prev => 
            prev.map(m => {
              const updated = updatedMessages.find(um => um._id.toString() === m._id.toString());
              return updated ? { ...m, seenBy: updated.seenBy } : m;
            })
          );
        } else {
          // Fallback: add userId to seenBy for all sent messages
          setMessages(prev => 
            prev.map(m => 
              m.sender && (m.sender._id || m.sender).toString() === myUserId?.toString()
                ? { ...m, seenBy: [...new Set([...(m.seenBy || []), userId])] }
                : m
            )
          );
        }
      }
    };

    const deleteForMeHandler = ({ messageId }) => {
      if (!showDeleted) {
        setMessages(prev => prev.filter(m => m._id !== messageId));
      } else {
        // If showing deleted, we just need to re-fetch or update the message status locally
        // For simplicity, let's just update the local message object if we have it
        setMessages(prev => prev.map(m => m._id === messageId ? { ...m, deletedFor: [...(m.deletedFor || []), myUserId] } : m));
      }
    };

    const restoreForMeHandler = ({ messageId }) => {
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, deletedFor: (m.deletedFor || []).filter(id => id !== myUserId) } : m));
    };

    const deleteForEveryoneHandler = ({ messageId }) => {
      setMessages(prev => prev.map(m => m?._id === messageId ? { ...m, content: "This message was deleted", isDeleted: true } : m));
    };

    const reactionHandler = (updatedMessage) => {
      if (!updatedMessage?._id) return;
      setMessages(prev => prev.map(m => m?._id === updatedMessage._id ? updatedMessage : m));
    };

    socket.on("new-message", handler);
    socket.on("message-delivered", statusHandler);
    socket.on("message-seen", seenHandler);
    socket.on("message-deleted-for-me", deleteForMeHandler);
    socket.on("message-restored-for-me", restoreForMeHandler);
    socket.on("message-deleted-for-everyone", deleteForEveryoneHandler);
    socket.on("message-reacted", reactionHandler);

    return () => {
      socket.off("new-message", handler);
      socket.off("message-delivered", statusHandler);
      socket.off("message-seen", seenHandler);
      socket.off("message-deleted-for-me", deleteForMeHandler);
      socket.off("message-restored-for-me", restoreForMeHandler);
      socket.off("message-deleted-for-everyone", deleteForEveryoneHandler);
      socket.off("message-reacted", reactionHandler);
    };
  }, [selectedChat, myUserId, showDeleted]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!text.trim() && !selectedFile) return;
    if (selectedFile) sendFileAndText();
    else {
      socket.emit("send-message", {
        chatId: selectedChat._id,
        content: text,
      });
      setText("");
    }
  };

  const sendFileAndText = async () => {
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("chatId", selectedChat._id);
    if (text.trim()) formData.append("content", text);

    try {
      await api.post("/message/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setSelectedFile(null);
    } catch (err) {
      console.error("Upload failed", err);
    }
  };

  if (!selectedChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 via-whatsapp-bg-dark to-whatsapp-bg-dark">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl px-8"
        >
          {[
            { icon: <FilePlus className="text-emerald-400" />, title: "Collaborate", desc: "Share documents and media instantly." },
            { icon: <UserPlus className="text-sky-400" />, title: "Expand Network", desc: "Start a conversation with anyone." },
            { icon: <Cpu className="text-amber-400" />, title: "AI Powered", desc: "Ask our intelligence for assistance." }
          ].map((card, i) => (
            <motion.div 
              key={i}
              whileHover={{ y: -5, backgroundColor: "rgba(255,255,255,0.05)" }}
              className="glass-card p-6 flex flex-col items-center text-center group cursor-pointer"
            >
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-4 group-hover:bg-white/10 transition-colors">
                {card.icon}
              </div>
              <h3 className="text-white font-bold mb-2">{card.title}</h3>
              <p className="text-slate-500 text-xs leading-relaxed">{card.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className="flex-1 flex flex-col h-full relative overflow-hidden"
      style={{ background: theme.background, transition: "background 0.4s ease, color 0.3s ease" }}
    >
      {/* NO pattern overlay on light themes — removed for clarity */}

      {/* Header */}
      <div
        className="h-16 px-6 backdrop-blur-xl border-b border-white/5 flex items-center justify-between z-20"
        style={{ background: "#111b21ea" }}
      >
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold bg-whatsapp-green/10 text-whatsapp-green`}>
              {selectedChat.isGroup ? <Users size={20} /> : (displayName?.[0]?.toUpperCase() || "?")}
            </div>
            {!selectedChat.isGroup && isOnline && (
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-whatsapp-green border-2 border-whatsapp-sidebar-dark rounded-full shadow-lg" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-3">
              {isRenaming ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={tempGroupName}
                    onChange={(e) => setTempGroupName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleRenameChat()}
                    className="bg-black/20 border border-whatsapp-green/30 rounded-lg px-2 py-1 text-sm text-white outline-none focus:border-whatsapp-green"
                    autoFocus
                  />
                  <button onClick={handleRenameChat} className="p-1 text-whatsapp-green hover:bg-whatsapp-green/10 rounded-lg"><Check size={16} /></button>
                  <button onClick={() => setIsRenaming(false)} className="p-1 text-rose-400 hover:bg-rose-500/10 rounded-lg"><X size={16} /></button>
                </div>
              ) : (
                <>
                  <h3 className="text-sm font-bold text-white tracking-wide">{displayName}</h3>
                  <button 
                    onClick={() => {
                      setIsRenaming(true);
                      setTempGroupName(displayName);
                    }}
                    className="p-1 text-slate-500 hover:text-whatsapp-green transition-colors"
                  >
                    <Edit2 size={14} />
                  </button>
                </>
              )}
              <AnimatePresence>
                {!selectedChat?.isGroup && !savedContact && otherUser && (
                  <motion.button 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    onClick={() => setShowAddContact(true)} 
                    className="flex items-center gap-1.5 px-2 py-0.5 bg-whatsapp-green/10 text-whatsapp-green text-[10px] font-black uppercase rounded-full hover:bg-whatsapp-green hover:text-whatsapp-bg-dark transition-all"
                  >
                    <UserPlus size={10} /> Add Contact
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold uppercase tracking-widest ${isTyping || isOnline ? 'text-whatsapp-green' : 'text-slate-500'}`}>
                {isTyping ? (
                  <span className="flex items-center gap-1">
                    <Circle className="animate-pulse fill-whatsapp-green" size={4} />
                    Refining thoughts...
                  </span>
                ) : selectedChat?.isGroup ? (
                   `Joined • ${selectedChat.createdAt ? new Date(selectedChat.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : "Recently"}`
                ) : isOnline ? "Active Now" : lastSeenText}
              </span>
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-3 relative" ref={menuRef}>
          {/* Theme Picker Button */}
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowThemePicker(p => !p)}
              className="p-2 rounded-lg transition-all"
              style={{
                background: showThemePicker ? theme.primary : "rgba(0,0,0,0.08)",
                color: showThemePicker ? "#fff" : theme.primary,
              }}
              title="Change chat theme"
            >
              <Palette size={20} />
            </motion.button>
            {showThemePicker && (
              <ThemeSelector
                currentTheme={activeThemeName}
                onSelect={handleThemeSelect}
                onClose={() => setShowThemePicker(false)}
              />
            )}
          </div>

          {!selectedChat.isGroup && (
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                const myName = getLoggedInUser()?.name || "Someone";
                setActiveVideoCall({ 
                  to: otherUser?._id || otherUser, 
                  fromName: myName, 
                  isIncoming: false,
                  callId: Date.now()
                });
              }}
              className="p-2 rounded-lg transition-all"
              style={{ color: theme.primary, background: "rgba(0,0,0,0.06)" }}
            >
              <VideoIcon size={20} />
            </motion.button>
          )}
          
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className={`p-2 rounded-lg transition-all ${showMenu ? 'bg-whatsapp-green text-whatsapp-bg-dark' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            <MoreHorizontal size={20} />
          </button>

          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute top-12 right-0 w-48 bg-whatsapp-sidebar-dark border border-white/10 rounded-xl shadow-2xl py-2 z-50 backdrop-blur-xl"
              >
                <button 
                  onClick={() => { setShowSearch(true); setShowMenu(false); }}
                  className="w-full px-4 py-2.5 flex items-center gap-3 text-left text-sm text-slate-300 hover:bg-white/5 hover:text-whatsapp-green transition-all"
                >
                  <SearchIcon size={16} /> Search Messages
                </button>
                <button 
                  onClick={() => { setShowParticipants(true); setShowMenu(false); }}
                  className="w-full px-4 py-2.5 flex items-center gap-3 text-left text-sm text-slate-300 hover:bg-white/5 hover:text-whatsapp-green transition-all"
                >
                  <Users size={16} /> View Participants
                </button>
                <button 
                  onClick={() => { setIsRenaming(true); setTempGroupName(displayName); setShowMenu(false); }}
                  className="w-full px-4 py-2.5 flex items-center gap-3 text-left text-sm text-slate-300 hover:bg-white/5 hover:text-whatsapp-green transition-all"
                >
                  <Edit2 size={16} /> Rename {selectedChat.isGroup ? "Group" : "Chat"}
                </button>
                
                {selectedChat.isGroup && (
                  <>
                    <button 
                      onClick={() => { 
                        const adminId = selectedChat.groupAdmin?._id?.toString() || selectedChat.groupAdmin?.toString();
                        if (adminId && adminId === myUserId?.toString()) {
                          setShowAddMember(true); 
                          setShowMenu(false); 
                        } else {
                          setAdminNotice("Only group admin can add members");
                          setShowMenu(false);
                          setTimeout(() => setAdminNotice(""), 3000);
                        }
                      }}
                      className="w-full px-4 py-2.5 flex items-center gap-3 text-left text-sm text-slate-300 hover:bg-white/5 hover:text-whatsapp-green transition-all"
                    >
                      <UserPlus size={16} /> Add Member
                    </button>
                    <button 
                      onClick={() => { 
                        const adminId = selectedChat.groupAdmin?._id?.toString() || selectedChat.groupAdmin?.toString();
                        if (adminId && adminId === myUserId?.toString()) {
                          setShowRemoveMember(true); 
                          setShowMenu(false); 
                        } else {
                          setAdminNotice("Only group admin can remove members");
                          setShowMenu(false);
                          setTimeout(() => setAdminNotice(""), 3000);
                        }
                      }}
                      className="w-full px-4 py-2.5 flex items-center gap-3 text-left text-sm text-slate-300 hover:bg-white/5 hover:text-rose-400 transition-all"
                    >
                      <UserMinus size={16} /> Remove Member
                    </button>
                  </>
                )}
                {!selectedChat?.isGroup && !savedContact && (
                  <button 
                    onClick={() => { setShowAddContact(true); setShowMenu(false); }}
                    className="w-full px-4 py-2.5 flex items-center gap-3 text-left text-sm text-slate-300 hover:bg-white/5 hover:text-whatsapp-green transition-all"
                  >
                    <UserPlus size={16} /> Add to Contacts
                  </button>
                )}
                <div className="h-px bg-white/5 my-1" />
                <button 
                  onClick={() => { setShowDeleted(!showDeleted); setShowMenu(false); }}
                  className={`w-full px-4 py-2.5 flex items-center gap-3 text-left text-sm transition-all ${showDeleted ? 'text-whatsapp-green bg-whatsapp-green/5' : 'text-slate-300 hover:bg-white/5 hover:text-whatsapp-green'}`}
                >
                  <Cpu size={16} /> {showDeleted ? "Hide Retracted" : "Reveal Hidden Messages"}
                </button>
                <div className="h-px bg-white/5 my-1" />
                <button 
                  onClick={() => { 
                    setIsCreatingGroup(true); 
                    setIsAddingContact(false);
                    setShowMenu(false); 
                  }}
                  className="w-full px-4 py-2.5 flex items-center gap-3 text-left text-sm text-slate-300 hover:bg-white/5 hover:text-whatsapp-green transition-all"
                >
                  <Users size={16} /> New Group
                </button>
                <div className="h-px bg-white/5 my-1" />
                <button 
                  onClick={() => { 
                    setIsAddingContact(true);
                    setIsCreatingGroup(false);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2.5 flex items-center gap-3 text-left text-sm text-slate-300 hover:bg-white/5 hover:text-whatsapp-green transition-all"
                >
                  <UserPlus size={16} /> Add Contact by Phone
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto pt-4 pb-20 custom-scrollbar relative">
        <AnimatePresence mode="popLayout">
          {messages && Array.isArray(messages) && messages.map((m, i) => {
            if (!m || !m._id) return null;
            return (
              <Message 
                key={m._id} 
                id={`msg-${m._id}`}
                message={m} 
                isOwn={(m.sender?._id || m.sender)?.toString() === myUserId?.toString()}
                onDeleteMe={(msgId) => socket.emit("delete-for-me", { messageId: msgId })}
                onDeleteEveryone={(msgId) => socket.emit("delete-for-everyone", { messageId: msgId, chatId: selectedChat?._id })}
                onShowMessageInfo={handleShowMessageInfo}
                searchQuery={searchQuery}
                isHighlighted={searchResults[currentSearchIndex] === i}
                theme={theme}
              />
            );
          })}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Footer Interface */}
      <footer
        className="p-4 border-t border-white/5 z-10 relative"
        style={{ background: "#111b21ea", backdropFilter: "blur(20px)" }}
      >
        <AnimatePresence mode="wait">
          {isVoiceRecording ? (
            <motion.div
              key="voice-recorder"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="w-full"
            >
              <VoiceRecorder 
                onSend={handleVoiceSend} 
                onCancel={() => setIsVoiceRecording(false)} 
              />
            </motion.div>
          ) : (
            <motion.div
              key="chat-input"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full"
            >
              <AnimatePresence>
                {selectedFile && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl mb-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-500/20 rounded-lg"><FilePlus className="text-emerald-400" size={16} /></div>
                      <span className="text-xs font-bold text-slate-300 truncate max-w-xs">{selectedFile.name}</span>
                    </div>
                    <button onClick={() => setSelectedFile(null)} className="p-1.5 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-all"><X size={16} /></button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center gap-3 relative">
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className={`p-2 rounded-xl transition-all ${showEmojiPicker ? 'bg-white/30 text-white' : 'text-white/80 hover:text-white hover:bg-white/20'}`}
                  >
                    <Smile size={22} />
                  </button>
                  <button 
                    onClick={() => fileInputRef.current.click()}
                    className="p-2 text-white/80 hover:text-white rounded-xl hover:bg-white/20 transition-all"
                  >
                    <Paperclip size={22} />
                  </button>
                </div>
                
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) setSelectedFile(file);
                  }}
                />

                <div className="flex-1 relative">
                  <input
                    value={text}
                    onChange={e => {
                      setText(e.target.value);
                      socket.emit("typing", selectedChat._id);
                      clearTimeout(typingTimeout.current);
                      typingTimeout.current = setTimeout(() => {
                        socket.emit("stop-typing", selectedChat._id);
                      }, 1500);
                    }}
                    onKeyDown={e => e.key === "Enter" && handleSend()}
                    placeholder="Express yourself..."
                    className="w-full rounded-2xl px-5 py-3 text-sm outline-none transition-all placeholder:text-white/50"
                    style={{
                      background: "rgba(255,255,255,0.2)",
                      border: "1.5px solid rgba(255,255,255,0.3)",
                      color: "#ffffff",
                    }}
                    onFocus={e => { e.target.style.borderColor = "rgba(255,255,255,0.7)"; }}
                    onBlur={e  => { e.target.style.borderColor = "rgba(255,255,255,0.3)"; }}
                  />
                </div>

                {text.trim() || selectedFile ? (
                  <motion.button 
                    key="send-btn"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSend}
                    className="p-3 rounded-2xl shadow-lg hover:brightness-110 active:brightness-90 transition-all text-blue-600"
                    style={{ background: "#ffffff", boxShadow: "0 4px 15px rgba(0,0,0,0.2)" }}
                  >
                    <Send size={22} />
                  </motion.button>
                ) : (
                  <motion.button 
                    key="mic-btn"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsVoiceRecording(true)}
                    className="p-3 rounded-2xl border transition-all"
                    style={{
                      background: "rgba(255,255,255,0.2)",
                      borderColor: "rgba(255,255,255,0.4)",
                      color: "#ffffff",
                    }}
                  >
                    <Mic size={22} />
                  </motion.button>
                )}

                {/* Emoji Picker Overlay */}
                <AnimatePresence>
                  {showEmojiPicker && (
                    <motion.div 
                      key="emoji-picker"
                      initial={{ opacity: 0, y: 20, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 20, scale: 0.9 }}
                      className="absolute bottom-20 left-0 glass-card p-4 border-white/20 shadow-2xl z-50 grid grid-cols-5 gap-3"
                    >
                      {["😊", "😂", "❤️", "👍", "🙏", "🔥", "😭", "😮", "🎉", "✨", "💯", "✅", "🙌", "💀", "🤣", "🤔", "😘", "😎", "👀", "👋"].map(emoji => (
                        <motion.span 
                          key={emoji} 
                          whileHover={{ scale: 1.3 }}
                          whileTap={{ scale: 0.8 }}
                          onClick={() => {
                            setText(prev => prev + emoji);
                            setShowEmojiPicker(false);
                          }}
                          className="text-2xl cursor-pointer p-1"
                        >
                          {emoji}
                        </motion.span>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </footer>

      {/* Overlays */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="absolute top-16 left-0 right-0 bg-whatsapp-sidebar-dark border-b border-white/5 px-6 py-3 flex items-center gap-4 z-40 overflow-hidden shadow-xl"
          >
            <div className="flex-1 relative">
              <SearchIcon className="absolute left-3 top-2.5 text-slate-500" size={16} />
              <input
                type="text"
                placeholder="Search in chat..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-black/20 border border-white/5 rounded-xl text-sm text-white outline-none focus:border-whatsapp-green"
                autoFocus
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-mono text-slate-500 mr-2 uppercase">
                {searchResults.length > 0 ? `${searchResults.length - currentSearchIndex} of ${searchResults.length}` : "No matches"}
              </span>
              <button 
                onClick={() => navigateSearch(1)} 
                disabled={searchResults.length === 0}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg disabled:opacity-30"
              >
                <ChevronUp size={18} />
              </button>
              <button 
                onClick={() => navigateSearch(-1)} 
                disabled={searchResults.length === 0}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg disabled:opacity-30"
              >
                <ChevronDown size={18} />
              </button>
              <div className="w-px h-5 bg-white/10 mx-1" />
              <button 
                onClick={() => { setShowSearch(false); setSearchQuery(""); setSearchResults([]); setCurrentSearchIndex(-1); }}
                className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddContact && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-20 left-6 right-6 p-4 glass-card border-whatsapp-green/30 flex flex-col md:flex-row items-center gap-4 z-50"
          >
            <div className="flex-1 w-full relative">
              <UserCheck className="absolute left-3 top-2.5 text-whatsapp-green" size={18} />
              <input 
                type="text" 
                placeholder="Saving contact as..." 
                value={newContactName}
                onChange={(e) => setNewContactName(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-black/40 border border-white/5 rounded-xl text-sm outline-none focus:border-whatsapp-green"
                autoFocus
              />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <button onClick={handleAddContact} className="flex-1 md:flex-none px-6 py-2 bg-whatsapp-green text-whatsapp-bg-dark font-bold text-xs uppercase rounded-xl">Save</button>
              <button onClick={() => setShowAddContact(false)} className="px-3 py-2 bg-white/5 text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"><X size={18} /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {adminNotice && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute top-20 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 px-6 py-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl backdrop-blur-xl shadow-2xl"
          >
            <AlertTriangle size={18} />
            <span className="text-sm font-bold">{adminNotice}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddMember && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-whatsapp-bg-dark/95 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          >
            <div className="glass-card w-full max-w-md p-6 flex flex-col max-h-[80vh]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <UserPlus size={20} className="text-whatsapp-green" />
                  Expand Your Circle
                </h3>
                <button onClick={() => setShowAddMember(false)} className="p-2 hover:bg-white/5 rounded-full text-slate-500 transition-all">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2">
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-whatsapp-green uppercase tracking-wider px-1">Quick Add by Phone</p>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Phone size={14} className="absolute left-3 top-3 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Phone (+91...)"
                        value={phoneToAdd}
                        onChange={(e) => setPhoneToAdd(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-black/20 border border-white/5 rounded-xl text-sm outline-none focus:border-whatsapp-green transition-all"
                      />
                    </div>
                    <button 
                      onClick={handleAddMemberByPhone}
                      disabled={isAddingByPhone || !phoneToAdd.trim()}
                      className="px-4 py-2 bg-whatsapp-green text-whatsapp-bg-dark font-bold rounded-xl text-xs hover:brightness-110 disabled:opacity-50 transition-all"
                    >
                      {isAddingByPhone ? <Loader2 size={16} className="animate-spin" /> : "Add"}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">Suggested from Chats</p>
                  {pastChatUsers.filter(u => !contacts.some(c => c.userId?.toString() === (u._id || u).toString())).length === 0 && (
                    <p className="text-[10px] text-slate-500 px-1 italic">No new suggestions from recent chats.</p>
                  )}
                  {pastChatUsers
                    .filter(u => !contacts.some(c => c.userId?.toString() === (u._id || u).toString()))
                    .map(user => {
                      const isAlreadyIn = Array.isArray(selectedChat.participants) && selectedChat.participants.some(p => (p?._id || p).toString() === (user._id || user).toString());
                      return (
                        <div key={user._id || user} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-whatsapp-green/30 transition-all">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-whatsapp-green/10 flex items-center justify-center text-[10px] font-bold text-whatsapp-green uppercase tracking-tighter">
                              {user.name?.[0] || user.phoneNumber?.slice(-2) || "?"}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white">{user.name || user.phoneNumber}</p>
                              <p className="text-[10px] text-slate-500 uppercase tracking-widest leading-none mt-1">{isAlreadyIn ? "In Group" : "Recent Chat"}</p>
                            </div>
                          </div>
                          {isAlreadyIn ? (
                            <div className="p-1.5 text-whatsapp-green/40">
                              <Check size={16} />
                            </div>
                          ) : (
                            <button 
                              onClick={() => handleAddMemberToGroup(user._id || user)}
                              className="p-2 bg-whatsapp-green/10 text-whatsapp-green rounded-lg hover:bg-whatsapp-green hover:text-whatsapp-bg-dark transition-all"
                            >
                              <Plus size={16} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">Your Contacts</p>
                  {contacts.filter(c => c.userId?.toString() !== myUserId?.toString()).length === 0 && <p className="text-center text-slate-500 py-6 text-[10px] italic">No contacts available.</p>}
                  {contacts.filter(c => c.userId?.toString() !== myUserId?.toString()).map(contact => {
                    const isAlreadyIn = Array.isArray(selectedChat.participants) && selectedChat.participants.some(p => (p?._id || p).toString() === contact.userId?.toString());
                    return (
                      <div key={contact.userId} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-whatsapp-green/30 transition-all">
                        <div>
                          <p className="text-sm font-bold text-white">{contact.savedName}</p>
                          <p className="text-[10px] text-slate-500 uppercase tracking-widest leading-none mt-1">{isAlreadyIn ? "In Group" : "Connect"}</p>
                        </div>
                        {isAlreadyIn ? (
                          <div className="p-1.5 text-whatsapp-green/40">
                            <Check size={16} />
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleAddMemberToGroup(contact.userId)}
                            className="p-2 bg-whatsapp-green/10 text-whatsapp-green rounded-lg hover:bg-whatsapp-green hover:text-whatsapp-bg-dark transition-all"
                          >
                            <Plus size={16} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRemoveMember && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-whatsapp-bg-dark/95 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          >
            <div className="glass-card w-full max-w-md p-6 flex flex-col max-h-[80vh]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-rose-400 flex items-center gap-2">
                  <UserMinus size={20} />
                  Manage Collective
                </h3>
                <button onClick={() => setShowRemoveMember(false)} className="p-2 hover:bg-white/5 rounded-full text-slate-500 transition-all">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
                {Array.isArray(selectedChat.participants) && selectedChat.participants.filter(p => p && (p._id || p).toString() !== myUserId?.toString()).map(p => (
                  <div key={p._id || p} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-rose-500/30 transition-all">
                    <div>
                      <p className="text-sm font-bold text-white">{p.name || "Member"}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest">{p.phoneNumber || "Participant"}</p>
                    </div>
                    <button 
                      onClick={() => handleRemoveMemberFromGroup(p._id || p)}
                      className="px-4 py-1.5 bg-rose-500 text-white text-xs font-bold rounded-lg hover:bg-rose-600 active:scale-95 transition-all"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showParticipants && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-whatsapp-bg-dark/95 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          >
            <div className="glass-card w-full max-w-md p-6 flex flex-col max-h-[80vh]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Info size={20} className="text-whatsapp-green" />
                  Chat Participants
                </h3>
                <button onClick={() => setShowParticipants(false)} className="p-2 hover:bg-white/5 rounded-full text-slate-500 transition-all">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
                {Array.isArray(selectedChat.participants) && selectedChat.participants.map(p => {
                  const participantId = p?._id?.toString() || p?.toString();
                  const adminId = selectedChat.groupAdmin?._id?.toString() || selectedChat.groupAdmin?.toString();
                  const isAdmin = selectedChat.isGroup && adminId && participantId && adminId === participantId;
                  return (
                    <div key={p._id || p} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-whatsapp-green/10 flex items-center justify-center font-bold text-whatsapp-green">
                          {(p.name?.[0] || "?").toUpperCase()}
                        </div>
                          <div>
                            <p className="text-sm font-bold text-white flex items-center gap-2">
                              {p.name || "Member"}
                              {(p._id || p).toString() === myUserId?.toString() && <span className="text-[10px] text-slate-500 font-normal opacity-70">(You)</span>}
                              {isAdmin && <span className="text-[10px] text-whatsapp-green font-semibold bg-whatsapp-green/10 px-1.5 py-0.5 rounded border border-whatsapp-green/20">(Admin)</span>}
                            </p>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest leading-none mt-0.5">{p.phoneNumber || "Participant"}</p>
                          </div>
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-whatsapp-green/10 text-whatsapp-green text-[10px] font-black uppercase rounded-lg border border-whatsapp-green/20">
                          <Shield size={10} />
                          Admin
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message Info Modal */}
      <AnimatePresence>
        {showMessageInfo && selectedMessageForInfo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-whatsapp-bg-dark/95 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={() => setShowMessageInfo(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card w-full max-w-md p-6 flex flex-col max-h-[80vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Info size={20} className="text-whatsapp-green" />
                  Message Info
                </h3>
                <button onClick={() => setShowMessageInfo(false)} className="p-2 hover:bg-white/5 rounded-full text-slate-500 transition-all">
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2">
                {/* Message Content */}
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                  <p className="text-xs text-slate-500 uppercase tracking-widest mb-2 font-bold">Message</p>
                  <p className="text-sm text-white break-words">{selectedMessageForInfo.content}</p>
                </div>

                {/* Sent Time */}
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                  <p className="text-xs text-slate-500 uppercase tracking-widest mb-2 font-bold">Sent</p>
                  <p className="text-sm text-white">
                    {new Date(selectedMessageForInfo.createdAt).toLocaleString([], { 
                      month: 'short', 
                      day: 'numeric', 
                      hour: '2-digit', 
                      minute: '2-digit'
                    })}
                  </p>
                </div>

                {/* Delivery Status */}
                {(selectedMessageForInfo.sender?._id || selectedMessageForInfo.sender)?.toString() === myUserId?.toString() && (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Delivery Status</p>
                    <div className="space-y-2">
                      {/* Show for each participant */}
                      {selectedChat.isGroup ? (
                        selectedChat.participants.map(participant => {
                          const participantId = participant?._id?.toString() || participant?.toString();
                          if (participantId === myUserId?.toString()) return null;
                          
                          // Find read receipt for this participant
                          const readReceipt = selectedMessageForInfo.seenBy && 
                            selectedMessageForInfo.seenBy.find(receipt => 
                              receipt?.userId?._id?.toString?.() === participantId || 
                              receipt?.userId?.toString?.() === participantId || 
                              receipt === participantId
                            );
                          
                          const formatTimestamp = (dateStr) => {
                            if (!dateStr) return new Date(selectedMessageForInfo.deliveredAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                            return new Date(dateStr).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                          };
                          
                          return (
                            <div key={participantId} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/8 transition-all">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-whatsapp-green/10 flex items-center justify-center font-bold text-whatsapp-green text-xs">
                                  {(participant.name?.[0] || "?").toUpperCase()}
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-white">{participant.name || "Member"}</p>
                                  <p className="text-xs text-slate-500">{participant.phoneNumber || "Unknown"}</p>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                {readReceipt && readReceipt.readAt ? (
                                  <>
                                    <span className="flex items-center gap-1.5 px-3 py-1 bg-sky-500/10 border border-sky-500/30 rounded-full text-xs font-bold text-sky-400">
                                      <CheckCheck size={12} />
                                      Read
                                    </span>
                                    <p className="text-[10px] text-slate-500">{formatTimestamp(readReceipt.readAt)}</p>
                                  </>
                                ) : (
                                  <>
                                    <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-500/10 border border-slate-500/30 rounded-full text-xs font-bold text-slate-400">
                                      <Check size={12} />
                                      Delivered
                                    </span>
                                    <p className="text-[10px] text-slate-500">{formatTimestamp(selectedMessageForInfo.deliveredAt)}</p>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        // 1:1 Chat
                        selectedChat.participants.map(participant => {
                          const participantId = participant?._id?.toString() || participant?.toString();
                          if (participantId === myUserId?.toString()) return null;
                          
                          // Find read receipt for this participant
                          const readReceipt = selectedMessageForInfo.seenBy && 
                            selectedMessageForInfo.seenBy.find(receipt => 
                              receipt?.userId?._id?.toString?.() === participantId || 
                              receipt?.userId?.toString?.() === participantId || 
                              receipt === participantId
                            );
                          
                          const formatTimestamp = (dateStr) => {
                            if (!dateStr) return new Date(selectedMessageForInfo.deliveredAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                            return new Date(dateStr).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                          };
                          
                          return (
                            <div key={participantId} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/8 transition-all">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-whatsapp-green/10 flex items-center justify-center font-bold text-whatsapp-green text-xs">
                                  {(participant.name?.[0] || "?").toUpperCase()}
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-white">{savedContact?.savedName || participant.name || "Unknown"}</p>
                                  <p className="text-xs text-slate-500">{participant.phoneNumber || "Contact"}</p>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                {readReceipt && readReceipt.readAt ? (
                                  <>
                                    <span className="flex items-center gap-1.5 px-3 py-1 bg-sky-500/10 border border-sky-500/30 rounded-full text-xs font-bold text-sky-400">
                                      <CheckCheck size={12} />
                                      Read
                                    </span>
                                    <p className="text-[10px] text-slate-500">{formatTimestamp(readReceipt.readAt)}</p>
                                  </>
                                ) : (
                                  <>
                                    <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-500/10 border border-slate-500/30 rounded-full text-xs font-bold text-slate-400">
                                      <Check size={12} />
                                      Delivered
                                    </span>
                                    <p className="text-[10px] text-slate-500">{formatTimestamp(selectedMessageForInfo.deliveredAt)}</p>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

