import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Circle,
  Edit2,
  MoreHorizontal,
  Palette,
  Search,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  Video,
  X,
} from "lucide-react";
import ThemeSelector from "../ThemeSelector";
import { Avatar } from "@/components/ui/avatar";
import { IconButton } from "@/components/ui/icon-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

export default function ChatHeader({
  selectedChat,
  displayName,
  otherUser,
  isOnline,
  isTyping,
  lastSeenText,
  savedContact,
  isRenaming,
  tempGroupName,
  setTempGroupName,
  onRenameSubmit,
  onCancelRename,
  onStartRename,
  onToggleContactInfo,
  showThemePicker,
  setShowThemePicker,
  activeThemeName,
  onThemeSelect,
  showMenu,
  setShowMenu,
  onOpenSearch,
  onOpenParticipants,
  onRequestAddMember,
  onRequestRemoveMember,
  onOpenAddContact,
  onClearChat,
  onStartVideoCall,
  menuRef,
}) {
  return (
    <div className="z-20 flex h-20 items-center justify-between border-b border-border/70 bg-card/82 px-5 backdrop-blur-xl md:px-6">
      <div className="flex min-w-0 items-center gap-4">
        <div className="relative">
          <Avatar
            src={!selectedChat.isGroup && otherUser?.avatar ? `http://localhost:5002${otherUser.avatar}` : undefined}
            alt={displayName}
            fallback={selectedChat.isGroup ? "G" : displayName?.[0]}
            size="md"
            className="border-primary/15 bg-primary/10 text-primary"
          />
          {!selectedChat.isGroup && isOnline ? (
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-secondary shadow-lg" />
          ) : null}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {isRenaming ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={tempGroupName}
                  onChange={(event) => setTempGroupName(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && onRenameSubmit()}
                  className="rounded-lg border border-primary/30 bg-background/50 px-2 py-1 text-sm text-foreground outline-none focus:border-primary"
                  autoFocus
                />
                <IconButton icon={Check} label="Save name" variant="primary" size="sm" onClick={onRenameSubmit} />
                <IconButton icon={X} label="Cancel rename" variant="destructive" size="sm" onClick={onCancelRename} />
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => !selectedChat?.isGroup && onToggleContactInfo()}
                  className="truncate text-left font-space text-lg font-semibold tracking-tight text-foreground transition-colors hover:text-primary"
                  title={!selectedChat?.isGroup ? "View contact info" : undefined}
                >
                  {displayName}
                </button>
                <IconButton icon={Edit2} label="Rename chat" variant="ghost" size="sm" onClick={onStartRename} />
                {!selectedChat?.isGroup && !savedContact && otherUser ? (
                  <button
                    type="button"
                    onClick={onOpenAddContact}
                    className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                  >
                    Add Contact
                  </button>
                ) : null}
              </>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-2">
            {selectedChat?.isGroup ? (
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                Joined • {selectedChat.createdAt ? new Date(selectedChat.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : "Recently"}
              </span>
            ) : isTyping ? (
              <StatusBadge
                status="active"
                label="Typing"
                pulse
                className="gap-2"
                hideDot={false}
              />
            ) : (
              <span className={cn("flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.2em]", isOnline ? "text-secondary" : "text-muted-foreground")}>
                {isOnline ? <Circle size={8} className="fill-secondary text-secondary" /> : null}
                {isOnline ? "Active now" : lastSeenText}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="relative flex shrink-0 items-center gap-2" ref={menuRef}>
        <div className="relative">
          <IconButton
            icon={Palette}
            label="Change theme"
            variant={showThemePicker ? "primary" : "default"}
            onClick={() => setShowThemePicker((value) => !value)}
          />
          {showThemePicker ? (
            <ThemeSelector currentTheme={activeThemeName} onSelect={onThemeSelect} onClose={() => setShowThemePicker(false)} />
          ) : null}
        </div>

        {!selectedChat.isGroup ? (
          <IconButton icon={Video} label="Start video call" variant="default" onClick={onStartVideoCall} />
        ) : null}

        <IconButton
          icon={MoreHorizontal}
          label="Open chat menu"
          variant={showMenu ? "primary" : "default"}
          onClick={() => setShowMenu((value) => !value)}
        />

        <AnimatePresence>
          {showMenu ? (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 top-14 z-50 w-56 rounded-2xl border border-border/80 bg-card/95 py-2 shadow-2xl backdrop-blur-xl"
            >
              <button onClick={onOpenSearch} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-accent hover:text-primary">
                <Search size={16} />
                Search messages
              </button>
              <button onClick={onOpenParticipants} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-accent hover:text-primary">
                <Users size={16} />
                View participants
              </button>
              <button onClick={onStartRename} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-accent hover:text-primary">
                <Edit2 size={16} />
                Rename {selectedChat.isGroup ? "group" : "chat"}
              </button>
              {selectedChat.isGroup ? (
                <>
                  <button onClick={onRequestAddMember} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-accent hover:text-primary">
                    <UserPlus size={16} />
                    Add member
                  </button>
                  <button onClick={onRequestRemoveMember} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-destructive/10 hover:text-destructive">
                    <UserMinus size={16} />
                    Remove member
                  </button>
                </>
              ) : !savedContact && otherUser ? (
                <button onClick={onOpenAddContact} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-accent hover:text-primary">
                  <UserPlus size={16} />
                  Add to contacts
                </button>
              ) : null}
              <div className="my-1 h-px bg-border/60" />
              <button onClick={onClearChat} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-destructive/10 hover:text-destructive">
                <Trash2 size={16} />
                Clear chat
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
