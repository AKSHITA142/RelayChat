import { useState, useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

// Ensure `motion` is treated as used by the linter (used in JSX via <motion.* />)
void motion;

import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import socket, { connectSocket } from "../services/socket";
import { getLoggedInUser } from "../utils/auth";
import VideoCall from "../components/VideoCall";
import { AnimatePresence } from "framer-motion";
import { Check, X as CloseIcon } from "lucide-react";
import api from "../services/api";
import { buildHistorySyncUpdate, ensureE2EERegistration, getCurrentDeviceId, getCurrentDeviceLabel, hydrateDecryptedMessage, markHistorySyncComplete, needsHistorySync } from "../services/e2ee";

export default function Chat() {
  const containerRef = useRef(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth the mouse movement
  const springConfig = { damping: 20, stiffness: 150 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  const x = useTransform(smoothX, (v) => `${v}px`);
  const y = useTransform(smoothY, (v) => `${v}px`);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const { left, top } = containerRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - left);
    mouseY.set(e.clientY - top);
  };

  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [lastSeenMap, setLastSeenMap] = useState({});
  const [contacts, setContacts] = useState(() => getLoggedInUser()?.contacts || []);
  const [e2eeUser, setE2eeUser] = useState(() => getLoggedInUser());
  const [pendingHistorySyncApproval, setPendingHistorySyncApproval] = useState(null);
  const [historySyncRequesting, setHistorySyncRequesting] = useState(false);
  
  // Shared UI States for Side Panels
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [activeVideoCall, setActiveVideoCall] = useState(null);

  // Backup Restore Fallback States
  const [restorePin, setRestorePin] = useState("");
  const [restoringPin, setRestoringPin] = useState(false);
  const [restoreError, setRestoreError] = useState("");

  useEffect(() => {
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
        .catch((error) => {
          console.error("Failed to initialize E2EE keys:", error);
        });
    }
    // Kill any rogue ringer audio left over from a previous call/hot-reload
    // eslint-disable-next-line no-empty
    document.querySelectorAll("audio").forEach(a => { try { a.pause(); a.src = ""; } catch {} });
  }, []);

  useEffect(() => {
    socket.on("online-users", users => {
      setOnlineUsers(users.map(u => u._id));
    });

    socket.on("user-online", ({ userId }) => {
      setOnlineUsers(prev => [...new Set([...prev, userId])]);

      setLastSeenMap(prev => {
        const copy = { ...prev };
        delete copy[userId];
        return copy;
      });
    });

    socket.on("user-offline", ({ userId, lastSeen }) => {
      setOnlineUsers(prev => prev.filter(id => id !== userId));

      setLastSeenMap(prev => ({
        ...prev,
        [userId]: lastSeen,
      }));
    });

    return () => {
      socket.off("online-users");
      socket.off("user-online");
      socket.off("user-offline");
    };
  }, []);

  // Update sidebar lastMessage and unread badge
  useEffect(() => {
    const handler = async (msg) => {
      const currentUserId = getLoggedInUser()?._id?.toString();
      const msgChatId = (msg.chat?._id || msg.chat)?.toString();
      if (!msgChatId) return;

      const hydratedMessage = await hydrateDecryptedMessage(msg, currentUserId);
      const isIncoming = msg.sender && (msg.sender._id || msg.sender)?.toString() !== currentUserId;
      const isActiveChat = selectedChat?._id?.toString() === msgChatId;

      // If we're already viewing the chat, immediately mark seen/open
      if (isActiveChat && isIncoming) {
        socket.emit("open-chat", msgChatId);
        socket.emit("mark-seen", { chatId: msgChatId });
      }

      setChats(prev => {
        const chatIdx = prev.findIndex(c => c._id?.toString() === msgChatId);
        if (chatIdx === -1) return prev;

        const currentUnread = prev[chatIdx].unreadCount || 0;
        const nextUnread = isActiveChat ? 0 : (isIncoming ? currentUnread + 1 : currentUnread);

        const updatedChat = { 
          ...prev[chatIdx], 
          lastMessage: hydratedMessage,
          unreadCount: nextUnread
        };
        const rest = prev.filter((_, i) => i !== chatIdx);
        return [updatedChat, ...rest];
      });
    };

    socket.on("new-message", handler);
    return () => socket.off("new-message", handler);
  }, [selectedChat]);

  // Listen for newly created chats (like groups)
  useEffect(() => {
    const newChatHandler = (newChat) => {
      setChats(prev => {
        if (prev.find(c => c._id?.toString() === newChat._id?.toString())) {
          return prev;
        }
        socket.emit("join-chat", newChat._id); 
        return [newChat, ...prev];
      });
    };

    socket.on("new-chat", newChatHandler);
    return () => socket.off("new-chat", newChatHandler);
  }, []);

  // Listen for chat renames
  useEffect(() => {
    const renameHandler = ({ chatId, name }) => {
      setChats(prev => prev.map(c => c._id === chatId ? { ...c, groupName: name } : c));
      setSelectedChat(prev => (prev?._id === chatId ? { ...prev, groupName: name } : prev));
    };
    socket.on("chat-renamed", renameHandler);
    return () => socket.off("chat-renamed", renameHandler);
  }, []);

  // Listen for chat membership/data updates
  useEffect(() => {
    const chatUpdateHandler = (updatedChat) => {
      setChats(prev => prev.map(c => c._id === updatedChat._id ? updatedChat : c));
      setSelectedChat(prev => (prev?._id === updatedChat._id ? updatedChat : prev));
    };
    socket.on("chat-updated", chatUpdateHandler);
    return () => socket.off("chat-updated", chatUpdateHandler);
  }, []);

  // Video Call Signaling
  useEffect(() => {
    const handleIncomingCall = ({ from, fromName, offer }) => {
      console.log("📞 Incoming call from:", fromName);
      setActiveVideoCall({ to: from, fromName, initialOffer: offer, isIncoming: true, callId: Date.now() });
    };

    socket.off("incoming-call"); // PREVENT DUPLICATES
    socket.on("incoming-call", handleIncomingCall);
    return () => socket.off("incoming-call", handleIncomingCall);
  }, []);

  //  CRITICAL: join ALL chat rooms once chats load
  useEffect(() => {
    if (!chats.length) return;

    chats.forEach(chat => {
      socket.emit("join-chat", chat._id);
    });
  }, [chats]);

  useEffect(() => {
    const currentUser = e2eeUser || getLoggedInUser();
    const currentDeviceId = getCurrentDeviceId();
    const requestedStorageKey = `relaychat-history-sync-requested-${currentUser?._id}-${currentDeviceId}`;

    // Auto-request disabled; new device will show banner and user clicks to request.
    if (!currentUser?._id || localStorage.getItem(requestedStorageKey) || !needsHistorySync(currentUser._id)) return;
    const hasOtherTrustedDevice = Array.isArray(currentUser.encryptionDevices)
      && currentUser.encryptionDevices.some((d) => d?.deviceId && d.deviceId !== currentDeviceId);
    if (!hasOtherTrustedDevice) return;
  }, [e2eeUser]);

  useEffect(() => {
    const handleHistorySyncRequest = ({ requestId, requesterDeviceId, requesterLabel }) => {
      if (!requestId || !requesterDeviceId || requesterDeviceId === getCurrentDeviceId()) {
        return;
      }
      setPendingHistorySyncApproval({ requestId, requesterDeviceId, requesterLabel });
    };

    const handleHistorySyncResponse = ({ approved }) => {
      if (!approved) {
        window.alert("History sync was not approved on your other device.");
      }
    };

    const handleHistorySyncComplete = ({ requesterDeviceId, syncedCount }) => {
      if (requesterDeviceId !== getCurrentDeviceId()) {
        return;
      }

      const currentUser = getLoggedInUser();
      if (currentUser?._id) {
        markHistorySyncComplete(currentUser._id);
      }
      window.alert(`Encrypted history synced for this device (${syncedCount} items). Reloading chats.`);
      window.location.reload();
    };

    socket.on("history-sync-requested", handleHistorySyncRequest);
    socket.on("history-sync-response", handleHistorySyncResponse);
    socket.on("history-sync-complete", handleHistorySyncComplete);

    return () => {
      socket.off("history-sync-requested", handleHistorySyncRequest);
      socket.off("history-sync-response", handleHistorySyncResponse);
      socket.off("history-sync-complete", handleHistorySyncComplete);
    };
  }, []);

  const requestHistorySync = () => {
    const currentUser = e2eeUser || getLoggedInUser();
    const currentDeviceId = getCurrentDeviceId();
    if (!currentUser?._id) return;

    const requestedStorageKey = `relaychat-history-sync-requested-${currentUser._id}-${currentDeviceId}`;
    setHistorySyncRequesting(true);
    socket.emit("request-history-sync", {
      requesterDeviceId: currentDeviceId,
      requesterLabel: getCurrentDeviceLabel(),
    }, (result) => {
      setHistorySyncRequesting(false);
      if (result?.ok) {
        localStorage.setItem(requestedStorageKey, "true");
        window.alert(`History sync request sent to ${result.deliveredCount} trusted device(s).`);
        return;
      }

      window.alert(result?.message || "No trusted browser received the history sync request.");
    });
  };

  const shouldShowHistorySyncBanner = () => {
    const currentUser = e2eeUser || getLoggedInUser();
    if (!currentUser?._id) return false;
    if (!needsHistorySync(currentUser._id)) return false;

    const currentDeviceId = getCurrentDeviceId();
    const hasOtherTrustedDevice = Array.isArray(currentUser.encryptionDevices)
      && currentUser.encryptionDevices.some((d) => d?.deviceId && d.deviceId !== currentDeviceId);
    if (!hasOtherTrustedDevice) return false;

    const requestedStorageKey = `relaychat-history-sync-requested-${currentUser._id}-${currentDeviceId}`;
    return !localStorage.getItem(requestedStorageKey);
  };

  const handlePINRestore = async () => {
    if (!restorePin || restorePin.length < 4) return setRestoreError("PIN too short");
    setRestoringPin(true);
    setRestoreError("");
    try {
      const { restorePrivateKeyFromCloud } = await import("../services/e2ee");
      const currentUser = e2eeUser || getLoggedInUser();
      
      // Attempt restore
      await restorePrivateKeyFromCloud(api, currentUser._id, restorePin);
      
      const currentDeviceId = getCurrentDeviceId();
      localStorage.removeItem(`relaychat-history-sync-needed-${currentUser._id}-${currentDeviceId}`);
      
      await ensureE2EERegistration(api, currentUser);
      
      window.location.reload();
    } catch (err) {
      console.error(err);
      setRestoreError("Invalid PIN or corrupted backup");
    } finally {
      setRestoringPin(false);
    }
  };

  const renderHistorySyncGate = () => {
    const currentUser = e2eeUser || getLoggedInUser();
    if (!currentUser?._id) return null;

    if (!needsHistorySync(currentUser._id)) return null;

    const currentDeviceId = getCurrentDeviceId();
    const otherTrustedDevices = Array.isArray(currentUser.encryptionDevices)
      ? currentUser.encryptionDevices.filter((d) => d?.deviceId && d.deviceId !== currentDeviceId)
      : [];
    const hasOtherTrustedDevice = otherTrustedDevices.length > 0;
    if (!hasOtherTrustedDevice) return null;

    const requestedStorageKey = `relaychat-history-sync-requested-${currentUser._id}-${currentDeviceId}`;
    const hasRequested = Boolean(localStorage.getItem(requestedStorageKey));

    const canRequest = hasOtherTrustedDevice && !hasRequested;

    return (
      <div className="flex h-screen w-full items-center justify-center auto-grid bg-whatsapp-bg-dark">
        <div className="flex flex-col items-center gap-6 rounded-3xl border border-sky-400/20 bg-slate-900/90 px-8 py-10 shadow-2xl backdrop-blur max-w-md w-full">
          <div className="h-16 w-16 rounded-2xl bg-sky-500/10 border border-sky-400/20 flex items-center justify-center">
            <span className="text-sky-400 text-2xl font-black">RC</span>
          </div>
          <div className="text-center space-y-2">
            <p className="text-xl font-bold text-white">Device Approval Needed</p>
            <p className="text-sm text-slate-400">
              Please approve this device from a logged-in trusted session to sync your encrypted history.
            </p>
          </div>
          {canRequest ? (
            <button
              onClick={requestHistorySync}
              disabled={historySyncRequesting}
              className="w-full interactive-btn rounded-xl bg-sky-500 py-3 text-sm font-bold text-white transition hover:bg-sky-400"
            >
              {historySyncRequesting ? "Requesting..." : "Send Request to Trusted Device"}
            </button>
          ) : (
            <p className="text-sm text-sky-400 font-semibold animate-pulse">
              Waiting for approval from a trusted device...
            </p>
          )}

          <div className="w-full h-px bg-white/10 my-2" />
          
          <div className="w-full text-center space-y-3">
            <p className="text-sm text-slate-300 font-medium">Remembered your Cloud PIN?</p>
            {restoreError && <p className="text-xs text-rose-400 font-medium">{restoreError}</p>}
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="4-Digit PIN"
                value={restorePin}
                onChange={(e) => setRestorePin(e.target.value)}
                className="w-3/5 px-4 py-2 bg-black/30 border border-white/10 rounded-xl text-center tracking-widest outline-none focus:border-emerald-400 transition-colors placeholder:text-slate-600"
              />
              <button
                onClick={handlePINRestore}
                disabled={restoringPin || !restorePin}
                className="w-2/5 rounded-xl bg-emerald-500 font-bold text-white transition hover:bg-emerald-400 disabled:opacity-50 text-sm"
              >
                {restoringPin ? "..." : "Restore"}
              </button>
            </div>
            <button 
              onClick={() => { localStorage.clear(); window.location.reload(); }}
              className="mt-4 text-xs text-slate-500 hover:text-white transition-colors underline"
            >
              Cancel and Logout
            </button>
          </div>
        </div>
      </div>
    );
  };

  const approveHistorySync = async () => {
    if (!pendingHistorySyncApproval) return;

    const { requestId, requesterDeviceId } = pendingHistorySyncApproval;
    socket.emit("respond-history-sync", { requestId, approved: true });
    setPendingHistorySyncApproval(null);

    try {
      const currentUser = getLoggedInUser();
      const refreshedProfile = await api.get("/user/profile");
      const updatedUser = refreshedProfile.data?.user || currentUser;
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setE2eeUser(updatedUser);
      const targetDevice = (updatedUser.encryptionDevices || []).find((device) => device.deviceId === requesterDeviceId);

      if (!targetDevice?.deviceId || !targetDevice?.publicKey) {
        throw new Error("Unable to find the requesting device for history sync");
      }

      const chatsResponse = await api.get("/chat/my-chats");
      const syncUpdates = [];

      for (const chat of chatsResponse.data || []) {
        const messagesResponse = await api.get(`/message/${chat._id}?includeDeleted=true`);
        const chatMessages = Array.isArray(messagesResponse.data) ? messagesResponse.data : [];

        const updatesForChat = await Promise.all(
          chatMessages.map((message) =>
            buildHistorySyncUpdate({
              message,
              currentUserId: currentUser?._id,
              targetUserId: currentUser?._id,
              targetDeviceId: targetDevice.deviceId,
              targetPublicKey: targetDevice.publicKey,
            }).catch(() => null)
          )
        );

        syncUpdates.push(...updatesForChat.filter(Boolean));
      }

      const chunkSize = 50;
      for (let index = 0; index < syncUpdates.length; index += chunkSize) {
        const chunk = syncUpdates.slice(index, index + chunkSize);
        if (chunk.length > 0) {
          await api.post("/message/sync-device-history", { updates: chunk });
        }
      }

      socket.emit("history-sync-finished", {
        requestId,
        requesterDeviceId: targetDevice.deviceId,
        syncedCount: syncUpdates.length,
      });
    } catch (error) {
      console.error("History sync failed:", error);
      window.alert(error.response?.data?.message || error.message || "Failed to sync encrypted history");
    }
  };

  const declineHistorySync = () => {
    if (!pendingHistorySyncApproval) return;
    socket.emit("respond-history-sync", { requestId: pendingHistorySyncApproval.requestId, approved: false });
    setPendingHistorySyncApproval(null);
  };

  const historySyncGate = renderHistorySyncGate();

  return historySyncGate ? historySyncGate : (
    <motion.div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      style={{
        "--x": x,
        "--y": y
      }}
      className="relative flex h-screen bg-whatsapp-bg-dark overflow-hidden group"
    >
      {/* Interactive Border Glow Layer */}
      <div className="proximity-glow opacity-0 group-hover:opacity-100" />

      {pendingHistorySyncApproval && (
        <div className="absolute top-4 right-4 z-50 max-w-sm rounded-2xl border border-emerald-400/20 bg-slate-900/95 p-4 shadow-2xl backdrop-blur">
          <p className="text-sm font-semibold text-white">Approve new device</p>
          <p className="mt-1 text-xs text-slate-400">
            {pendingHistorySyncApproval.requesterLabel || "A new browser"} wants access to your encrypted history.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={approveHistorySync}
              className="flex items-center gap-2 rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400"
            >
              <Check size={16} />
              Approve
            </button>
            <button
              onClick={declineHistorySync}
              className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/5"
            >
              <CloseIcon size={16} />
              Decline
            </button>
          </div>
        </div>
      )}

      {shouldShowHistorySyncBanner() && (
        <div className="absolute top-4 left-1/2 z-50 -translate-x-1/2 rounded-2xl border border-sky-400/20 bg-slate-900/95 px-4 py-3 shadow-2xl backdrop-blur">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-sm font-semibold text-white">New device detected</p>
              <p className="text-xs text-slate-400">Request encrypted history from an older logged-in browser.</p>
            </div>
            <button
              onClick={requestHistorySync}
              disabled={historySyncRequesting}
              className="rounded-xl bg-sky-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-sky-400"
            >
              {historySyncRequesting ? "Requesting..." : "Request History Sync"}
            </button>
          </div>
        </div>
      )}

      <Sidebar
        chats={chats}
        setChats={setChats}
        setSelectedChat={setSelectedChat}
        selectedChat={selectedChat}
        onlineUsers={onlineUsers}
        contacts={contacts}
        isAddingContact={isAddingContact}
        setIsAddingContact={setIsAddingContact}
        isCreatingGroup={isCreatingGroup}
        setIsCreatingGroup={setIsCreatingGroup}
      />

      <ChatWindow
        selectedChat={selectedChat}
        chats={chats}
        setSelectedChat={setSelectedChat}
        onlineUsers={onlineUsers}
        lastSeenMap={lastSeenMap}
        contacts={contacts}
        setContacts={setContacts}
        setChats={setChats}
        setIsAddingContact={setIsAddingContact}
        setIsCreatingGroup={setIsCreatingGroup}
        setActiveVideoCall={setActiveVideoCall}
      />

      {/* Global Video Call Overlay */}
      <AnimatePresence mode="wait">
        {activeVideoCall && (
          <VideoCall 
            key={activeVideoCall.callId || "call"}
            {...activeVideoCall} 
            onClose={() => {
              if (activeVideoCall) {
                const personId = (activeVideoCall.to?._id || activeVideoCall.to)?.toString();
                
                if (personId) {
                  const targetChat = chats.find(c => 
                    !c.isGroup && c.participants?.some(p => (p._id || p).toString() === personId)
                  );
                  
                  if (targetChat) {
                    setSelectedChat(targetChat);
                  }
                }
              }
              setActiveVideoCall(null);
            }} 
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
