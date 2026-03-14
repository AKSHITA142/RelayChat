import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Edit2
} from "lucide-react";
import Message from "./Message";
import socket from "../services/socket";
import api from "../services/api";
import { getLoggedInUser } from "../utils/auth";

export default function ChatWindow({ selectedChat, onlineUsers = [], lastSeenMap = {}, contacts = [], setContacts, setChats }) {
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

  const otherUser = selectedChat?.participants?.find(
    u => (u._id?.toString() || u.toString()) !== myUserId?.toString()
  );

  const isOnline = onlineUsers.some(
    id => id.toString() === otherUser?._id?.toString()
  );
  
  const lastSeen = lastSeenMap[otherUser?._id];
  const lastSeenText = lastSeen
    ? `Available ${new Date(lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : "Offline";

  const savedContact = otherUser ? contacts.find(c => c.userId?.toString() === otherUser?._id?.toString()) : null;
  const displayName = selectedChat?.isGroup ? selectedChat.groupName : (savedContact ? savedContact.savedName : (otherUser?.phoneNumber || otherUser?.name || "Unknown"));

  const [showAddContact, setShowAddContact] = useState(false);
  const [newContactName, setNewContactName] = useState("");

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

  useEffect(() => {
    if (!selectedChat) return;
    api.get(`/message/${selectedChat._id}`)
      .then(res => {
        const sorted = res.data.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        setMessages(sorted);
      });
    socket.emit("join-chat", selectedChat._id);
    socket.emit("mark-seen", { chatId: selectedChat._id });
  }, [selectedChat]);

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
      if (msg.chat?.toString() !== selectedChat?._id?.toString()) return;
      setMessages(prev => [...prev, msg]);
      if ((msg.sender?._id || msg.sender)?.toString() !== myUserId?.toString()) {
        socket.emit("mark-seen", { chatId: selectedChat._id });
      }
    };

    const statusHandler = ({ messageId }) => {
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, status: "delivered" } : m));
    };

    const seenHandler = ({ chatId, userId }) => {
      if (chatId === selectedChat?._id && userId !== myUserId) {
        setMessages(prev => prev.map(m => m.status !== "seen" ? { ...m, status: "seen" } : m));
      }
    };

    const deleteForMeHandler = ({ messageId }) => {
      setMessages(prev => prev.filter(m => m._id !== messageId));
    };

    const deleteForEveryoneHandler = ({ messageId }) => {
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, content: "This message was deleted", isDeleted: true } : m));
    };

    socket.on("new-message", handler);
    socket.on("message-delivered", statusHandler);
    socket.on("message-seen", seenHandler);
    socket.on("message-deleted-for-me", deleteForMeHandler);
    socket.on("message-deleted-for-everyone", deleteForEveryoneHandler);

    return () => {
      socket.off("new-message", handler);
      socket.off("message-delivered", statusHandler);
      socket.off("message-seen", seenHandler);
      socket.off("message-deleted-for-me", deleteForMeHandler);
      socket.off("message-deleted-for-everyone", deleteForEveryoneHandler);
    };
  }, [selectedChat, myUserId]);

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
      setText("");
      if (fileInputRef.current) fileInputRef.current.value = "";
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
    <div className="flex-1 flex flex-col h-full bg-whatsapp-bg-dark relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] invert" />

      {/* Header */}
      <div className="h-16 px-6 bg-whatsapp-sidebar-dark/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold bg-whatsapp-green/10 text-whatsapp-green`}>
              {selectedChat.isGroup ? <Users size={20} /> : displayName[0]?.toUpperCase()}
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
                   `Joined • ${new Date(selectedChat.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`
                ) : isOnline ? "Active Now" : lastSeenText}
              </span>
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-3">
          <button className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-all">
            <MoreHorizontal size={20} />
          </button>
        </div>

        {/* Add Contact Panel Overlay */}
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
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto pt-4 pb-20 custom-scrollbar relative">
        <AnimatePresence mode="popLayout">
          {messages.map((m, i) => (
            <Message key={m._id} msg={m} />
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Footer Interface */}
      <div className="p-4 bg-whatsapp-bg-dark/80 backdrop-blur-xl border-t border-white/5 z-10">
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
              className={`p-2 rounded-xl transition-all ${showEmojiPicker ? 'bg-whatsapp-green text-whatsapp-bg-dark' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              <Smile size={22} />
            </button>
            <button 
              onClick={() => fileInputRef.current.click()}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-all"
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
              className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-3 text-sm text-slate-200 outline-none focus:border-whatsapp-green transition-all placeholder:text-slate-600"
            />
          </div>

          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSend}
            disabled={!text.trim() && !selectedFile}
            className={`p-3 rounded-2xl flex items-center justify-center transition-all ${text.trim() || selectedFile ? 'bg-whatsapp-green text-whatsapp-bg-dark shadow-lg shadow-whatsapp-green/20' : 'bg-white/5 text-slate-600 cursor-not-allowed'}`}
          >
            <Send size={22} />
          </motion.button>

          {/* Emoji Picker Overlay */}
          <AnimatePresence>
            {showEmojiPicker && (
              <motion.div 
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
      </div>
    </div>
  );
}

