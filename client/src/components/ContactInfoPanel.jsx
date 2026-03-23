import { X, Lock, Video, Phone, Search, AlertTriangle, Trash2, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ContactInfoPanel({ user, displayName, onClose, onVideoCall, onVoiceCall, onSearch, onClearChat }) {
  if (!user) return null;

  const avatarUrl = user.avatar ? `http://localhost:5002${user.avatar}` : null;
  const initial = (displayName?.[0] || "?").toUpperCase();
  const phone = user.phoneNumber || "";
  const status = user.status || "Hey there! I am using RelayChat";

  return (
    <AnimatePresence>
      <motion.div
        key="contact-info-panel"
        initial={{ x: "100%", opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: "100%", opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="absolute top-0 right-0 h-full w-[340px] z-30 flex flex-col overflow-y-auto"
        style={{
          background: "rgba(11,14,20,0.97)",
          backdropFilter: "blur(24px)",
          borderLeft: "1px solid rgba(197,154,255,0.12)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0">
          <span className="text-xs font-bold uppercase tracking-widest text-[#a9abb3] font-space">Contact Info</span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#a9abb3] hover:text-[#00eefc] hover:bg-[#00eefc]/10 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Profile */}
        <div className="flex flex-col items-center pt-8 pb-6 px-6 gap-3">
          <div className="relative">
            <div
              className="w-24 h-24 rounded-full ring-4 ring-[#c59aff]/40 shadow-[0_0_30px_rgba(197,154,255,0.25)] overflow-hidden flex items-center justify-center text-3xl font-bold text-white"
              style={{ background: "linear-gradient(135deg, #1e1530, #0d1a2a)" }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                initial
              )}
            </div>
            {/* online indicator placeholder */}
          </div>
          <h2 className="text-xl font-bold text-white font-space tracking-wide">{displayName}</h2>
          {phone && (
            <p className="text-sm font-medium text-[#00eefc]">{phone}</p>
          )}
          <p className="text-xs text-[#a9abb3] italic text-center px-2">"{status}"</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-3 px-5 pb-6">
          {[
            { icon: <Video size={20} />, label: "Video", color: "#00eefc", action: onVideoCall },
            { icon: <Phone size={20} />, label: "Voice", color: "#4ade80", action: onVoiceCall },
            { icon: <Search size={20} />, label: "Search", color: "#c59aff", action: onSearch },
          ].map(({ icon, label, color, action }) => (
            <button
              key={label}
              onClick={action}
              className="flex flex-col items-center gap-2 py-4 rounded-xl transition-all hover:scale-105 active:scale-95"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${color}22`,
                boxShadow: `0 0 12px ${color}18`,
              }}
            >
              <span style={{ color }}>{icon}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>
                {label}
              </span>
            </button>
          ))}
        </div>

        {/* About */}
        <div className="px-5 pb-5">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#a9abb3] mb-2">About</p>
          <div
            className="px-4 py-3 rounded-xl text-sm text-[#ecedf6]"
            style={{ background: "rgba(255,255,255,0.04)", borderLeft: "2px solid #00eefc66" }}
          >
            {status}
          </div>
        </div>

        {/* E2EE Info */}
        <div className="mx-5 mb-5 px-4 py-3 rounded-xl flex items-start gap-3" style={{ background: "rgba(0,238,252,0.05)", border: "1px solid rgba(0,238,252,0.15)" }}>
          <Lock size={18} className="text-[#00eefc] mt-0.5 shrink-0" />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#00eefc]">End-to-End Encrypted</p>
            <p className="text-[10px] text-[#a9abb3] mt-0.5 leading-relaxed">
              Messages are secured with AES-256 encryption. Only you and the recipient can read them.
            </p>
          </div>
        </div>

        {/* Danger Actions */}
        <div className="px-5 pt-3 pb-8 mt-auto space-y-1 border-t border-white/5">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#a9abb3] mb-3">Actions</p>

          <button
            onClick={onClearChat}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-amber-400 hover:bg-amber-500/10 transition-all"
          >
            <Trash2 size={16} />
            Clear Chat
          </button>

          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition-all"
          >
            <Shield size={16} />
            Block {displayName?.split(" ")[0] || "User"}
          </button>

          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition-all"
          >
            <AlertTriangle size={16} />
            Report {displayName?.split(" ")[0] || "User"}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
