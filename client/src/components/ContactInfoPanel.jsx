import { X, Lock, Video, Phone, Search, AlertTriangle, Trash2, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const actionStyles = {
  Video: "border-primary/20 bg-primary/10 text-primary hover:bg-primary/15",
  Voice: "border-secondary/20 bg-secondary/10 text-secondary hover:bg-secondary/15",
  Search: "border-border bg-card/70 text-foreground hover:bg-accent",
};

export default function ContactInfoPanel({
  user,
  displayName,
  onClose,
  onVideoCall,
  onVoiceCall,
  onSearch,
  onClearChat,
}) {
  if (!user) return null;

  const avatarUrl = user.avatar ? `http://localhost:5002${user.avatar}` : null;
  const phone = user.phoneNumber || "";
  const status = user.status || "Hey there! I am using RelayChat";

  const quickActions = [
    { icon: <Video size={20} />, label: "Video", action: onVideoCall },
    { icon: <Phone size={20} />, label: "Voice", action: onVoiceCall },
    { icon: <Search size={20} />, label: "Search", action: onSearch },
  ];

  return (
    <AnimatePresence>
      <motion.aside
        key="contact-info-panel"
        initial={{ x: "100%", opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: "100%", opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="absolute right-0 top-0 z-30 flex h-full w-[340px] flex-col overflow-y-auto border-l border-border/70 bg-card/95 backdrop-blur-2xl"
      >
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
          <span className="font-space text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Contact Info
          </span>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition-all hover:bg-accent hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col items-center gap-3 px-6 pb-6 pt-8 text-center">
          <Avatar
            src={avatarUrl}
            alt={displayName}
            fallback={(displayName?.[0] || "?").toUpperCase()}
            size="xl"
            className="border-4 border-primary/30 shadow-[0_0_32px_hsl(var(--primary)/0.18)]"
          />
          <h2 className="font-space text-xl font-bold tracking-wide text-foreground">{displayName}</h2>
          {phone ? <p className="text-sm font-medium text-primary">{phone}</p> : null}
          <p className="px-2 text-xs italic text-muted-foreground">"{status}"</p>
        </div>

        <div className="grid grid-cols-3 gap-3 px-5 pb-6">
          {quickActions.map(({ icon, label, action }) => (
            <button
              key={label}
              onClick={action}
              className={cn(
                "interactive-btn flex flex-col items-center gap-2 rounded-xl border py-4 transition-all",
                actionStyles[label]
              )}
            >
              <span>{icon}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
            </button>
          ))}
        </div>

        <div className="px-5 pb-5">
          <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">About</p>
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
            {status}
          </div>
        </div>

        <div className="mx-5 mb-5 flex items-start gap-3 rounded-xl border border-secondary/20 bg-secondary/10 px-4 py-3">
          <Lock size={18} className="mt-0.5 shrink-0 text-secondary" />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-secondary">End-to-End Encrypted</p>
            <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">
              Messages are secured with AES-256 encryption. Only you and the recipient can read them.
            </p>
          </div>
        </div>

        <div className="mt-auto space-y-1 border-t border-border/60 px-5 pb-8 pt-3">
          <p className="mb-3 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Actions</p>

          <button
            onClick={onClearChat}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-amber-400 transition-all hover:bg-amber-500/10"
          >
            <Trash2 size={16} />
            Clear Chat
          </button>

          <button className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-destructive transition-all hover:bg-destructive/10">
            <Shield size={16} />
            Block {displayName?.split(" ")[0] || "User"}
          </button>

          <button className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-destructive transition-all hover:bg-destructive/10">
            <AlertTriangle size={16} />
            Report {displayName?.split(" ")[0] || "User"}
          </button>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}
