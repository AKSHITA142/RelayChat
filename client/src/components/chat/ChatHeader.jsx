import { useState } from "react";
import {
  Check,
  Circle,
  Edit2,
  MoreHorizontal,
  Palette,
  Pin,
  Search,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  Video,
  X,
} from "lucide-react";
import { config } from "../../config";
import ThemeSelector from "../ThemeSelector";
import { Avatar } from "@/components/ui/avatar";
import { IconButton } from "@/components/ui/icon-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import { getLoggedInUser } from "../../utils/auth";

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
  pinnedMessageObjects = [],
  onScrollToMessage,
  onUnpinMessage,
  contacts = [],
}) {
  const [currentPinnedIndex, setCurrentPinnedIndex] = useState(0);

  const pinnedMessages = selectedChat?.pinnedMessages || [];
  
  const activeIndex = pinnedMessageObjects.length ? currentPinnedIndex % pinnedMessageObjects.length : 0;
  const currentPinnedMsg = pinnedMessageObjects[activeIndex];

  const getPinnedMessageName = () => {
    if (!currentPinnedMsg) return "";
    const myId = getLoggedInUser()?._id;
    const senderId = (currentPinnedMsg.sender?._id || currentPinnedMsg.sender)?.toString();
    
    if (senderId === myId?.toString()) {
      return "You";
    }

    const contact = contacts.find((c) => c.userId?.toString() === senderId);
    if (contact?.savedName) {
      return contact.savedName;
    }

    return currentPinnedMsg.sender?.name || currentPinnedMsg.sender?.phoneNumber || "User";
  };

  const handlePinnedClick = () => {
    if (!currentPinnedMsg) return;
    if (onScrollToMessage) {
      onScrollToMessage(currentPinnedMsg._id);
    }
    setCurrentPinnedIndex(prev => prev + 1);
  };

  return (
    <div className="z-20 mx-3 mt-3 flex flex-col md:mx-4">
      <header className="flex min-h-[5rem] items-center justify-between rounded-2xl border border-white/10 bg-black/50 px-4 py-3 backdrop-blur-md md:px-5" role="banner">
        <div className="flex min-w-0 items-center gap-4">
          <div className="relative">
            <Avatar
              src={!selectedChat.isGroup && otherUser?.avatar ? config.endpoints.files(otherUser.avatar) : undefined}
              alt={displayName}
              fallback={selectedChat.isGroup ? "G" : displayName?.[0]}
              size="md"
              className="border-primary/15 bg-primary/10 text-primary"
            />
            {!selectedChat.isGroup && isOnline && (
              <span 
                className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background bg-green-500" 
                role="status"
                aria-label="Online"
              />
            )}
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
                    className="h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none focus:border-primary/30"
                    autoFocus
                    aria-label="New chat name"
                  />
                  <IconButton icon={Check} label="Save name" variant="primary" size="sm" onClick={onRenameSubmit} />
                  <IconButton icon={X} label="Cancel rename" variant="destructive" size="sm" onClick={onCancelRename} />
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => !selectedChat?.isGroup && onToggleContactInfo()}
                    className="truncate text-left text-xl font-bold text-white hover:text-primary"
                    title={!selectedChat?.isGroup ? "View contact info" : undefined}
                    aria-label={!selectedChat?.isGroup ? "View contact info" : undefined}
                  >
                    {displayName}
                  </button>
                  <IconButton icon={Edit2} label="Rename chat" variant="ghost" size="sm" onClick={onStartRename} />
                  {!selectedChat?.isGroup && !savedContact && otherUser ? (
                    <button
                      type="button"
                      onClick={onOpenAddContact}
                      className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-primary hover:bg-primary hover:text-primary-foreground"
                    >
                      Add Contact
                    </button>
                  ) : null}
                </>
              )}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-2" role="status" aria-live="polite">
              {selectedChat?.isGroup ? (
                <span className="text-xs text-white/50">
                  Group • {selectedChat.createdAt ? new Date(selectedChat.createdAt).toLocaleDateString([], { month: "short", day: "numeric" }) : "Recent"}
                </span>
              ) : isTyping ? (
                <StatusBadge status="active" label="Typing" pulse className="gap-2" hideDot={false} />
              ) : (
                <span className={cn("flex items-center gap-1 text-xs", isOnline ? "text-green-400" : "text-white/50")}>
                  {isOnline && <Circle size={8} className="fill-green-400 text-green-400" aria-hidden="true" />}
                  {isOnline ? "Online" : lastSeenText}
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
              aria-expanded={showThemePicker}
              aria-haspopup="dialog"
            />
            {showThemePicker && (
              <ThemeSelector currentTheme={activeThemeName} onSelect={onThemeSelect} onClose={() => setShowThemePicker(false)} />
            )}
          </div>

          {!selectedChat.isGroup && (
            <IconButton icon={Video} label="Start video call" variant="default" onClick={onStartVideoCall} aria-label="Start video call" />
          )}

          <IconButton
            icon={MoreHorizontal}
            label="Open chat menu"
            variant={showMenu ? "primary" : "default"}
            onClick={() => setShowMenu((value) => !value)}
            aria-expanded={showMenu}
            aria-haspopup="menu"
          />

          {showMenu && (
            <nav 
              className="absolute right-0 top-14 z-50 w-56 rounded-xl border border-white/10 bg-black/95 py-2 shadow-xl" 
              role="menu"
              aria-label="Chat options"
            >
              <button 
                onClick={onOpenSearch} 
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-white hover:bg-white/10"
                role="menuitem"
              >
                <Search size={16} aria-hidden="true" />
                Search messages
              </button>
              <button 
                onClick={onOpenParticipants} 
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-white hover:bg-white/10"
                role="menuitem"
              >
                <Users size={16} aria-hidden="true" />
                View participants
              </button>
              <button 
                onClick={onStartRename} 
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-white hover:bg-white/10"
                role="menuitem"
              >
                <Edit2 size={16} aria-hidden="true" />
                Rename {selectedChat.isGroup ? "group" : "chat"}
              </button>
              {selectedChat.isGroup ? (
                <>
                  <button 
                    onClick={onRequestAddMember} 
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-white hover:bg-white/10"
                    role="menuitem"
                  >
                    <UserPlus size={16} aria-hidden="true" />
                    Add member
                  </button>
                  <button 
                    onClick={onRequestRemoveMember} 
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/10"
                    role="menuitem"
                  >
                    <UserMinus size={16} aria-hidden="true" />
                    Remove member
                  </button>
                </>
              ) : !savedContact && otherUser ? (
                <button 
                  onClick={onOpenAddContact} 
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-white hover:bg-white/10"
                  role="menuitem"
                >
                  <UserPlus size={16} aria-hidden="true" />
                  Add to contacts
                </button>
              ) : null}
              <div className="my-1 h-px bg-white/10" />
              <button 
                onClick={onClearChat} 
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/10"
                role="menuitem"
              >
                <Trash2 size={16} aria-hidden="true" />
                Clear chat
              </button>
            </nav>
          )}
        </div>
      </header>

      {pinnedMessages.length > 0 && currentPinnedMsg && (
        <div 
          onClick={handlePinnedClick}
          className="mt-2 flex cursor-pointer items-center gap-3 rounded-xl border border-primary/20 bg-primary/10 py-2 pl-4 pr-3 backdrop-blur-md transition-all hover:bg-primary/20 animate-in slide-in-from-top-1 duration-300 shadow-sm"
        >
          <Pin size={14} className="text-primary shrink-0" />
          <div className="flex-1 min-w-0 border-l-2 border-primary/50 pl-2">
            <p className="truncate text-[11px] font-bold text-white drop-shadow-sm">
              {getPinnedMessageName()}
              {pinnedMessages.length > 1 && (
                <span className="ml-2 font-normal text-white/50">
                  ({activeIndex + 1} of {pinnedMessages.length})
                </span>
              )}
            </p>
            <p className="truncate text-xs font-medium text-white/80 leading-tight">
              {currentPinnedMsg.content || "📎 Attachment"}
            </p>
          </div>
          {onUnpinMessage && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onUnpinMessage(currentPinnedMsg);
              }}
              className="text-[10px] font-bold uppercase tracking-widest text-primary/70 hover:text-white transition-colors p-1"
              title="Unpin"
            >
               Unpin
            </button>
          )}
        </div>
      )}
    </div>
  );
}
