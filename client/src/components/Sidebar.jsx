import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  LogOut,
  MessageSquare,
  Plus,
  User,
  Users,
  X,
  Settings,
  UserPlus,
  ShieldCheck,
} from "lucide-react";
import api from "../services/api";
import { getLoggedInUser } from "../utils/auth";
import { hydrateChatPreview } from "../services/e2ee";
import { config } from "../config";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { IconButton } from "@/components/ui/icon-button";
import { SearchField } from "@/components/ui/search-field";
import { UserListItem } from "@/components/ui/user-list-item";
import { cn } from "@/lib/utils";
import DropdownMenu, { DropdownItem, DropdownSeparator } from "@/components/ui/dropdown-menu";

const getChatPreview = (chat) => {
  const msg = chat.lastMessage;
  if (!msg) return "Conversation start";
  if (msg.isDeleted) return "Message retracted";
  if (msg.fileUrl || msg.fileType || msg.fileName) {
    const isImage =
      msg.fileType?.startsWith("image/") || (msg.fileName && /\.(jpg|jpeg|png|gif|webp)$/i.test(msg.fileName));
    if (isImage) return "Image";
    return msg.fileName || "File attachment";
  }
  return msg.content || "Conversation start";
};

function SidebarContent({
  chats,
  selectedChat,
  setSelectedChat,
  setChats,
  contacts,
  onlineUsers,
  isAddingContact,
  setIsAddingContact,
  isCreatingGroup,
  setIsCreatingGroup,
  setIsShowingSettings,
  setSettingsInitialTab,
  contactPhone,
  setContactPhone,
  groupName,
  setGroupName,
  selectedGroupUsers,
  setSelectedGroupUsers,
  contactLoading,
  contactError,
  setContactError,
  handleStartChat,
  handleCreateGroup,
  handleLogout,
  myUserId,
  closeMobile,
}) {
  const [search, setSearch] = useState("");

  const pastChatUsers = useMemo(
    () =>
      Array.from(
        new Map(
          chats
            .filter((chat) => !chat.isGroup)
            .map((chat) => {
              const user = chat.participants.find(
                (participant) => participant && (participant._id?.toString() || participant.toString()) !== myUserId?.toString()
              );
              return user ? [user._id, user] : null;
            })
            .filter(Boolean)
        ).values()
      ),
    [chats, myUserId]
  );

  const filteredChats = useMemo(() => {
    return chats.filter((chat) => {
      if (!search.trim()) return true;
      const query = search.toLowerCase();
      if (chat.isGroup) return chat.groupName?.toLowerCase().includes(query);
      const otherUser = chat.participants.find(
        (user) => user && (user._id?.toString() || user.toString()) !== myUserId?.toString()
      );
      if (!otherUser) return false;
      const savedContact = contacts.find((contact) => contact && contact.userId?.toString() === otherUser?._id?.toString());
      const nameToSearch = savedContact ? savedContact.savedName : otherUser.phoneNumber;
      return nameToSearch?.toLowerCase().includes(query);
    });
  }, [search, chats, contacts, myUserId]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      {/* Header Section */}
      <div className="border-b border-white/10 px-4 pb-4 pt-5">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="space-y-3">
            <div className="section-badge shadow-lg">Conversations</div>
            <div>
              <h2 className="font-headline text-3xl font-bold tracking-[-0.04em] text-gradient">Messages</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Search and manage your conversations
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            <DropdownMenu className="surface-panel">
              <DropdownItem 
                icon={UserPlus}
                onClick={() => {
                  setIsAddingContact(!isAddingContact);
                  setIsCreatingGroup(false);
                  setContactError("");
                }}
              >
                {isAddingContact ? "Cancel" : "Add Contact"}
              </DropdownItem>
              
              <DropdownItem 
                icon={Users}
                onClick={() => {
                  setIsCreatingGroup(!isCreatingGroup);
                  setIsAddingContact(false);
                  setGroupName("");
                  setSelectedGroupUsers([]);
                  setContactError("");
                }}
              >
                {isCreatingGroup ? "Cancel" : "Create Group"}
              </DropdownItem>
              
              <DropdownSeparator />
              
              <DropdownItem 
                icon={Settings}
                onClick={() => {
                  setSettingsInitialTab?.("profile");
                  setIsShowingSettings(true);
                  setIsCreatingGroup(false);
                  setIsAddingContact(false);
                  setContactError("");
                  closeMobile?.();
                }}
              >
                Settings
              </DropdownItem>
              
              <DropdownItem 
                icon={ShieldCheck}
                variant="success"
                onClick={() => {
                  setSettingsInitialTab?.("privacy");
                  setIsShowingSettings(true);
                  setIsCreatingGroup(false);
                  setIsAddingContact(false);
                  setContactError("");
                  closeMobile?.();
                }}
              >
                Privacy & Security
              </DropdownItem>
            </DropdownMenu>
          </div>
        </div>

        <div className="grid gap-3">
          <SearchField
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search conversations..."
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="surface-panel rounded-[20px] px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">Threads</p>
              <p className="mt-2 text-xl font-bold tracking-tight text-gradient">{filteredChats.length}</p>
            </div>
            <div className="surface-panel rounded-[20px] px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">Online</p>
              <p className="mt-2 text-xl font-bold tracking-tight text-gradient">{Math.max(onlineUsers.length - 1, 0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Add Contact / Create Group Forms */}
      {(isAddingContact || isCreatingGroup) && (
        <div className="shrink-0 overflow-hidden px-4 pt-4">
          <Card className="space-y-5 p-5">
            {isAddingContact ? (
              <>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">Start private chat</p>
                  <p className="text-sm text-muted-foreground">Enter phone number to chat</p>
                </div>
                <SearchField
                  value={contactPhone}
                  onChange={(event) => setContactPhone(event.target.value)}
                  placeholder="Phone (+91...)"
                  className="w-full"
                />
                <Button onClick={handleStartChat} disabled={contactLoading} className="w-full">
                  {contactLoading ? <Loader2 className="animate-spin" /> : "Start Chat"}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setIsAddingContact(false);
                    setContactPhone("");
                    setContactError("");
                  }}
                >
                  Cancel
                </Button>
              </>
            ) : null}

            {isCreatingGroup ? (
              <>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">New group</p>
                  <p className="text-sm text-muted-foreground">Add members to create group</p>
                </div>

                <SearchField
                  value={groupName}
                  onChange={(event) => setGroupName(event.target.value)}
                  placeholder="Group Name"
                  className="w-full"
                />

                <div className="space-y-2">
                  <p className="px-1 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                    Select members ({selectedGroupUsers.length})
                  </p>
                  <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                    {pastChatUsers.length ? (
                      pastChatUsers.map((user) => {
                        const saved = contacts.find((contact) => contact?.userId?.toString() === user._id?.toString());
                        const name = saved ? saved.savedName : user.name || user.phoneNumber || "User";
                        const isSelected = selectedGroupUsers.includes(user._id);

                        return (
                          <UserListItem
                            key={user._id}
                            title={name}
                            subtitle={user.phoneNumber || "Recent chat"}
                            avatarSrc={user.avatar ? config.endpoints.files(user.avatar) : undefined}
                            avatarFallback={name?.[0]}
                            selected={isSelected}
                            interactive
                            onClick={() => {
                              if (isSelected) {
                                setSelectedGroupUsers((prev) => prev.filter((id) => id !== user._id));
                              } else {
                                setSelectedGroupUsers((prev) => [...prev, user._id]);
                              }
                            }}
                            rightContent={
                              <div
                                className={cn(
                                  "rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em]",
                                  isSelected
                                    ? "border-secondary/20 bg-secondary/10 text-secondary"
                                    : "border-border bg-muted/40 text-muted-foreground"
                                )}
                              >
                                {isSelected ? "Added" : "Select"}
                              </div>
                            }
                          />
                        );
                      })
                    ) : (
                      <p className="surface-inline rounded-[20px] px-4 py-6 text-center text-xs text-muted-foreground">
                        No recent contacts available
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  onClick={handleCreateGroup}
                  disabled={contactLoading || !groupName.trim() || selectedGroupUsers.length === 0}
                  className="w-full"
                >
                  {contactLoading ? "Creating..." : "Create Group"}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setIsCreatingGroup(false);
                    setGroupName("");
                    setSelectedGroupUsers([]);
                    setContactError("");
                  }}
                >
                  Cancel
                </Button>
              </>
            ) : null}

            {contactError ? <p className="text-xs font-medium text-destructive">{contactError}</p> : null}
          </Card>
        </div>
      )}

      {/* Chat List */}
      <div className="flex-1 px-4 py-4">
        {filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="surface-panel mb-4 flex h-16 w-16 items-center justify-center rounded-2xl">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-headline text-lg font-semibold text-foreground">No conversations yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {search ? "Try adjusting your search" : "Start your first conversation"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredChats.map((chat) => {
              const isSelected = selectedChat?._id === chat._id;
              const otherUser = chat.participants?.find(
                (user) => user && (user._id?.toString() || user.toString()) !== myUserId?.toString()
              );

              let displayName = chat.isGroup ? chat.groupName || "Unnamed Group" : "Unknown User";
              if (!chat.isGroup && otherUser) {
                const saved = contacts.find((contact) => contact && contact.userId?.toString() === otherUser?._id?.toString());
                displayName = saved ? saved.savedName : otherUser.phoneNumber || "User";
              }

              const isOnline =
                !chat.isGroup &&
                otherUser?._id &&
                onlineUsers.some((userId) => userId?.toString() === otherUser._id.toString());

              return (
                <div 
                  key={chat._id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Chat with ${displayName}`}
                  className={cn(
                    "surface-panel rounded-2xl p-4 cursor-pointer hover:bg-white/5",
                    isSelected && "ring-2 ring-primary/50"
                  )}
                  onClick={() => {
                    setSelectedChat(chat);
                    setChats((prev) =>
                      prev.map((item) => (item._id === chat._id ? { ...item, unreadCount: 0 } : item))
                    );
                    closeMobile?.();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setSelectedChat(chat);
                      setChats((prev) =>
                        prev.map((item) => (item._id === chat._id ? { ...item, unreadCount: 0 } : item))
                      );
                      closeMobile?.();
                    }
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="surface-panel h-12 w-12 flex items-center justify-center rounded-xl text-sm font-bold">
                        {chat.isGroup ? "G" : displayName?.[0]}
                      </div>
                      {!chat.isGroup && isOnline && (
                        <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background" aria-label="Online" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-foreground truncate">{displayName}</h4>
                        {chat.isGroup && (
                          <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-primary">
                            Group
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate mt-1">{getChatPreview(chat)}</p>
                    </div>
                    {chat.unreadCount > 0 && (
                      <span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-black text-secondary-foreground shadow-sm">
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sign-Out Button */}
      <div className="sticky bottom-0 border-t border-white/10 backdrop-blur-sm">
        <button
          onClick={handleLogout}
          className="surface-panel flex w-full items-center gap-3 px-4 py-4 text-left hover:bg-white/5 transition-colors"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/20 text-destructive">
            <LogOut size={18} />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-foreground">Sign Out</p>
            <p className="text-xs text-muted-foreground">End your session</p>
          </div>
        </button>
      </div>
    </div>
  );
}

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
  setIsShowingSettings,
  setSettingsInitialTab,
  onLogout,
}) {
  const myUserId = getLoggedInUser()?._id;
  const [contactPhone, setContactPhone] = useState("");
  const [contactLoading, setContactLoading] = useState(false);
  const [contactError, setContactError] = useState("");
  const [groupName, setGroupName] = useState("");
  const [selectedGroupUsers, setSelectedGroupUsers] = useState([]);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    if (typeof onLogout === "function") {
      onLogout();
      return;
    }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("session-active");
    window.location.href = "/login";
  };

  useEffect(() => {
    api
      .get("/chat/my-chats")
      .then(async (res) => {
        const hydratedChats = await Promise.all(res.data.map((chat) => hydrateChatPreview(chat, myUserId)));
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
      setChats((prev) => {
        if (prev.some((chat) => (chat._id || chat.id)?.toString() === (newChat._id || newChat.id)?.toString())) {
          return prev;
        }
        return [newChat, ...prev];
      });
      setSelectedChat(newChat);
      setIsAddingContact(false);
      setContactPhone("");
      setContactError("");
      setMobileOpen(false);
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
      const res = await api.post("/chat/create-group", {
        name: groupName.trim(),
        users: selectedGroupUsers,
      });
      const newGroup = res.data;
      setChats((prev) => {
        if (prev.some((chat) => (chat._id || chat.id)?.toString() === (newGroup._id || newGroup.id)?.toString())) {
          return prev;
        }
        return [newGroup, ...prev];
      });
      setSelectedChat(newGroup);
      setIsCreatingGroup(false);
      setGroupName("");
      setSelectedGroupUsers([]);
      setContactError("");
      setMobileOpen(false);
    } catch {
      setContactError("Failed to create group.");
    } finally {
      setContactLoading(false);
    }
  };

  const sidebarProps = {
    chats,
    selectedChat,
    setSelectedChat,
    setChats,
    contacts,
    onlineUsers,
    isAddingContact,
    setIsAddingContact,
    isCreatingGroup,
    setIsCreatingGroup,
    setIsShowingSettings,
    setSettingsInitialTab,
    contactPhone,
    setContactPhone,
    groupName,
    setGroupName,
    selectedGroupUsers,
    setSelectedGroupUsers,
    contactLoading,
    contactError,
    setContactError,
    handleStartChat,
    handleCreateGroup,
    handleLogout,
    myUserId,
  };

  return (
    <>
      {/* Mobile hamburger */}
      <div className="fixed left-4 top-4 z-40 md:hidden">
        <IconButton icon={MessageSquare} label="Open chats" variant="primary" className="shadow-lg" onClick={() => setMobileOpen(true)} />
      </div>

      {/* Mobile drawer backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 flex w-[92vw] max-w-sm flex-col bg-card/95 backdrop-blur-xl border-r border-border/70 transition-transform duration-300 ease-out md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        role="dialog"
        aria-label="Chat list"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-border/70 px-4 py-4">
          <span className="text-sm font-bold text-foreground">Chats</span>
          <button 
            onClick={() => setMobileOpen(false)} 
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Close chat list"
          >
            <X size={18} />
          </button>
        </div>
        <SidebarContent {...sidebarProps} closeMobile={() => setMobileOpen(false)} />
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden h-full w-full max-w-sm shrink-0 border-r border-border/70 bg-card/78 backdrop-blur-xl md:flex lg:max-w-md">
        <SidebarContent {...sidebarProps} />
      </aside>
    </>
  );
}
