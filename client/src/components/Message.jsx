import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, CheckCheck, Trash2, ShieldAlert, FileText, ExternalLink, MoreVertical } from "lucide-react";
import { getLoggedInUser } from "../utils/auth";
import socket from "../services/socket";

export default function Message({ msg }) {
  const [showMenu, setShowMenu] = useState(false);
  const myId = getLoggedInUser()?._id;
  const isMe = (msg.sender?._id || msg.sender)?.toString() === myId?.toString();

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const handleDeleteForMe = () => {
    socket.emit("delete-for-me", { messageId: msg._id });
    setShowMenu(false);
  };

  const handleDeleteForEveryone = () => {
    if (window.confirm("Permanently delete this message for all participants?")) {
      socket.emit("delete-for-everyone", { messageId: msg._id, chatId: msg.chat });
    }
    setShowMenu(false);
  };

  const renderStatus = () => {
    if (!isMe || msg.isDeleted) return null;
    
    switch (msg.status) {
      case "seen":
        return <CheckCheck className="text-sky-400" size={14} />;
      case "delivered":
        return <CheckCheck className="text-slate-500" size={14} />;
      default:
        return <Check className="text-slate-500" size={14} />;
    }
  };

  const bubbleVariants = {
    hidden: { opacity: 0, y: 10, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", damping: 20, stiffness: 300 } }
  };

  if (msg.isDeleted) {
    return (
      <motion.div 
        variants={bubbleVariants}
        initial="hidden"
        animate="visible"
        className={`flex ${isMe ? "justify-end" : "justify-start"} mb-2 px-4`}
      >
        <div className={`px-4 py-2 rounded-2xl text-xs flex items-center gap-2 border italic ${isMe ? "bg-white/5 border-white/10 text-slate-500" : "bg-white/5 border-white/10 text-slate-500"}`}>
          <ShieldAlert size={14} />
          This message was retracted
          <span className="ml-2 text-[10px] opacity-60">{formatTime(msg.createdAt)}</span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      variants={bubbleVariants}
      initial="hidden"
      animate="visible"
      className={`group flex ${isMe ? "justify-end" : "justify-start"} mb-3 px-4 relative`}
    >
      <div 
        className={`max-w-[75%] rounded-2xl px-4 py-2 shadow-sm transition-all relative ${
          isMe 
            ? "bg-whatsapp-green text-whatsapp-bg-dark rounded-tr-none" 
            : "bg-white/10 text-slate-200 rounded-tl-none border border-white/5"
        }`}
        onContextMenu={(e) => {
          e.preventDefault();
          setShowMenu(true);
        }}
      >
        {/* Attachment Logic */}
        {msg.fileUrl ? (
          <div className="space-y-2 mb-1">
            {msg.fileType?.startsWith("image/") ? (
              <div className="relative overflow-hidden rounded-xl border border-black/10">
                <img 
                  src={`http://localhost:5002${msg.fileUrl}`} 
                  alt={msg.fileName} 
                  className="max-h-72 w-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                  onClick={() => window.open(`http://localhost:5002${msg.fileUrl}`, "_blank")}
                />
              </div>
            ) : (
              <a 
                href={`http://localhost:5002${msg.fileUrl}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                  isMe ? "bg-black/10 border-black/10 hover:bg-black/20" : "bg-white/5 border-white/10 hover:bg-white/10"
                }`}
              >
                <div className={`p-2 rounded-lg ${isMe ? "bg-whatsapp-bg-dark/10" : "bg-whatsapp-green/20"}`}>
                  <FileText className={isMe ? "text-whatsapp-bg-dark" : "text-whatsapp-green"} size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{msg.fileName}</p>
                  <p className="text-[10px] opacity-60 uppercase font-bold tracking-wider">File Attachment</p>
                </div>
                <ExternalLink size={14} className="opacity-40" />
              </a>
            )}
            {msg.content && msg.content !== msg.fileName && <p className="text-sm px-1 leading-relaxed">{msg.content}</p>}
          </div>
        ) : (
          <p className="text-[15px] leading-relaxed break-words">{msg.content}</p>
        )}

        <div className={`flex items-center justify-end gap-1.5 mt-1 ${isMe ? "opacity-70" : "opacity-50"}`}>
          <span className="text-[10px] font-bold uppercase tracking-tighter">
            {formatTime(msg.createdAt)}
          </span>
          {renderStatus()}
        </div>

        {/* Options Button */}
        <button 
          onClick={(e) => { e.stopPropagation(); setShowMenu(true); }}
          className={`absolute top-2 -right-8 p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:text-whatsapp-green ${isMe ? "text-slate-400" : "text-slate-500"}`}
        >
          <MoreVertical size={16} />
        </button>
      </div>

      {/* Context Menu Modal */}
      <AnimatePresence>
        {showMenu && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100]" 
              onClick={() => setShowMenu(false)} 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 10 }}
              className={`absolute bottom-full mb-2 z-[101] min-w-[160px] glass-card overflow-hidden py-1 border border-white/20 shadow-2xl ${isMe ? "right-4" : "left-4"}`}
            >
              <button 
                onClick={handleDeleteForMe}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
              >
                <Trash2 size={16} className="text-slate-500" />
                Remove for me
              </button>
              {isMe && (
                <button 
                  onClick={handleDeleteForEveryone}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
                >
                  <Trash2 size={16} className="text-rose-500" />
                  Discard for all
                </button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}


