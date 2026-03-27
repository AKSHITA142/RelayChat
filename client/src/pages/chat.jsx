import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import socket, { connectSocket } from "../services/socket";
import { getLoggedInUser } from "../utils/auth";
import VideoCall from "../components/VideoCall";
import Settings from "../components/Settings";
import { Check, X as CloseIcon } from "lucide-react";
import api from "../services/api";
import { buildHistorySyncUpdate, ensureE2EERegistration, hydrateDecryptedMessage } from "../services/e2ee";
import { getThemeClassName, useChatTheme } from "../hooks/useChatTheme";
import { cn } from "../lib/utils";

export default function Chat() {
  const [themeName] = useChatTheme();

  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [lastSeenMap, setLastSeenMap] = useState({});
  const [contacts, setContacts] = useState(() => getLoggedInUser()?.contacts || []);
  const [e2eeUser, setE2eeUser] = useState(() => getLoggedInUser());
  const [pendingHistorySyncApproval, setPendingHistorySyncApproval] = useState(null);
  const [historySyncStatus, setHistorySyncStatus] = useState("");
  const [historySyncError, setHistorySyncError] = useState("");
  const [isHistorySyncing, setIsHistorySyncing] = useState(false);
  
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [activeVideoCall, setActiveVideoCall] = useState(null);
  const [isShowingSettings, setIsShowingSettings] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState("profile");
  
  const performLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {}
    try {
      socket.emit("logout");
    } catch {}
    try {
      socket.disconnect();
    } catch {}
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("session-active");
    window.location.href = "/login";
  };

  const handleApproveHistorySync = async (approval) => {
    const currentUserId = getLoggedInUser()?._id?.toString();
    if (!currentUserId) return;

    const requestId = approval?.requestId;
    const requesterDeviceId = approval?.requesterDeviceId;
    const requesterPublicKey = approval?.requesterPublicKey;

    setHistorySyncError("");
    setHistorySyncStatus("Starting history sync...");
    setIsHistorySyncing(true);

    try {
      if (!requestId || !requesterDeviceId || !requesterPublicKey) {
        throw new Error("Missing requester device details for history sync.");
      }

      const chatsRes = await api.get("/chat/my-chats");
      const chatList = Array.isArray(chatsRes.data) ? chatsRes.data : [];

      const updates = [];
      let processedCount = 0;

      const maxChats = 50;
      const maxMessagesPerChat = 400;

      for (const chat of chatList.slice(0, maxChats)) {
        const chatId = chat?._id;
        if (!chatId) continue;

        setHistorySyncStatus("Scanning messages...");
        const messagesRes = await api.get(`/message/${chatId}`);
        const messages = Array.isArray(messagesRes.data) ? messagesRes.data : [];

        for (const message of messages.slice(-maxMessagesPerChat)) {
          const update = await buildHistorySyncUpdate({
            message,
            currentUserId,
            targetUserId: currentUserId,
            targetDeviceId: requesterDeviceId,
            targetPublicKey: requesterPublicKey,
          });
          if (update) updates.push(update);
        }
      }

      setHistorySyncStatus(`Syncing ${updates.length} key updates...`);

      const batchSize = 50;
      for (let index = 0; index < updates.length; index += batchSize) {
        const batch = updates.slice(index, index + batchSize);
        const resp = await api.post("/message/sync-device-history", { updates: batch });
        processedCount += Array.isArray(resp.data?.processedMessageIds) ? resp.data.processedMessageIds.length : 0;
      }

      socket.emit("history-sync-finished", {
        requestId,
        requesterDeviceId,
        syncedCount: processedCount,
      });

      setHistorySyncStatus(`Done. Synced ${processedCount} messages.`);
      setPendingHistorySyncApproval(null);
    } catch (err) {
      console.error("History sync approval failed:", err);
      const message = err?.response?.data?.message || err?.message || "History sync failed";
      setHistorySyncError(message);

      if (approval?.requestId) {
        socket.emit("history-sync-finished", {
          requestId: approval.requestId,
          requesterDeviceId: approval.requesterDeviceId,
          syncedCount: 0,
        });
      }
    } finally {
      setIsHistorySyncing(false);
    }
  };

  useEffect(() => {
    const handleHistorySyncRequested = (data) => {
      setPendingHistorySyncApproval(data);
    };
    socket.on("history-sync-requested", handleHistorySyncRequested);

    connectSocket();
    const currentUser = getLoggedInUser();
    if (currentUser?._id) {
      ensureE2EERegistration(api, currentUser)
        .then((updatedUser) => {
          if (updatedUser) {
            localStorage.setItem("user", JSON.stringify(updatedUser));
            setE2eeUser(updatedUser);
          }
        })
        .catch((error) => console.error("Failed to initialize E2EE keys:", error));
    }
    document.querySelectorAll("audio").forEach(a => { try { a.pause(); a.src = ""; } catch {} });
    return () => {
      socket.off("history-sync-requested", handleHistorySyncRequested);
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    socket.on("online-users", users => setOnlineUsers(users.map(u => u._id)));
    socket.on("user-online", ({ userId }) => {
      setOnlineUsers(prev => [...new Set([...prev, userId])]);
      setLastSeenMap(prev => { const copy = { ...prev }; delete copy[userId]; return copy; });
    });
    socket.on("user-offline", ({ userId, lastSeen }) => {
      setOnlineUsers(prev => prev.filter(id => id !== userId));
      setLastSeenMap(prev => ({ ...prev, [userId]: lastSeen }));
    });
    return () => {
      socket.off("online-users");
      socket.off("user-online");
      socket.off("user-offline");
    };
  }, []);

  useEffect(() => {
    const handler = async (msg) => {
      const currentUserId = getLoggedInUser()?._id?.toString();
      const msgChatId = (msg.chat?._id || msg.chat)?.toString();
      if (!msgChatId) return;
      const hydratedMessage = await hydrateDecryptedMessage(msg, currentUserId);
      const isIncoming = msg.sender && (msg.sender._id || msg.sender)?.toString() !== currentUserId;
      const isActiveChat = selectedChat?._id?.toString() === msgChatId;
      if (isActiveChat && isIncoming) {
        socket.emit("open-chat", msgChatId);
        socket.emit("mark-seen", { chatId: msgChatId });
      }
      setChats(prev => {
        const chatIdx = prev.findIndex(c => c._id?.toString() === msgChatId);
        if (chatIdx === -1) return prev;
        const updatedChat = { ...prev[chatIdx], lastMessage: hydratedMessage, unreadCount: isActiveChat ? 0 : (isIncoming ? (prev[chatIdx].unreadCount || 0) + 1 : prev[chatIdx].unreadCount) };
        return [updatedChat, ...prev.filter((_, i) => i !== chatIdx)];
      });
    };
    socket.on("new-message", handler);
    return () => socket.off("new-message", handler);
  }, [selectedChat]);

  useEffect(() => {
    const newChatHandler = (newChat) => {
      setChats(prev => {
        if (prev.find(c => c._id?.toString() === newChat._id?.toString())) return prev;
        socket.emit("join-chat", newChat._id);
        return [newChat, ...prev];
      });
    };
    socket.on("new-chat", newChatHandler);
    return () => socket.off("new-chat", newChatHandler);
  }, []);

  useEffect(() => {
    const renameHandler = ({ chatId, name }) => {
      setChats(prev => prev.map(c => c._id === chatId ? { ...c, groupName: name } : c));
      setSelectedChat(prev => (prev?._id === chatId ? { ...prev, groupName: name } : prev));
    };
    socket.on("chat-renamed", renameHandler);
    return () => socket.off("chat-renamed", renameHandler);
  }, []);

  useEffect(() => {
    const chatUpdateHandler = (updatedChat) => {
      setChats(prev => prev.map(c => c._id === updatedChat._id ? updatedChat : c));
      setSelectedChat(prev => (prev?._id === updatedChat._id ? updatedChat : prev));
    };
    socket.on("chat-updated", chatUpdateHandler);
    return () => socket.off("chat-updated", chatUpdateHandler);
  }, []);

  useEffect(() => {
    const avatarUpdateHandler = ({ userId, avatar }) => {
      const updateAvatar = (list) => list.map(p => {
        const pId = p._id?.toString() || p.toString();
        return pId === userId.toString() ? { ...(typeof p === "object" ? p : {}), _id: pId, avatar } : p;
      });
      setChats(prev => prev.map(chat => ({ ...chat, participants: updateAvatar(chat.participants) })));
      setSelectedChat(prev => prev ? { ...prev, participants: updateAvatar(prev.participants) } : prev);
    };
    socket.on("user-avatar-updated", avatarUpdateHandler);
    return () => socket.off("user-avatar-updated", avatarUpdateHandler);
  }, []);

  useEffect(() => {
    const handleIncomingCall = ({ from, fromName, offer }) => {
      setActiveVideoCall({ to: from, fromName, initialOffer: offer, isIncoming: true, callId: Date.now() });
    };
    socket.on("incoming-call", handleIncomingCall);
    return () => socket.off("incoming-call", handleIncomingCall);
  }, []);

  useEffect(() => {
    if (!chats.length) return;
    chats.forEach(chat => socket.emit("join-chat", chat._id));
  }, [chats]);

  return (
    <div className={cn("relative flex h-screen w-screen overflow-hidden", getThemeClassName(themeName))}>
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-slate-900/20" />
      
      {pendingHistorySyncApproval && (
        <div className="absolute right-4 top-4 z-[100] max-w-sm rounded-2xl border border-primary/30 bg-black/90 p-5 shadow-2xl backdrop-blur-xl">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-bold text-white">Device Approval Request</p>
              <p className="mt-1 text-xs text-white/60">
                "{pendingHistorySyncApproval.requesterLabel}" wants to sync history
              </p>
              {historySyncStatus ? <p className="mt-2 text-[11px] text-white/60">{historySyncStatus}</p> : null}
              {historySyncError ? <p className="mt-2 text-[11px] text-red-300">{historySyncError}</p> : null}
            </div>
            <button 
              onClick={() => { if (!isHistorySyncing) setPendingHistorySyncApproval(null); }} 
              className="rounded-lg p-1.5 text-white/40 hover:bg-white/10 hover:text-white"
              aria-label="Dismiss"
              disabled={isHistorySyncing}
            >
              <CloseIcon size={18} />
            </button>
          </div>
          <div className="mt-4 flex gap-3">
            <button 
              onClick={() => {
                const { requestId } = pendingHistorySyncApproval;
                socket.emit("respond-history-sync", { requestId, approved: true });
                handleApproveHistorySync(pendingHistorySyncApproval);
              }} 
              disabled={isHistorySyncing}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-500 disabled:opacity-50"
            >
              <Check size={16} /> Approve
            </button>
            <button 
              onClick={() => {
                const { requestId } = pendingHistorySyncApproval;
                socket.emit("respond-history-sync", { requestId, approved: false });
                setPendingHistorySyncApproval(null);
              }} 
              disabled={isHistorySyncing}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white/70 transition-colors hover:bg-white/20 hover:text-white disabled:opacity-50"
            >
              <CloseIcon size={16} /> Decline
            </button>
          </div>
        </div>
      )}

      <div className="relative z-10 flex h-full w-full p-2 md:p-3">
        <div className={cn("relative flex h-full", selectedChat ? "hidden md:flex md:w-80 lg:w-96" : "flex w-full md:w-auto")}>
          <Sidebar
            chats={chats} setChats={setChats}
            setSelectedChat={setSelectedChat} selectedChat={selectedChat}
            onlineUsers={onlineUsers} contacts={contacts}
            isAddingContact={isAddingContact} setIsAddingContact={setIsAddingContact}
            isCreatingGroup={isCreatingGroup} setIsCreatingGroup={setIsCreatingGroup}
            setIsShowingSettings={setIsShowingSettings}
            setSettingsInitialTab={setSettingsInitialTab}
            onLogout={performLogout}
          />
        </div>

        <div className={cn("relative flex h-full flex-1", selectedChat ? "flex" : "hidden md:flex")}>
          {selectedChat && (
            <button
              onClick={() => setSelectedChat(null)}
              className="absolute left-2 top-2 z-50 flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-black/50 text-white md:hidden"
            >
              <CloseIcon size={16} />
            </button>
          )}
          <ChatWindow
            selectedChat={selectedChat} chats={chats}
            setSelectedChat={setSelectedChat} onlineUsers={onlineUsers}
            lastSeenMap={lastSeenMap} contacts={contacts}
            setContacts={setContacts} setChats={setChats}
            setIsAddingContact={setIsAddingContact} setIsCreatingGroup={setIsCreatingGroup}
            setActiveVideoCall={setActiveVideoCall}
          />
        </div>
      </div>

      {activeVideoCall && <VideoCall key={activeVideoCall.callId} {...activeVideoCall} onClose={() => setActiveVideoCall(null)} />}

      {isShowingSettings && (
        <Settings 
          user={e2eeUser || getLoggedInUser()} 
          onUpdate={(u) => setE2eeUser(u)}
          initialTab={settingsInitialTab}
          onClose={() => setIsShowingSettings(false)}
          onLogout={performLogout}
        />
      )}
    </div>
  );
}
