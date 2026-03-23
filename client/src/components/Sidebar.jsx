import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, Users, X, Check, Loader2, MessageSquare, Phone, LogOut, User } from "lucide-react";
import api from "../services/api";
import { getLoggedInUser } from "../utils/auth";
import { hydrateChatPreview } from "../services/e2ee";
import { useChatTheme, THEMES } from "../hooks/useChatTheme";

void motion;
export default function Sidebar({ 
  chats, 
  setChats, 
  setSelectedChat, 
  selectedChat, 
  onlineUsers = [], 
  contacts = [],
  isAddingContact,
  setIsAddingContact,
  isCreatingGroup,
  setIsCreatingGroup,
  setIsShowingSettings
}) {
  const [themeName] = useChatTheme();
  const theme = THEMES[themeName] || THEMES.neon;
  const myUserId = getLoggedInUser()?._id;
  const [search, setSearch] = useState("");
  
  // States
  const [contactPhone, setContactPhone] = useState("");
  const [contactLoading, setContactLoading] = useState(false);
  const [contactError, setContactError] = useState("");
  const [groupName, setGroupName] = useState("");
  const [selectedGroupUsers, setSelectedGroupUsers] = useState([]);

  const handleLogout = () => {
    localStorage.removeItem("session-active");
    window.location.reload();
  };


  useEffect(() => {
    api.get("/chat/my-chats")
      .then(async (res) => {
        const hydratedChats = await Promise.all(
          res.data.map((chat) => hydrateChatPreview(chat, myUserId))
        );
        setChats(hydratedChats);
      })
      .catch(console.error);
  }, [setChats, myUserId]);

  const handleStartChat = async () => {
    if (!contactPhone.trim()) return setContactError("Please enter a phone number");
    setContactLoading(true);
    try {
      const res = await api.post("/chat/start", { phone: contactPhone });
      const newChat = res.data.chat;
      setChats(prev => {
        if (prev.some(c => (c._id || c.id)?.toString() === (newChat._id || newChat.id)?.toString())) return prev;
        return [newChat, ...prev];
      });
      setSelectedChat(newChat);
      setIsAddingContact(false);
      setContactPhone("");
    } catch (err) {
      setContactError(err.response?.data?.message || "User not found");
    } finally {
      setContactLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedGroupUsers.length === 0) return;
    setContactLoading(true);
    try {
      const res = await api.post("/chat/create-group", { name: groupName.trim(), users: selectedGroupUsers });
      const newGroup = res.data;
      setChats(prev => {
        if (prev.some(c => (c._id || c.id)?.toString() === (newGroup._id || newGroup.id)?.toString())) return prev;
        return [newGroup, ...prev];
      });
      setSelectedChat(newGroup);
      setIsCreatingGroup(false);
      setGroupName("");
      setSelectedGroupUsers([]);
      setContactError("");
    } catch (err) {
      setContactError("Failed to create group.");
    } finally {
      setContactLoading(false);
    }
  };

  const pastChatUsers = Array.from(new Map(
    chats
      .filter(c => !c.isGroup)
      .map(c => {
        const u = c.participants.find(p => p && (p._id?.toString() || p.toString()) !== myUserId?.toString());
        return u ? [u._id, u] : null;
      })
      .filter(Boolean)
  ).values());

  const filteredChats = chats.filter(chat => {
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    if (chat.isGroup) return chat.groupName?.toLowerCase().includes(query);
    const otherUser = chat.participants.find(u => u && (u._id?.toString() || u.toString()) !== myUserId?.toString());
    if (!otherUser) return false;
    const savedContact = contacts.find(c => c && c.userId?.toString() === otherUser?._id?.toString());
    const nameToSearch = savedContact ? savedContact.savedName : otherUser.phoneNumber;
    return nameToSearch?.toLowerCase().includes(query);
  });

  return (
    <div className="w-[380px] h-full flex flex-col bg-[#10131a] border-r border-[#45484f]/15" style={{ background: theme.background }}>
      {/* Header */}
      <div className="p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <MessageSquare style={{ color: theme.primary }} size={24} />
            Messages
          </h2>
          <div className="flex gap-2">
            <motion.button 
              whileHover={{ scale: 1.1, backgroundColor: `${theme.primary}1a`, color: theme.primary }}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                setIsShowingSettings(true);
                setIsCreatingGroup(false);
                setIsAddingContact(false);
                setContactError("");
              }}
              className="p-2 rounded-full transition-colors bg-white/5 text-slate-400"
              title="Identity & Settings"
            >
              <User size={20} />
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                setIsAddingContact(!isAddingContact);
                setIsCreatingGroup(false);
                setContactError("");
              }}
              className={`p-2 rounded-full transition-colors ${isAddingContact ? 'text-[#0b0e14]' : 'bg-white/5 text-slate-400 hover:text-white'}`}
              style={{ backgroundColor: isAddingContact ? theme.primary : undefined }}
            >
              {isAddingContact ? <X size={20} /> : <Plus size={20} />}
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                setIsCreatingGroup(!isCreatingGroup);
                setIsAddingContact(false);
                setGroupName("");
                setSelectedGroupUsers([]);
                setContactError("");
              }}
              className={`p-2 rounded-full transition-colors ${isCreatingGroup ? 'text-[#0b0e14]' : 'bg-white/5 text-slate-400 hover:text-white'}`}
              style={{ backgroundColor: isCreatingGroup ? theme.primary : undefined }}
            >
              {isCreatingGroup ? <X size={20} /> : <Users size={20} />}
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleLogout}
              className="p-2 rounded-full transition-colors bg-white/5 text-rose-400 hover:text-rose-500 hover:bg-rose-500/10"
              title="Log Out"
            >
              <LogOut size={20} />
            </motion.button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-slate-500" size={18} />
          <input
            type="text"
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ borderColor: `${theme.primary}1a` }}
            className="w-full pl-10 pr-4 py-2 bg-[#0b0e14] border rounded-xl text-sm focus:ring-1 outline-none transition-all placeholder:text-slate-600 text-white"
          />
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence mode="wait">
        {(isAddingContact || isCreatingGroup) && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 overflow-hidden"
          >
            <div className="p-4 bg-[#0b0e14] border rounded-2xl mb-4 space-y-3" style={{ borderColor: `${theme.primary}33` }}>
              {isAddingContact && (
                <>
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.primary }}>Start Private Chat</p>
                  <input
                    type="text"
                    placeholder="Phone (+91...)"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-lg text-sm outline-none text-white"
                  />
                  <button onClick={handleStartChat} disabled={contactLoading} className="w-full py-2 font-bold rounded-lg text-sm" style={{ backgroundColor: theme.primary }}>
                    {contactLoading ? "Initializing..." : "Initialize Chat"}
                  </button>
                </>
              )}
              {isCreatingGroup && (
                <>
                  <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: theme.primary }}>New Group Collective</p>
                  <input
                    type="text"
                    placeholder="Collective Name"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-lg text-sm outline-none text-white mb-2 focus:border-[#c59aff]/30 transition-all font-inter"
                  />
                  
                  {/* Participant Selection */}
                  <div className="max-h-40 overflow-y-auto space-y-1 mb-4 custom-scrollbar pr-1">
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1 px-1">Select Members ({selectedGroupUsers.length})</p>
                    {pastChatUsers.map(user => {
                      const isSelected = selectedGroupUsers.includes(user._id);
                      const saved = contacts.find(c => c && c.userId?.toString() === user._id?.toString());
                      const name = saved ? saved.savedName : (user.name || user.phoneNumber || "User");
                      
                      return (
                        <motion.div 
                          whileTap={{ scale: 0.98 }}
                          key={user._id}
                          onClick={() => {
                            if (isSelected) setSelectedGroupUsers(prev => prev.filter(id => id !== user._id));
                            else setSelectedGroupUsers(prev => [...prev, user._id]);
                          }}
                          className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all border ${isSelected ? 'bg-white/10 border-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.2)]' : 'hover:bg-white/5 border-transparent'}`}
                        >
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-emerald-500 border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'border-white/20'}`}>
                            {isSelected && <Check size={12} className="text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className={`text-xs font-medium truncate block ${isSelected ? 'text-white' : 'text-white/60'}`}>{name}</span>
                          </div>
                        </motion.div>
                      );
                    })}
                    {pastChatUsers.length === 0 && (
                      <p className="text-[10px] text-slate-600 italic px-2">No contacts found to form a collective.</p>
                    )}
                  </div>

                  <button 
                    onClick={handleCreateGroup} 
                    disabled={contactLoading || !groupName.trim() || selectedGroupUsers.length === 0} 
                    className="w-full py-2.5 font-bold rounded-xl text-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-[0.98] shadow-lg shadow-black/20" 
                    style={{ backgroundColor: theme.primary, color: '#0b0e14' }}
                  >
                    {contactLoading ? "Synchronizing Collective..." : "Initialize Group"}
                  </button>
                </>
              )}
              {contactError && <p className="text-rose-400 text-[10px]">{contactError}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-1 custom-scrollbar">
        {filteredChats.map((chat, index) => {
          const isSelected = selectedChat?._id === chat._id;
          let displayName = chat.isGroup ? (chat.groupName || "Unnamed Group") : "Unknown User";
          const otherUser = chat.participants?.find(u => u && (u._id?.toString() || u.toString()) !== myUserId?.toString());
          if (!chat.isGroup && otherUser) {
            const saved = contacts.find(c => c && c.userId?.toString() === otherUser?._id?.toString());
            displayName = saved ? saved.savedName : (otherUser.phoneNumber || "User");
          }

          return (
            <div
              key={chat._id}
              onClick={() => { setSelectedChat(chat); setChats(prev => prev.map(c => c._id === chat._id ? { ...c, unreadCount: 0 } : c)); }}
              className={`group p-3 mb-1 cursor-pointer transition-all duration-300 border-l-[3px] ${isSelected ? 'bg-white/10' : 'hover:bg-white/5 border-transparent'}`}
              style={{ borderLeftColor: isSelected ? theme.primary : 'transparent' }}
            >
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${isSelected ? 'shadow-[0_0_15px]' : 'bg-white/10 text-white/80'}`} 
                     style={{ backgroundColor: isSelected ? theme.primary : undefined, 
                              color: isSelected ? '#0b0e14' : undefined,
                              boxShadow: isSelected ? `0 0 15px ${theme.primary}66` : undefined }}>
                  {chat.isGroup ? <Users size={20} /> : (
                    otherUser?.avatar ? (
                      <img 
                        src={`http://localhost:5002${otherUser.avatar}`} 
                        alt={displayName} 
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : displayName?.[0]?.toUpperCase() || "?"
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h4 className="text-sm font-bold truncate text-white">{displayName}</h4>
                    {chat.unreadCount > 0 && <span className="min-w-[18px] px-2 py-0.5 text-[10px] font-bold text-white bg-emerald-500 rounded-full">{chat.unreadCount}</span>}
                  </div>
                  <p className="text-xs truncate text-slate-500">
                    {(() => {
                      const msg = chat.lastMessage;
                      if (!msg) return "Conversation start";
                      if (msg.isDeleted) return "Message retracted";
                      
                      // Check for media/files
                      if (msg.fileUrl || msg.fileType || msg.fileName) {
                        const isImage = msg.fileType?.startsWith("image/") || (msg.fileName && /\.(jpg|jpeg|png|gif|webp)$/i.test(msg.fileName));
                        if (isImage) return "Image";
                        return msg.fileName || "File Attachment";
                      }
                      
                      return msg.content || "Conversation start";
                    })()}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
