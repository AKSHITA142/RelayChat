import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Check, 
  CheckCheck, 
  Trash2, 
  ShieldAlert, 
  FileText, 
  ExternalLink, 
  MoreVertical,
  Download,
  Clock,
  Mic
} from "lucide-react";
import ReactionPicker from "./ReactionPicker";
import WaveformPlayer from "./WaveformPlayer";
import { getLoggedInUser } from "../utils/auth";
import socket from "../services/socket";
import api from "../services/api"; // Added api import

export default function Message({ id, message, isOwn, onDeleteMe, onDeleteEveryone, chatType, searchQuery = "", isHighlighted = false, theme = null }) {
  // Fallback colours when no theme is supplied
  const ownBg     = theme?.bubbleOwn    || "#25D366";
  const otherBg   = theme?.bubbleOther  || "rgba(255,255,255,0.1)";
  const ownText   = theme?.textOwn      || "#0d1117";
  const otherText = theme?.textOther    || "#e2e8f0";
  const primary   = theme?.primary      || "#25D366";

  // WaveformPlayer colors: always readable against the bubble bg
  // Own bubble: white accent + white/80 track (bubble is vibrant color)
  // Other bubble: primary accent + contrasting track (bubble is light pastel or dark)
  const isDarkTheme    = theme?.background === "#121212";
  const waveformAccent = isOwn ? "#ffffff" : primary;
  const waveformTrack  = isOwn ? "#ffffff" : (isDarkTheme ? "#ffffff" : "#000000"); // Use white for dark theme, black for light themes
  const [showMenu, setShowMenu] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [isPressing, setIsPressing] = useState(false);
  const pressTimerRef = useRef(null);
  
  const myId = getLoggedInUser()?._id;
  const msg = message; // for easier access
  const isMe = isOwn;

  const renderContentWithHighlights = (content) => {
    if (!searchQuery.trim()) return content;
    const parts = content.split(new RegExp(`(${searchQuery})`, "gi"));
    return (
      <>
        {parts.map((part, i) => 
          part.toLowerCase() === searchQuery.toLowerCase() ? (
            <mark key={i} className="bg-amber-400/40 text-inherit rounded-sm px-0.5 border-b border-amber-500/50">
              {part}
            </mark>
          ) : part
        )}
      </>
    );
  };

  const formatTime = (dateStr) => {
    try {
      if (!dateStr) return "";
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "";
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch (e) {
      return "";
    }
  };

  const handleDeleteForMe = () => {
    onDeleteMe(msg._id);
    setShowMenu(false);
  };

  const handleRestoreForMe = () => {
    socket.emit("restore-for-me", { messageId: msg._id });
    setShowMenu(false);
  };

  const handleDeleteForEveryone = () => {
    if (window.confirm("Permanently delete this message for all participants?")) {
      onDeleteEveryone(msg._id);
    }
    setShowMenu(false);
  };
  
  const handleReact = async (emoji) => {
    try {
      await api.patch(`/message/${msg._id}/react`, { emoji });
      setShowReactions(false);
    } catch (err) {
      console.error("Failed to react:", err);
    }
  };

  const startPress = () => {
    pressTimerRef.current = setTimeout(() => {
      setShowReactions(true);
      setIsPressing(false);
    }, 500);
    setIsPressing(true);
  };

  const endPress = () => {
    clearTimeout(pressTimerRef.current);
    setIsPressing(false);
  };

  const renderStatus = () => {
    if (!isMe || msg?.isDeleted) return null;
    
    switch (msg?.status) {
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
      id={id}
      variants={bubbleVariants}
      initial="hidden"
      animate="visible"
      className={`group flex ${isMe ? "justify-end" : "justify-start"} mb-3 px-4 relative`}
    >
      <div 
        className={`max-w-[75%] rounded-2xl px-4 py-2 shadow-sm transition-all relative ${
          msg.deletedFor?.includes(myId)
            ? "bg-slate-800/50 text-slate-500 border border-dashed border-slate-600 grayscale opacity-40"
            : isHighlighted
              ? "ring-4 ring-amber-400/50 scale-[1.02]"
              : ""
        }`}
        style={msg.deletedFor?.includes(myId) ? {} : {
          background: isHighlighted ? "#fef3c7" : (isOwn ? ownBg : otherBg),
          color: isHighlighted ? "#1a1a1a" : (isOwn ? ownText : otherText),
          borderRadius: isOwn ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
          transition: "background 0.4s ease, color 0.3s ease",
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          setShowMenu(true);
        }}
        onMouseEnter={() => {
          // Optional: Show reactions on hover with delay if desired
          // pressTimerRef.current = setTimeout(() => setShowReactions(true), 1000);
        }}
        onMouseLeave={() => {
          // clearTimeout(pressTimerRef.current);
          // Only hide if not mobile? Usually better to keep it manually dismissal
        }}
        onTouchStart={startPress}
        onTouchEnd={endPress}
        onMouseDown={startPress}
        onMouseUp={endPress}
      >
        <ReactionPicker 
          isVisible={showReactions} 
          onSelect={handleReact}
          position={isMe ? "top" : "top"}
        />
        {/* Attachment Logic */}
        {msg?.fileUrl ? (
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
            ) : msg.fileType?.startsWith("audio/") ? (
              <div className="py-1">
                <WaveformPlayer
                  url={`http://localhost:5002${msg.fileUrl}`}
                  accentColor={waveformAccent}
                  trackColor={waveformTrack}
                  playIconColor={isOwn ? primary : "#ffffff"}
                />
                {msg.content && msg.content !== "🎤 Voice Message" && (
                   <p className="text-sm px-1 mt-2 leading-relaxed italic opacity-80">{msg.content}</p>
                )}
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
            {msg.content && !msg.fileType?.startsWith("audio/") && msg.content !== msg.fileName && (
              <p className="text-sm px-1 leading-relaxed">
                {renderContentWithHighlights(msg.content)}
              </p>
            )}
          </div>
        ) : (
          <p
            className="text-[15px] leading-relaxed break-words"
            style={{ color: isOwn ? ownText : otherText }}
          >
            {renderContentWithHighlights(msg.content)}
          </p>
        )}

        <div className={`flex items-center justify-end gap-1.5 mt-1 ${isMe ? "opacity-70" : "opacity-50"}`}>
          <span className="text-[10px] font-bold uppercase tracking-tighter">
            {formatTime(msg.createdAt)}
          </span>
          {renderStatus()}
        </div>

        {/* Reactions Display */}
        {msg.reactions && msg.reactions.length > 0 && (
          <div className={`absolute -bottom-3 ${isMe ? "right-2" : "left-2"} flex flex-wrap gap-0.5 z-10`}>
            {Object.entries(
              (Array.isArray(msg.reactions) ? msg.reactions : []).reduce((acc, r) => {
                if (r && r.emoji) {
                  acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                }
                return acc;
              }, {})
            ).map(([emoji, count]) => (
              <motion.div
                key={emoji}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileHover={{ scale: 1.1 }}
                className="flex items-center gap-1 bg-whatsapp-sidebar-dark/90 backdrop-blur-md border border-white/20 rounded-full px-1.5 py-0.5 shadow-lg group/reaction cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  handleReact(emoji);
                }}
              >
                <span className="text-sm">{emoji}</span>
                {count > 1 && <span className="text-[10px] text-white/70 font-bold">{count}</span>}
              </motion.div>
            ))}
          </div>
        )}

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
              {msg.deletedFor?.includes(myId) ? (
                <button 
                  onClick={handleRestoreForMe}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-whatsapp-green hover:bg-whatsapp-green/10 transition-colors"
                >
                  <Clock size={16} className="text-whatsapp-green" />
                  Bring it back
                </button>
              ) : (
                <button 
                  onClick={handleDeleteForMe}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <Trash2 size={16} className="text-slate-500" />
                  Remove for me
                </button>
              )}
              {isMe && !msg.isDeleted && (
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
