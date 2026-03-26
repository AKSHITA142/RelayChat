import { X, Lock, Video, Phone, Search, AlertTriangle, Trash2, Shield } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const actionStyles = {
  Video: "border-primary/20 bg-primary/10 text-primary hover:bg-primary/15",
  Voice: "border-secondary/20 bg-secondary/10 text-secondary hover:bg-secondary/15",
  Search: "border-white/20 bg-white/5 text-white/80 hover:bg-white/10",
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
  const status = user.status || "Hey there!";

  const quickActions = [
    { icon: <Video size={20} />, label: "Video", action: onVideoCall },
    { icon: <Phone size={20} />, label: "Voice", action: onVoiceCall },
    { icon: <Search size={20} />, label: "Search", action: onSearch },
  ];

  return (
    <div className="absolute right-0 top-0 z-30 flex h-full w-full max-w-[360px] flex-col overflow-y-auto border-l border-white/10 bg-black/90 backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <span className="text-sm font-semibold text-white">
          Contact Info
        </span>
        <button
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/80 transition-all hover:bg-white/20 hover:text-white"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex flex-col items-center gap-3 px-6 py-8 text-center">
        <Avatar
          src={avatarUrl}
          alt={displayName}
          fallback={(displayName?.[0] || "?").toUpperCase()}
          size="xl"
          className="h-24 w-24 rounded-full border-4 border-white/20 shadow-xl"
        />
        <h2 className="text-2xl font-bold text-white">{displayName}</h2>
        {phone && <p className="text-sm font-medium text-primary">{phone}</p>}
        <p className="px-4 text-sm text-white/50">"{status}"</p>
      </div>

      <div className="grid grid-cols-3 gap-3 px-5 pb-6">
        {quickActions.map(({ icon, label, action }) => (
          <button
            key={label}
            onClick={action}
            className={cn(
              "flex flex-col items-center gap-2 rounded-2xl border py-4 transition-all",
              actionStyles[label]
            )}
          >
            <span>{icon}</span>
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </div>

      <div className="px-5 pb-5">
        <p className="mb-2 text-xs font-medium uppercase text-white/50">About</p>
        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white">
          {status}
        </div>
      </div>

      <div className="mx-5 mb-5 flex items-start gap-3 rounded-xl border border-secondary/20 bg-secondary/10 px-4 py-3">
        <Lock size={18} className="mt-0.5 shrink-0 text-secondary" />
        <div>
          <p className="text-xs font-semibold uppercase text-secondary">End-to-End Encrypted</p>
          <p className="mt-1 text-xs leading-relaxed text-white/60">
            Messages are secured with AES-256 encryption. Only you and the recipient can read them.
          </p>
        </div>
      </div>

      <div className="mt-auto space-y-1 border-t border-white/10 px-5 py-4">
        <p className="mb-3 text-xs font-medium uppercase text-white/50">Actions</p>

        <button
          onClick={onClearChat}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-amber-400 transition-all hover:bg-amber-500/10"
        >
          <Trash2 size={18} />
          Clear Chat
        </button>

        <button className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-400 transition-all hover:bg-red-500/10">
          <Shield size={18} />
          Block {displayName?.split(" ")[0] || "User"}
        </button>

        <button className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-400 transition-all hover:bg-red-500/10">
          <AlertTriangle size={18} />
          Report {displayName?.split(" ")[0] || "User"}
        </button>
      </div>
    </div>
  );
}
