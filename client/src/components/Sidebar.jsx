import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, Users, X, Check, Loader2, MessageSquare, Phone, LogOut, Cloud, Lock } from "lucide-react";
import api from "../services/api";
import { getLoggedInUser } from "../utils/auth";
import { hydrateChatPreview } from "../services/e2ee";

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
  setIsCreatingGroup
}) {
  const myUserId = getLoggedInUser()?._id;
  const [search, setSearch] = useState("");
  
  // Contact Discovery State (lifted partially)
  const [contactPhone, setContactPhone] = useState("");
  const [contactLoading, setContactLoading] = useState(false);
  const [contactError, setContactError] = useState("");

  // Group Creation State (lifted partially)
  const [groupName, setGroupName] = useState("");
  const [selectedGroupUsers, setSelectedGroupUsers] = useState([]);

  // Backup State
  const [isSettingBackupPin, setIsSettingBackupPin] = useState(false);
  const [backupPin, setBackupPin] = useState("");
  const [backupStatus, setBackupStatus] = useState("");

  const handleLogout = () => {
    localStorage.clear();
    window.location.reload();
  };

  const handleBackupKey = async () => {
    if (!backupPin || backupPin.length < 4) {
      setBackupStatus("PIN must be at least 4 digits");
      return;
    }
    setContactLoading(true);
    setBackupStatus("");
    try {
      const { backupPrivateKeyToCloud } = await import("../services/e2ee");
      await backupPrivateKeyToCloud(api, myUserId, backupPin);
      setBackupStatus("Success: Backup saved securely!");
      setBackupPin("");
      setTimeout(() => { setIsSettingBackupPin(false); setBackupStatus(""); }, 2000);
    } catch (err) {
      console.error("Backup error:", err);
      setBackupStatus(err.message || "Failed to save backup");
    } finally {
      setContactLoading(false);
    }
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
    if (!contactPhone.trim()) {
      return setContactError("Please enter a phone number");
    }
    
    setContactLoading(true);
    setContactError("");

    try {
      const res = await api.post("/chat/start", { phone: contactPhone });
      const newChat = res.data.chat;

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

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedGroupUsers.length === 0) return;
    setContactLoading(true);
    setContactError("");
    try {
      const res = await api.post("/chat/create-group", {
        name: groupName.trim(),
        users: selectedGroupUsers
      });
      const newGroup = res.data;
      setChats(prev => [newGroup, ...prev]);
      setSelectedChat(newGroup);
      setIsCreatingGroup(false);
      setGroupName("");
      setSelectedGroupUsers([]);
    } catch (err) {
      console.error("Error creating group:", err);
      setContactError("Failed to create group.");
    } finally {
      setContactLoading(false);
    }
  };

  const pastChatUsers = Array.from(new Map(
    chats
      .filter(c => !c.isGroup)
      .map(c => {
        const u = c.participants.find(p => (p._id?.toString() || p.toString()) !== myUserId?.toString());
        return u ? [u._id, u] : null;
      })
      .filter(Boolean)
  ).values());

  const filteredChats = chats.filter(chat => {
    if (!search.trim()) return true;
    const query = search.toLowerCase();

    if (chat.isGroup) {
      return chat.groupName?.toLowerCase().includes(query);
    }

    const otherUser = chat.participants.find(
      u => (u._id?.toString() || u.toString()) !== myUserId?.toString()
    );
    if (!otherUser) return false;

    const savedContact = contacts.find(c => c.userId?.toString() === otherUser?._id?.toString());
    const nameToSearch = savedContact ? savedContact.savedName : otherUser.phoneNumber;
    
    return nameToSearch?.toLowerCase().includes(query);
  });

  return (
    <div className="w-[380px] h-full flex flex-col bg-whatsapp-sidebar-dark border-r border-white/5">
      {/* Header */}
      <div className="p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="text-whatsapp-green" size={24} />
            Messages
          </h2>
          <div className="flex gap-2">
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                setIsSettingBackupPin(!isSettingBackupPin);
                setIsCreatingGroup(false);
                setIsAddingContact(false);
                setContactError("");
                setBackupStatus("");
              }}
              className={`p-2 rounded-full transition-colors ${isSettingBackupPin ? 'bg-whatsapp-green text-whatsapp-bg-dark' : 'bg-white/5 text-slate-400 hover:text-white'}`}
              title="Cloud Backup"
            >
              {isSettingBackupPin ? <X size={20} /> : <Cloud size={20} />}
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                setIsAddingContact(!isAddingContact);
                setIsCreatingGroup(false);
                setIsSettingBackupPin(false);
                setContactError("");
              }}
              className={`p-2 rounded-full transition-colors ${isAddingContact ? 'bg-whatsapp-green text-whatsapp-bg-dark' : 'bg-white/5 text-slate-400 hover:text-white'}`}
            >
              {isAddingContact ? <X size={20} /> : <Plus size={20} />}
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                setIsCreatingGroup(!isCreatingGroup);
                setIsAddingContact(false);
                setIsSettingBackupPin(false);
                setGroupName("");
                setSelectedGroupUsers([]);
                setContactError("");
              }}
              className={`p-2 rounded-full transition-colors ${isCreatingGroup ? 'bg-whatsapp-green text-whatsapp-bg-dark' : 'bg-white/5 text-slate-400 hover:text-white'}`}
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
            name="searchChats"
            autoComplete="off"
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-whatsapp-bg-dark border border-white/5 rounded-xl text-sm focus:border-whatsapp-green focus:ring-1 focus:ring-whatsapp-green outline-none transition-all placeholder:text-slate-600"
          />
        </div>
      </div>

      {/* Modals / Action Panels */}
      <AnimatePresence mode="wait">
        {isAddingContact && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 overflow-hidden"
          >
            <div className="p-4 bg-whatsapp-bg-dark border border-whatsapp-green/20 rounded-2xl mb-4 space-y-3">
              <p className="text-xs font-bold text-whatsapp-green uppercase tracking-wider">Start Private Chat</p>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 text-slate-500" size={16} />
                <input
                  type="text"
                  name="contactPhone"
                  autoComplete="off"
                  placeholder="Phone (+91...)"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-black/20 border border-white/5 rounded-lg text-sm outline-none focus:border-whatsapp-green transition-all"
                />
              </div>
              {contactError && <p className="text-rose-400 text-[10px] font-medium animate-pulse">{contactError}</p>}
              <button
                onClick={handleStartChat}
                disabled={contactLoading}
                className="w-full py-2 bg-whatsapp-green text-whatsapp-bg-dark font-bold rounded-lg text-sm interactive-btn flex items-center justify-center gap-2"
              >
                {contactLoading ? <Loader2 className="animate-spin" size={16} /> : "Initialize Chat"}
              </button>
            </div>
          </motion.div>
        )}

        {isCreatingGroup && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 overflow-hidden"
          >
            <div className="p-4 bg-whatsapp-bg-dark border border-whatsapp-green/20 rounded-2xl mb-4 space-y-3">
              <p className="text-xs font-bold text-whatsapp-green uppercase tracking-wider">New Group Collective</p>
              <input
                type="text"
                name="groupName"
                autoComplete="off"
                placeholder="Name your group"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full px-4 py-2 bg-black/20 border border-white/5 rounded-lg text-sm outline-none focus:border-whatsapp-green transition-all"
              />
              <div className="max-h-32 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                {pastChatUsers.map(user => {
                  const savedContact = contacts.find(c => c.userId?.toString() === user._id?.toString());
                  const displayName = savedContact ? savedContact.savedName : (user.phoneNumber || user.name || "Unknown");
                  const isSelected = selectedGroupUsers.includes(user._id);

                  return (
                    <div 
                      key={user._id} 
                      onClick={() => setSelectedGroupUsers(p => isSelected ? p.filter(id => id !== user._id) : [...p, user._id])}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-whatsapp-green/10' : 'hover:bg-white/5'}`}
                    >
                      <span className={`text-sm ${isSelected ? 'text-whatsapp-green' : 'text-slate-300'}`}>{displayName}</span>
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${isSelected ? 'bg-whatsapp-green border-whatsapp-green' : 'border-slate-600'}`}>
                        {isSelected && <Check size={12} className="text-whatsapp-bg-dark" />}
                      </div>
                    </div>
                  );
                })}
              </div>
              <button
                onClick={handleCreateGroup}
                disabled={contactLoading || !groupName.trim() || selectedGroupUsers.length === 0}
                className="w-full py-2 bg-whatsapp-green text-whatsapp-bg-dark font-bold rounded-lg text-sm interactive-btn disabled:opacity-50"
              >
                {contactLoading ? "Creating..." : "Launch Group"}
              </button>
            </div>
          </motion.div>
        )}

        {isSettingBackupPin && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 overflow-hidden"
          >
            <div className="p-4 bg-whatsapp-bg-dark border border-whatsapp-green/20 rounded-2xl mb-4 space-y-3">
              <p className="text-xs font-bold text-whatsapp-green uppercase tracking-wider">Cloud Key Backup</p>
              <p className="text-xs text-slate-400 leading-tight">Create a Backup PIN to save your encryption key securely in the cloud.</p>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 text-slate-500" size={16} />
                <input
                  type="password"
                  name="backupPin"
                  autoComplete="new-password"
                  placeholder="Create a Backup PIN"
                  value={backupPin}
                  onChange={(e) => setBackupPin(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-black/20 border border-white/5 rounded-lg text-sm outline-none focus:border-whatsapp-green transition-all"
                />
              </div>
              {backupStatus && <p className={`text-[10px] font-medium leading-tight ${backupStatus.startsWith("Success") ? "text-whatsapp-green" : "text-rose-400 animate-pulse"}`}>{backupStatus}</p>}
              <button
                onClick={handleBackupKey}
                disabled={contactLoading || !backupPin}
                className="w-full py-2 bg-whatsapp-green text-whatsapp-bg-dark font-bold rounded-lg text-sm interactive-btn disabled:opacity-50"
              >
                {contactLoading ? "Saving..." : "Save Backup"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-1 custom-scrollbar">
        {filteredChats.map((chat, index) => {
          const otherUser = (chat.participants || []).find(u => u && (u._id?.toString() || u.toString()) !== myUserId?.toString());
          const isSelected = selectedChat?._id === chat._id;
          const isOnline = !chat.isGroup && otherUser && onlineUsers.includes(otherUser._id || otherUser);

          let displayName = chat.isGroup ? (chat.groupName || "Unnamed Group") : "Unknown";
          if (!chat.isGroup && otherUser) {
            const savedContact = contacts.find(c => c && c.userId?.toString() === (otherUser._id || otherUser).toString());
            displayName = savedContact ? savedContact.savedName : (otherUser.phoneNumber || otherUser.name || "Unknown User");
          }
          displayName = displayName || "Unknown";

          return (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              key={chat._id}
              onClick={() => setSelectedChat(chat)}
              className={`group p-3 rounded-2xl cursor-pointer transition-all duration-300 ${isSelected ? 'bg-whatsapp-green shadow-lg shadow-whatsapp-green/20' : 'hover:bg-white/5'}`}
            >
              <div className="flex items-center gap-3">
                <div className="relative flex-shrink-0">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${isSelected ? 'bg-whatsapp-bg-dark text-whatsapp-green' : 'bg-whatsapp-green/10 text-whatsapp-green'}`}>
                    {chat.isGroup ? <Users size={20} /> : (displayName?.[0]?.toUpperCase() || "?")}
                  </div>
                  {!chat.isGroup && isOnline && (
                    <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 border-2 border-whatsapp-sidebar-dark rounded-full ${isSelected ? 'bg-whatsapp-bg-dark' : 'bg-whatsapp-green animate-pulse'}`} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h4 className={`text-sm font-bold truncate ${isSelected ? 'text-whatsapp-bg-dark' : 'text-slate-200'}`}>{displayName}</h4>
                    <span className={`text-[10px] font-medium ${isSelected ? 'text-whatsapp-bg-dark/60' : 'text-slate-500'}`}>
                      {chat.updatedAt ? new Date(chat.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                    </span>
                  </div>
                  <p className={`text-xs truncate ${isSelected ? 'text-whatsapp-bg-dark/70 font-medium' : 'text-slate-500'}`}>
                    {chat.lastMessage?.content
                      || chat.lastMessage?.fileName
                      || (chat.lastMessage?.fileUrl ? "Attachment" : "No dialogue yet")}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
