import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";


void motion;

import { 
  Smile, 
  Paperclip, 
  Send, 
  UserPlus, 
  Users,
  X, 
  Check, 
  CheckCheck,
  MoreHorizontal, 
  Cpu, 
  FilePlus, 
  UserCheck, 
  Loader2,
  Circle,
  Edit2,
  Mic,
  Search as SearchIcon,
  ChevronUp,
  ChevronDown,
  UserMinus,
  AlertTriangle,
  Shield,
  Info,
  Phone,
  Plus,
  Video as VideoIcon,
  Palette,
  Trash2
} from "lucide-react";
import Message from "./Message";
import VoiceRecorder from "./VoiceRecorder";
import ContactInfoPanel from "./ContactInfoPanel";
import ThemeSelector from "./ThemeSelector";
import { useChatTheme, THEMES } from "../hooks/useChatTheme";
import socket from "../services/socket";
import api from "../services/api";
import { getLoggedInUser } from "../utils/auth";
import { buildDeviceRecipients, encryptAttachmentFile, encryptDirectMessage, encryptGroupMessage, hydrateDecryptedMessage } from "../services/e2ee";

const getEntityId = (value) => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    if (value._id) return value._id.toString();
    if (value.id) return value.id.toString();
    if (value.userId) return getEntityId(value.userId);
  }
  return value?.toString?.() || null;
};

const findReadReceipt = (message, participantId) => {
  if (!Array.isArray(message?.seenBy) || !participantId) return null;
  return message.seenBy.find((receipt) => getEntityId(receipt?.userId ?? receipt) === participantId) || null;
};

export default function ChatWindow({ 
  selectedChat, 
  setSelectedChat,
  chats = [],
  onlineUsers = [], 
  lastSeenMap = {}, 
  contacts = [], 
  setContacts, 
  setChats,
  setIsAddingContact,
  setIsCreatingGroup,
  setActiveVideoCall
}) {
  const myUserId = getLoggedInUser()?._id;
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeout = useRef(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const [isRenaming, setIsRenaming] = useState(false);
  const [tempGroupName, setTempGroupName] = useState("");
  
  const [showAddMember, setShowAddMember] = useState(false);
  const [showRemoveMember, setShowRemoveMember] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [adminNotice, setAdminNotice] = useState("");
  const [phoneToAdd, setPhoneToAdd] = useState("");
  const [isAddingByPhone, setIsAddingByPhone] = useState(false);

  const otherUser = Array.isArray(selectedChat?.participants) 
    ? selectedChat.participants.find(u => u && (u._id?.toString() || u.toString()) !== myUserId?.toString())
    : null;

  const isOnline = Array.isArray(onlineUsers) && otherUser?._id && onlineUsers.some(
    id => id?.toString() === otherUser._id.toString()
  );
  
  const lastSeen = lastSeenMap[otherUser?._id];
  const lastSeenText = (() => {
    try {
      if (!lastSeen) return "Offline";
      const date = new Date(lastSeen);
      if (isNaN(date.getTime())) return "Offline";
      return `Available ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return "Offline";
    }
  })();

  const savedContact = otherUser ? contacts.find(c => c.userId?.toString() === otherUser?._id?.toString()) : null;
  const displayName = (selectedChat?.isGroup ? selectedChat.groupName : (savedContact ? savedContact.savedName : (otherUser?.phoneNumber || otherUser?.name || "Unknown"))) || "Unknown";

  const [showAddContact, setShowAddContact] = useState(false);
  const [newContactName, setNewContactName] = useState("");
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  
  // New Menu & Search State
  const [showMenu, setShowMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);
  const [searchResults, setSearchResults] = useState([]);
  const [showDeleted, setShowDeleted] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [recipientEncryptionUser, setRecipientEncryptionUser] = useState(null);
  const [groupEncryptionUsers, setGroupEncryptionUsers] = useState({});

  // Per-chat theme
  const [savedThemeName, setSavedThemeName] = useChatTheme(selectedChat?._id);
  const [activeThemeName, setActiveThemeName] = useState(savedThemeName);

  // Sync state if savedThemeName changes externally (e.g. from dashboard global setting)
  useEffect(() => {
    setActiveThemeName(savedThemeName);
  }, [savedThemeName]);

  const theme = THEMES[activeThemeName] || THEMES.stealth_dark;

  // Message info modal
  const [showMessageInfo, setShowMessageInfo] = useState(false);
  const [selectedMessageInfoId, setSelectedMessageInfoId] = useState(null);
  
  const handlePaste = (e) => {
    if (e.clipboardData && e.clipboardData.files.length > 0) {
      e.preventDefault(); // Prevent pasting file/image as text (like data-url)
      const file = e.clipboardData.files[0];
      setSelectedFile(file);
      if (showSearch) setShowSearch(false); // If they were in search mode, exit to show the attachment preview
    }
  };

  const handleShowMessageInfo = (message) => {
    setSelectedMessageInfoId(message?._id || null);
    setShowMessageInfo(true);
  };

  const selectedMessageForInfo = selectedMessageInfoId
    ? messages.find((message) => message?._id?.toString() === selectedMessageInfoId.toString()) || null
    : null;

  const closeMessageInfo = () => {
    setShowMessageInfo(false);
    setSelectedMessageInfoId(null);
  };

  const handleThemeSelect = useCallback((name) => {
    setActiveThemeName(name);
    setSavedThemeName(name);
    setShowThemePicker(false);
  }, [setSavedThemeName]);

  const menuRef = useRef(null);

  const pastChatUsers = Array.from(new Map(
    chats
      .filter(c => !c.isGroup)
      .map(c => {
        const u = c.participants.find(p => (p?._id?.toString() || p?.toString()) !== myUserId?.toString());
        return u ? [(u._id || u).toString(), u] : null;
      })
      .filter(Boolean)
  ).values());

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (q) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      setCurrentSearchIndex(-1);
      return;
    }
    const results = messages
      .map((m, idx) => m.content?.toLowerCase().includes(q.toLowerCase()) ? idx : null)
      .filter(idx => idx !== null);
    setSearchResults(results);
    if (results.length > 0) {
      setCurrentSearchIndex(results.length - 1); // Point to latest match first
      const firstMatchId = messages[results[results.length - 1]]._id;
      document.getElementById(`msg-${firstMatchId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      setCurrentSearchIndex(-1);
    }
  };

  const navigateSearch = (dir) => {
    if (searchResults.length === 0) return;
    let nextIdx = currentSearchIndex + dir;
    if (nextIdx < 0) nextIdx = searchResults.length - 1;
    if (nextIdx >= searchResults.length) nextIdx = 0;
    setCurrentSearchIndex(nextIdx);
    const matchId = messages[searchResults[nextIdx]]._id;
    document.getElementById(`msg-${matchId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleVoiceSend = async (blob) => {
    try {
      const file = new File([blob], `voice-note-${Date.now()}.webm`, { type: "audio/webm" });
      const formData = new FormData();
      formData.append("file", file);
      formData.append("chatId", selectedChat._id);
      formData.append("content", "🎤 Voice Message");

      await api.post("/message/upload", formData);
      setIsVoiceRecording(false);
    } catch (err) {
      console.error("Error sending voice message:", err);
      setIsVoiceRecording(false);
    }
  };

  const handleRenameChat = async () => {
    if (!tempGroupName.trim() || tempGroupName === displayName) {
      return setIsRenaming(false);
    }
    try {
      if (selectedChat.isGroup) {
        const res = await api.put(`/chat/${selectedChat._id}/rename`, { name: tempGroupName });
        selectedChat.groupName = res.data.groupName;
        setChats(prev => prev.map(c => c._id === selectedChat._id ? { ...c, groupName: res.data.groupName } : c));
      } else {
        const res = await api.post("/user/save-contact", { 
          targetUserId: otherUser._id, 
          savedName: tempGroupName 
        });
        const myUser = getLoggedInUser();
        const updatedUser = { ...myUser, contacts: res.data.contacts };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setContacts(res.data.contacts);
      }
      setIsRenaming(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearChat = async () => {
    try {
      if (window.confirm("Are you sure you want to clear this chat? This will remove all messages from your view.")) {
        await api.delete(`/message/clear/${selectedChat._id}`);
        setMessages([]);
        setShowMenu(false);
      }
    } catch (err) {
      console.error("Error clearing chat:", err);
    }
  };

  const handleAddContact = async () => {
    if (!newContactName.trim()) return;
    try {
      const res = await api.post("/user/save-contact", { 
        targetUserId: otherUser._id, 
        savedName: newContactName 
      });
      const myUser = getLoggedInUser();
      const updatedUser = { ...myUser, contacts: res.data.contacts };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setContacts(res.data.contacts);
      setShowAddContact(false);
      setNewContactName("");
    } catch(err) {
      console.error(err);
    }
  };

  const handleAddMemberToGroup = async (userId) => {
    try {
      const res = await api.post(`/chat/${selectedChat._id}/add-to-group`, { userId });
      // Update the chat in local state
      setChats(prev => prev.map(c => c._id === selectedChat._id ? res.data : c));
      setSelectedChat(res.data);
      setShowAddMember(false);
      setPhoneToAdd("");
    } catch (err) {
      console.error(err);
      setAdminNotice(err.response?.data?.message || "Failed to add member");
      setTimeout(() => setAdminNotice(""), 3000);
    } finally {
      setIsAddingByPhone(false);
    }
  };

  const handleAddMemberByPhone = async () => {
    if (!phoneToAdd.trim()) return;
    setIsAddingByPhone(true);
    try {
      const res = await api.post("/chat/start", { phone: phoneToAdd.trim() });
      const targetUserId = res.data.chat?.participants?.find(p => (p._id || p).toString() !== myUserId?.toString())?._id || res.data.receiver_id;
      
      if (!targetUserId) throw new Error("User not found");
      
      await handleAddMemberToGroup(targetUserId);
    } catch (err) {
      console.error(err);
      setAdminNotice(err.response?.data?.message || "User not found or unreachable");
      setTimeout(() => setAdminNotice(""), 3000);
      setIsAddingByPhone(false);
    }
  };

  const handleRemoveMemberFromGroup = async (userId) => {
    try {
      const res = await api.post(`/chat/${selectedChat._id}/remove-from-group`, { userId });
      setChats(prev => prev.map(c => c._id === selectedChat._id ? res.data : c));
      setSelectedChat(res.data);
      setShowRemoveMember(false);
    } catch (err) {
      console.error(err);
      setAdminNotice(err.response?.data?.message || "Failed to remove member");
      setTimeout(() => setAdminNotice(""), 3000);
    }
  };

  useEffect(() => {
    if (!selectedChat?._id) return;

    let isCancelled = false;

    const loadMessages = async () => {
      try {
        const res = await api.get(`/message/${selectedChat._id}?includeDeleted=${showDeleted}`);
        if (isCancelled) return;

        if (Array.isArray(res.data)) {
          const sorted = res.data.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          const hydratedMessages = await Promise.all(
            sorted.map((message) => hydrateDecryptedMessage(message, myUserId))
          );
          setMessages(hydratedMessages);
        } else {
          setMessages([]);
        }

        socket.emit("join-chat", selectedChat._id);
        socket.emit("open-chat", selectedChat._id);
        socket.emit("mark-seen", { chatId: selectedChat._id });
      } catch (err) {
        if (isCancelled) return;
        console.error("Failed to fetch messages:", err);
        setMessages([]);
      }
    };

    loadMessages();

    // Reset overlays on chat change
    setShowParticipants(false);
    setShowAddMember(false);
    setShowRemoveMember(false);
    setShowMenu(false);
    setShowSearch(false);
    setShowAddContact(false);
    setAdminNotice("");
    setIsRenaming(false);
    setShowThemePicker(false);
    closeMessageInfo();

    return () => {
      isCancelled = true;
      socket.emit("close-chat", selectedChat._id);
    };
  }, [selectedChat, showDeleted, myUserId]);

  useEffect(() => {
    if (!selectedChat?._id) return;

    const syncActiveChat = () => {
      if (document.visibilityState === "visible") {
        socket.emit("open-chat", selectedChat._id);
        socket.emit("mark-seen", { chatId: selectedChat._id });
      }
    };

    window.addEventListener("focus", syncActiveChat);
    document.addEventListener("visibilitychange", syncActiveChat);

    return () => {
      window.removeEventListener("focus", syncActiveChat);
      document.removeEventListener("visibilitychange", syncActiveChat);
    };
  }, [selectedChat?._id]);

  const selectedChatParticipantIds = (selectedChat?.participants || [])
    .map((participant) => getEntityId(participant))
    .filter(Boolean)
    .join(",");
  const selectedDirectRecipientId = (selectedChat?.participants || [])
    .map((participant) => getEntityId(participant))
    .find((participantId) => participantId !== myUserId?.toString()) || null;

  useEffect(() => {
    if (selectedChat?.isGroup || !selectedChat?._id) {
      setRecipientEncryptionUser(null);
      return;
    }

    if (!selectedDirectRecipientId) {
      setRecipientEncryptionUser(null);
      return;
    }

    let cancelled = false;

    const loadRecipientKey = async () => {
      try {
        const latestRecipient = await api.get(`/user/${selectedDirectRecipientId}/key`);
        if (!cancelled) {
          setRecipientEncryptionUser(latestRecipient.data?.user || null);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to preload recipient encryption key:", error);
          setRecipientEncryptionUser(null);
        }
      }
    };

    loadRecipientKey();

    return () => {
      cancelled = true;
    };
  }, [selectedChat?._id, selectedChat?.isGroup, selectedChatParticipantIds, selectedDirectRecipientId]);

  useEffect(() => {
    if (!selectedChat?._id || !selectedChat?.isGroup) {
      setGroupEncryptionUsers({});
      return;
    }

    const participantIds = selectedChatParticipantIds
      .split(",")
      .map((participantId) => participantId.trim())
      .filter(Boolean);

    if (participantIds.length === 0) {
      setGroupEncryptionUsers({});
      return;
    }

    let cancelled = false;

    const loadGroupKeys = async () => {
      try {
        const keyEntries = await Promise.all(
          participantIds.map(async (participantId) => {
            const response = await api.get(`/user/${participantId}/key`);
            return [participantId, response.data?.user || null];
          })
        );

        if (!cancelled) {
          setGroupEncryptionUsers(Object.fromEntries(keyEntries.filter(([, user]) => user)));
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to preload group encryption keys:", error);
          setGroupEncryptionUsers({});
        }
      }
    };

    loadGroupKeys();

    return () => {
      cancelled = true;
    };
  }, [selectedChat?._id, selectedChat?.isGroup, selectedChatParticipantIds]);

  // Sync theme when chat changes
  useEffect(() => {
    if (selectedChat?._id) {
      const stored = localStorage.getItem(`chat-theme-${selectedChat._id}`) || "neon";
      setActiveThemeName(stored);
    }
  }, [selectedChat?._id]);

  useEffect(() => {
    const handleTyping = () => setIsTyping(true);
    const handleStopTyping = () => setIsTyping(false);
    socket.on("typing", handleTyping);
    socket.on("stop-typing", handleStopTyping);
    return () => {
      socket.off("typing", handleTyping);
      socket.off("stop-typing", handleStopTyping);
    };
  }, []);

  useEffect(() => {
    const handler = async (msg) => {
      if (!msg || !selectedChat?._id || !msg.chat) return;
      if (getEntityId(msg.chat) !== selectedChat._id.toString()) return;
      const hydratedMessage = await hydrateDecryptedMessage(msg, myUserId);
      setMessages((prev) => {
        if (msg.clientTempId) {
          const optimisticIndex = prev.findIndex((message) => message._id === msg.clientTempId);
          if (optimisticIndex !== -1) {
            const updatedMessages = [...prev];
            updatedMessages[optimisticIndex] = hydratedMessage;
            return updatedMessages;
          }
        }
        return [...prev, hydratedMessage];
      });
      if (getEntityId(msg.sender) !== myUserId?.toString()) {
        socket.emit("mark-seen", { chatId: selectedChat._id });
      }
    };

    const statusHandler = ({ messageId }) => {
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, status: "delivered" } : m));
    };

    const seenHandler = ({ chatId, readerId, readerIds = [], readAt, messageIds = [], messages: updatedMessages }) => {
      if (chatId?.toString() === selectedChat?._id?.toString()) {
        const normalizedReaderIds = [
          ...new Set([readerId, ...readerIds].filter(Boolean).map((value) => value.toString()))
        ];

        if (updatedMessages && Array.isArray(updatedMessages)) {
          const updatedById = new Map(
            updatedMessages.map((message) => [message._id.toString(), message])
          );

          setMessages(prev =>
            prev.map((message) => {
              const updated = updatedById.get(message._id.toString());
              return updated
                ? { ...message, seenBy: updated.seenBy, status: updated.status || "seen" }
                : message;
            })
          );
        } else {
          setMessages(prev =>
            prev.map((message) =>
              getEntityId(message.sender) === myUserId?.toString() &&
              (messageIds.length === 0 || messageIds.includes(message._id?.toString()))
                ? {
                    ...message,
                    status: "seen",
                    seenBy: [
                      ...(message.seenBy || []).filter(
                        (receipt) => !normalizedReaderIds.includes(getEntityId(receipt?.userId ?? receipt))
                      ),
                      ...normalizedReaderIds.map((id) => ({ userId: id, readAt }))
                    ]
                  }
                : message
            )
          );
        }
      }
    };

    const deleteForMeHandler = ({ messageId }) => {
      if (!showDeleted) {
        setMessages(prev => prev.filter(m => m._id !== messageId));
      } else {
        // If showing deleted, we just need to re-fetch or update the message status locally
        // For simplicity, let's just update the local message object if we have it
        setMessages(prev => prev.map(m => m._id === messageId ? { ...m, deletedFor: [...(m.deletedFor || []), myUserId] } : m));
      }
    };

    const restoreForMeHandler = ({ messageId }) => {
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, deletedFor: (m.deletedFor || []).filter(id => id !== myUserId) } : m));
    };

    const deleteForEveryoneHandler = ({ messageId }) => {
      setMessages(prev => prev.map(m => m?._id === messageId ? { ...m, content: "This message was deleted", isDeleted: true } : m));
    };

    const reactionHandler = (updatedMessage) => {
      if (!updatedMessage?._id) return;
      setMessages(prev => prev.map(m => m?._id === updatedMessage._id ? updatedMessage : m));
    };

    socket.on("new-message", handler);
    socket.on("message-delivered", statusHandler);
    socket.on("message-seen", seenHandler);
    socket.on("message-deleted-for-me", deleteForMeHandler);
    socket.on("message-restored-for-me", restoreForMeHandler);
    socket.on("message-deleted-for-everyone", deleteForEveryoneHandler);
    socket.on("message-reacted", reactionHandler);

    return () => {
      socket.off("new-message", handler);
      socket.off("message-delivered", statusHandler);
      socket.off("message-seen", seenHandler);
      socket.off("message-deleted-for-me", deleteForMeHandler);
      socket.off("message-restored-for-me", restoreForMeHandler);
      socket.off("message-deleted-for-everyone", deleteForEveryoneHandler);
      socket.off("message-reacted", reactionHandler);
    };
  }, [selectedChat, myUserId, showDeleted]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() && !selectedFile) return;
    if (selectedFile) sendFileAndText();
    else {
      let clientTempId = null;
      const messageText = text;
      try {
        setText("");
        const recipient = (selectedChat?.participants || []).find(
          (participant) => getEntityId(participant) !== myUserId?.toString()
        );

        if (!selectedChat?.isGroup && recipient) {
          const currentUser = getLoggedInUser();
          const recipientDevices = buildDeviceRecipients([recipientEncryptionUser || recipient]);
          const senderRecipients = buildDeviceRecipients([currentUser || { _id: myUserId }]);
          const recipients = [...senderRecipients, ...recipientDevices];

          if (recipientDevices.length === 0) {
            throw new Error("Recipient encryption key is not registered yet");
          }

          clientTempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          setMessages((prev) => [
            ...prev,
            {
              _id: clientTempId,
              chat: selectedChat._id,
              sender: { _id: myUserId },
              content: messageText,
              createdAt: new Date().toISOString(),
              status: "sent",
              seenBy: [],
              reactions: [],
            }
          ]);

          const encryptedPayload = await encryptDirectMessage({
            content: messageText,
            recipients,
          });

          socket.emit("send-message", {
            chatId: selectedChat._id,
            encryptedPayload,
            clientTempId,
          });
        } else if (selectedChat?.isGroup) {
          const participantUsers = (selectedChat?.participants || [])
            .map((participant) => {
              const participantId = getEntityId(participant);
              return groupEncryptionUsers[participantId] || participant;
            });
          const recipients = buildDeviceRecipients(participantUsers);
          const missingParticipantKey = participantUsers.find((participant) => buildDeviceRecipients([participant]).length === 0);

          if (missingParticipantKey) {
            socket.emit("send-message", {
              chatId: selectedChat._id,
              content: messageText,
            });
            return;
          }

          clientTempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          setMessages((prev) => [
            ...prev,
            {
              _id: clientTempId,
              chat: selectedChat._id,
              sender: { _id: myUserId },
              content: messageText,
              createdAt: new Date().toISOString(),
              status: "sent",
              seenBy: [],
              reactions: [],
            }
          ]);

          const encryptedPayload = await encryptGroupMessage({
            content: messageText,
            recipients,
          });

          socket.emit("send-message", {
            chatId: selectedChat._id,
            encryptedPayload,
            clientTempId,
          });
        } else {
          socket.emit("send-message", {
            chatId: selectedChat._id,
            content: messageText,
          });
        }
      } catch (error) {
        console.error("Failed to send encrypted message:", error);
        if (clientTempId) {
          setMessages((prev) => prev.filter((message) => message._id !== clientTempId));
        }
        setText((current) => current || messageText);
        window.alert(error.message || "Failed to send encrypted message");
      }
    }
  };

  const sendFileAndText = async () => {
    try {
      const formData = new FormData();
      formData.append("chatId", selectedChat._id);

      if (!selectedChat?.isGroup && selectedDirectRecipientId && recipientEncryptionUser) {
        const { encryptedFile, metadata } = await encryptAttachmentFile({
          file: selectedFile,
          recipients: [
            ...buildDeviceRecipients([getLoggedInUser()]),
            ...buildDeviceRecipients([recipientEncryptionUser || { _id: selectedDirectRecipientId }]),
          ],
        });

        formData.append("encryptedFileMetadata", JSON.stringify(metadata));
        formData.append("fileName", selectedFile.name);
        formData.append("fileType", selectedFile.type);
        formData.append("file", encryptedFile);

        if (text.trim()) {
          const encryptedPayload = await encryptDirectMessage({
            content: text,
            recipients: [
              ...buildDeviceRecipients([getLoggedInUser()]),
              ...buildDeviceRecipients([recipientEncryptionUser || { _id: selectedDirectRecipientId }]),
            ],
          });
          formData.append("encryptedPayload", JSON.stringify(encryptedPayload));
        }
      } else if (selectedChat?.isGroup) {
        const participantUsers = (selectedChat?.participants || [])
          .map((participant) => {
            const participantId = getEntityId(participant);
            return groupEncryptionUsers[participantId] || participant;
          });
        const recipients = buildDeviceRecipients(participantUsers);
        const missingParticipantKey = participantUsers.find((participant) => buildDeviceRecipients([participant]).length === 0);

        if (!missingParticipantKey) {
          const { encryptedFile, metadata } = await encryptAttachmentFile({
            file: selectedFile,
            recipients,
          });

          formData.append("encryptedFileMetadata", JSON.stringify(metadata));
          formData.append("fileName", selectedFile.name);
          formData.append("fileType", selectedFile.type);
          formData.append("file", encryptedFile);

          if (text.trim()) {
            const encryptedPayload = await encryptGroupMessage({
              content: text,
              recipients,
            });
            formData.append("encryptedPayload", JSON.stringify(encryptedPayload));
          }
        } else {
          formData.append("file", selectedFile);
          if (text.trim()) formData.append("content", text);
        }
      } else {
        formData.append("file", selectedFile);
        if (text.trim()) formData.append("content", text);
      }

      await api.post("/message/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setSelectedFile(null);
      setText("");
    } catch (err) {
      console.error("Upload failed", err);
      window.alert(err.response?.data?.message || "Failed to upload attachment");
    }
  };

  if (!selectedChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0b0e14]">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl px-8"
        >
          {[
            { icon: <FilePlus className="text-emerald-400" />, title: "Collaborate", desc: "Share documents and media instantly." },
            { icon: <UserPlus className="text-sky-400" />, title: "Expand Network", desc: "Start a conversation with anyone." },
            { icon: <Cpu className="text-amber-400" />, title: "AI Powered", desc: "Ask our intelligence for assistance." }
          ].map((card, i) => (
            <motion.div 
              key={i}
              whileHover={{ y: -5, backgroundColor: "rgba(255,255,255,0.05)" }}
              className="glass-card p-6 flex flex-col items-center text-center group cursor-pointer"
            >
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-4 group-hover:bg-white/10 transition-colors">
                {card.icon}
              </div>
              <h3 className="text-white font-bold mb-2">{card.title}</h3>
              <p className="text-slate-500 text-xs leading-relaxed">{card.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className="flex-1 flex flex-col h-full relative overflow-hidden"
      style={{ background: theme.background, transition: "background 0.4s ease, color 0.3s ease" }}
    >
      {/* Contact Info Slide-in Panel */}
      {showContactInfo && !selectedChat?.isGroup && (
        <ContactInfoPanel
          user={otherUser}
          displayName={displayName}
          onClose={() => setShowContactInfo(false)}
          onVideoCall={() => { setShowContactInfo(false); setActiveVideoCall?.({ chatId: selectedChat._id, recipientId: otherUser?._id, isVideo: true }); }}
          onVoiceCall={() => { setShowContactInfo(false); setActiveVideoCall?.({ chatId: selectedChat._id, recipientId: otherUser?._id, isVideo: false }); }}
          onSearch={() => { setShowContactInfo(false); setShowSearch(true); }}
          onClearChat={() => { setShowContactInfo(false); }}
        />
      )}

      {/* Modern Ethereal Ambient Background */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Static Theme Glows (Disabled for Minimal Themes) */}
        {!theme.pattern && (
          <>
            <div 
              className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full blur-[120px] opacity-20 transition-colors duration-700"
              style={{ background: theme.primary }} 
            />
            <div 
              className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full blur-[120px] opacity-10 transition-colors duration-700"
              style={{ background: theme.primary }} 
            />
          </>
        )}

        {/* Vector / CSS Pattern Overlay */}
        {theme.pattern ? (
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: theme.pattern,
              backgroundSize: theme.patternSize || "16px 16px",
            }} 
          />
        ) : (
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: "url('/premium-chat-pattern.svg')",
              backgroundSize: "240px 240px",
              backgroundRepeat: "repeat",
              opacity: 1
            }} 
          />
        )}
      </div>

      {/* Header */}
      <div
        className="h-16 px-6 backdrop-blur-xl border-b border-[#45484f]/15 flex items-center justify-between z-20"
        style={{ background: "#111b21ea" }}
      >
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold bg-[$theme.primary]/10 text-[$theme.primary]`}>
              {selectedChat.isGroup ? <Users size={20} /> : (
                otherUser?.avatar ? (
                  <img 
                    src={`http://localhost:5002${otherUser.avatar}`} 
                    alt={displayName} 
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (displayName?.[0]?.toUpperCase() || "?")
              )}
            </div>
            {!selectedChat.isGroup && isOnline && (
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[$theme.primary] border-2 border-[#10131a] rounded-full shadow-lg" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-3">
              {isRenaming ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={tempGroupName}
                    onChange={(e) => setTempGroupName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleRenameChat()}
                    className="bg-black/20 border border-[$theme.primary]/30 rounded-lg px-2 py-1 text-sm text-white outline-none focus:border-[$theme.primary]"
                    autoFocus
                  />
                  <button onClick={handleRenameChat} className="p-1 text-[$theme.primary] hover:bg-[$theme.primary]/10 rounded-lg"><Check size={16} /></button>
                  <button onClick={() => setIsRenaming(false)} className="p-1 text-rose-400 hover:bg-rose-500/10 rounded-lg"><X size={16} /></button>
                </div>
              ) : (
                <>
                  <h3
                    className="text-sm font-bold text-white tracking-wide cursor-pointer hover:text-[#c59aff] transition-colors"
                    onClick={() => !selectedChat?.isGroup && setShowContactInfo(p => !p)}
                    title={!selectedChat?.isGroup ? "View contact info" : undefined}
                  >{displayName}</h3>
                  <button 
                    onClick={() => {
                      setIsRenaming(true);
                      setTempGroupName(displayName);
                    }}
                    className="p-1 text-slate-500 hover:text-[$theme.primary] transition-colors"
                  >
                    <Edit2 size={14} />
                  </button>
                </>
              )}
              <AnimatePresence>
                {!selectedChat?.isGroup && !savedContact && otherUser && (
                  <motion.button 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    onClick={() => setShowAddContact(true)} 
                    className="flex items-center gap-1.5 px-2 py-0.5 bg-[$theme.primary]/10 text-[$theme.primary] text-[10px] font-black uppercase rounded-full hover:bg-[$theme.primary] hover:text-[#0b0e14] transition-all"
                  >
                    <UserPlus size={10} /> Add Contact
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold uppercase tracking-widest ${isTyping || isOnline ? 'text-[$theme.primary]' : 'text-slate-500'}`}>
                {isTyping ? (
                  <span className="flex items-center gap-1">
                    <Circle className="animate-pulse fill-[$theme.primary]" size={4} />
                    Refining thoughts...
                  </span>
                ) : selectedChat?.isGroup ? (
                   `Joined • ${selectedChat.createdAt ? new Date(selectedChat.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : "Recently"}`
                ) : isOnline ? "Active Now" : lastSeenText}
              </span>
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-3 relative" ref={menuRef}>
          {/* Theme Picker Button */}
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowThemePicker(p => !p)}
              className="p-2 rounded-lg transition-all"
              style={{
                background: showThemePicker ? theme.primary : "rgba(0,0,0,0.08)",
                color: showThemePicker ? "#fff" : theme.primary,
              }}
              title="Change chat theme"
            >
              <Palette size={20} />
            </motion.button>
            {showThemePicker && (
              <ThemeSelector
                currentTheme={activeThemeName}
                onSelect={handleThemeSelect}
                onClose={() => setShowThemePicker(false)}
              />
            )}
          </div>

          {!selectedChat.isGroup && (
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                const myName = getLoggedInUser()?.name || "Someone";
                setActiveVideoCall({ 
                  to: otherUser?._id || otherUser, 
                  fromName: myName, 
                  isIncoming: false,
                  callId: Date.now()
                });
              }}
              className="p-2 rounded-lg transition-all"
              style={{ color: theme.primary, background: "rgba(0,0,0,0.06)" }}
            >
              <VideoIcon size={20} />
            </motion.button>
          )}
          
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className={`p-2 rounded-lg transition-all ${showMenu ? 'bg-[$theme.primary] text-[#0b0e14]' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            <MoreHorizontal size={20} />
          </button>

          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute top-12 right-0 w-48 bg-[#10131a] border border-[#45484f]/30 rounded-xl shadow-2xl py-2 z-50 backdrop-blur-xl"
              >
                <button 
                  onClick={() => { setShowSearch(true); setShowMenu(false); }}
                  className="w-full px-4 py-2.5 flex items-center gap-3 text-left text-sm text-slate-300 hover:bg-white/5 hover:text-[$theme.primary] transition-all"
                >
                  <SearchIcon size={16} /> Search Messages
                </button>
                <button 
                  onClick={() => { setShowParticipants(true); setShowMenu(false); }}
                  className="w-full px-4 py-2.5 flex items-center gap-3 text-left text-sm text-slate-300 hover:bg-white/5 hover:text-[$theme.primary] transition-all"
                >
                  <Users size={16} /> View Participants
                </button>
                <button 
                  onClick={() => { setIsRenaming(true); setTempGroupName(displayName); setShowMenu(false); }}
                  className="w-full px-4 py-2.5 flex items-center gap-3 text-left text-sm text-slate-300 hover:bg-white/5 hover:text-[$theme.primary] transition-all"
                >
                  <Edit2 size={16} /> Rename {selectedChat.isGroup ? "Group" : "Chat"}
                </button>
                
                {selectedChat.isGroup && (
                  <>
                    <button 
                      onClick={() => { 
                        const adminId = selectedChat.groupAdmin?._id?.toString() || selectedChat.groupAdmin?.toString();
                        if (adminId && adminId === myUserId?.toString()) {
                          setShowAddMember(true); 
                          setShowMenu(false); 
                        } else {
                          setAdminNotice("Only group admin can add members");
                          setShowMenu(false);
                          setTimeout(() => setAdminNotice(""), 3000);
                        }
                      }}
                      className="w-full px-4 py-2.5 flex items-center gap-3 text-left text-sm text-slate-300 hover:bg-white/5 hover:text-[$theme.primary] transition-all"
                    >
                      <UserPlus size={16} /> Add Member
                    </button>
                    <button 
                      onClick={() => { 
                        const adminId = selectedChat.groupAdmin?._id?.toString() || selectedChat.groupAdmin?.toString();
                        if (adminId && adminId === myUserId?.toString()) {
                          setShowRemoveMember(true); 
                          setShowMenu(false); 
                        } else {
                          setAdminNotice("Only group admin can remove members");
                          setShowMenu(false);
                          setTimeout(() => setAdminNotice(""), 3000);
                        }
                      }}
                      className="w-full px-4 py-2.5 flex items-center gap-3 text-left text-sm text-slate-300 hover:bg-white/5 hover:text-rose-400 transition-all"
                    >
                      <UserMinus size={16} /> Remove Member
                    </button>
                  </>
                )}
                {!selectedChat?.isGroup && !savedContact && (
                  <button 
                    onClick={() => { setShowAddContact(true); setShowMenu(false); }}
                    className="w-full px-4 py-2.5 flex items-center gap-3 text-left text-sm text-slate-300 hover:bg-white/5 hover:text-[$theme.primary] transition-all"
                  >
                    <UserPlus size={16} /> Add to Contacts
                  </button>
                )}
                <div className="h-px bg-white/5 my-1" />
                <button 
                  onClick={() => { setShowDeleted(!showDeleted); setShowMenu(false); }}
                  className={`w-full px-4 py-2.5 flex items-center gap-3 text-left text-sm transition-all ${showDeleted ? 'text-[$theme.primary] bg-[$theme.primary]/5' : 'text-slate-300 hover:bg-white/5 hover:text-[$theme.primary]'}`}
                >
                  <Cpu size={16} /> {showDeleted ? "Hide Retracted" : "Reveal Hidden Messages"}
                </button>
                <div className="h-px bg-white/5 my-1" />
                <button 
                  onClick={handleClearChat}
                  className="w-full px-4 py-2.5 flex items-center gap-3 text-left text-sm text-slate-300 hover:bg-rose-500/10 hover:text-rose-400 transition-all"
                >
                  <Trash2 size={16} /> Clear Chat
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto pt-4 pb-20 custom-scrollbar relative">
        <AnimatePresence mode="popLayout">
          {messages && Array.isArray(messages) && messages.map((m, i) => {
            if (!m || !m._id) return null;
            return (
              <Message 
                key={m._id} 
                id={`msg-${m._id}`}
                message={m} 
                isOwn={(m.sender?._id || m.sender)?.toString() === myUserId?.toString()}
                participantIds={(selectedChat?.participants || []).map((participant) => getEntityId(participant)).filter(Boolean)}
                isGroupChat={Boolean(selectedChat?.isGroup)}
                onDeleteMe={(msgId) => socket.emit("delete-for-me", { messageId: msgId })}
                onDeleteEveryone={(msgId) => socket.emit("delete-for-everyone", { messageId: msgId, chatId: selectedChat?._id })}
                onShowMessageInfo={handleShowMessageInfo}
                searchQuery={searchQuery}
                isHighlighted={searchResults[currentSearchIndex] === i}
                theme={theme}
              />
            );
          })}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Footer Interface */}
      <footer
        className="p-4 border-t border-[#45484f]/15 z-10 relative"
        style={{ background: "#111b21ea", backdropFilter: "blur(20px)" }}
      >
        <AnimatePresence mode="wait">
          {isVoiceRecording ? (
            <motion.div
              key="voice-recorder"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="w-full"
            >
              <VoiceRecorder 
                onSend={handleVoiceSend} 
                onCancel={() => setIsVoiceRecording(false)} 
              />
            </motion.div>
          ) : (
            <motion.div
              key="chat-input"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full"
            >
              <AnimatePresence>
                {selectedFile && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl mb-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-500/20 rounded-lg"><FilePlus className="text-emerald-400" size={16} /></div>
                      <span className="text-xs font-bold text-slate-300 truncate max-w-xs">{selectedFile.name}</span>
                    </div>
                    <button onClick={() => setSelectedFile(null)} className="p-1.5 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-all"><X size={16} /></button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center gap-3 relative">
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className={`p-2 rounded-xl transition-all ${showEmojiPicker ? 'bg-white/30 text-white' : 'text-white/80 hover:text-white hover:bg-white/20'}`}
                  >
                    <Smile size={22} />
                  </button>
                  <button 
                    onClick={() => fileInputRef.current.click()}
                    className="p-2 text-white/80 hover:text-white rounded-xl hover:bg-white/20 transition-all"
                  >
                    <Paperclip size={22} />
                  </button>
                </div>
                
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) setSelectedFile(file);
                  }}
                />

                <div className="flex-1 relative">
                  <input
                    value={text}
                    onChange={e => {
                      setText(e.target.value);
                      socket.emit("typing", selectedChat._id);
                      clearTimeout(typingTimeout.current);
                      typingTimeout.current = setTimeout(() => {
                        socket.emit("stop-typing", selectedChat._id);
                      }, 1500);
                    }}
                    onKeyDown={e => e.key === "Enter" && handleSend()}
                    onPaste={handlePaste}
                    placeholder="Express yourself..."
                    className="w-full rounded-2xl px-5 py-3 text-sm outline-none transition-all placeholder:text-white/50"
                    style={{
                      background: "rgba(255,255,255,0.2)",
                      border: "1.5px solid rgba(255,255,255,0.3)",
                      color: "#ffffff",
                    }}
                    onFocus={e => { e.target.style.borderColor = "rgba(255,255,255,0.7)"; }}
                    onBlur={e  => { e.target.style.borderColor = "rgba(255,255,255,0.3)"; }}
                  />
                </div>

                {text.trim() || selectedFile ? (
                  <motion.button 
                    key="send-btn"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSend}
                    className="p-3 rounded-2xl shadow-lg hover:brightness-110 active:brightness-90 transition-all text-blue-600"
                    style={{ background: "#ffffff", boxShadow: "0 4px 15px rgba(0,0,0,0.2)" }}
                  >
                    <Send size={22} />
                  </motion.button>
                ) : (
                  <motion.button 
                    key="mic-btn"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsVoiceRecording(true)}
                    className="p-3 rounded-2xl border transition-all"
                    style={{
                      background: "rgba(255,255,255,0.2)",
                      borderColor: "rgba(255,255,255,0.4)",
                      color: "#ffffff",
                    }}
                  >
                    <Mic size={22} />
                  </motion.button>
                )}

                {/* Emoji Picker Overlay */}
                <AnimatePresence>
                  {showEmojiPicker && (
                    <motion.div 
                      key="emoji-picker"
                      initial={{ opacity: 0, y: 20, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 20, scale: 0.9 }}
                      className="absolute bottom-20 left-0 glass-card p-4 border-white/20 shadow-2xl z-50 grid grid-cols-5 gap-3"
                    >
                      {["😊", "😂", "❤️", "👍", "🙏", "🔥", "😭", "😮", "🎉", "✨", "💯", "✅", "🙌", "💀", "🤣", "🤔", "😘", "😎", "👀", "👋"].map(emoji => (
                        <motion.span 
                          key={emoji} 
                          whileHover={{ scale: 1.3 }}
                          whileTap={{ scale: 0.8 }}
                          onClick={() => {
                            setText(prev => prev + emoji);
                            setShowEmojiPicker(false);
                          }}
                          className="text-2xl cursor-pointer p-1"
                        >
                          {emoji}
                        </motion.span>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </footer>

      {/* Overlays */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="absolute top-16 left-0 right-0 bg-[#10131a] border-b border-[#45484f]/15 px-6 py-3 flex items-center gap-4 z-40 overflow-hidden shadow-xl"
          >
            <div className="flex-1 relative">
              <SearchIcon className="absolute left-3 top-2.5 text-slate-500" size={16} />
              <input
                type="text"
                placeholder="Search in chat..."
                value={searchQuery}
                onPaste={handlePaste}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-black/20 border border-[#45484f]/15 rounded-xl text-sm text-white outline-none focus:border-[$theme.primary]"
                autoFocus
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-mono text-slate-500 mr-2 uppercase">
                {searchResults.length > 0 ? `${searchResults.length - currentSearchIndex} of ${searchResults.length}` : "No matches"}
              </span>
              <button 
                onClick={() => navigateSearch(1)} 
                disabled={searchResults.length === 0}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg disabled:opacity-30"
              >
                <ChevronUp size={18} />
              </button>
              <button 
                onClick={() => navigateSearch(-1)} 
                disabled={searchResults.length === 0}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg disabled:opacity-30"
              >
                <ChevronDown size={18} />
              </button>
              <div className="w-px h-5 bg-white/10 mx-1" />
              <button 
                onClick={() => { setShowSearch(false); setSearchQuery(""); setSearchResults([]); setCurrentSearchIndex(-1); }}
                className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddContact && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-20 left-6 right-6 p-4 glass-card border-[$theme.primary]/30 flex flex-col md:flex-row items-center gap-4 z-50"
          >
            <div className="flex-1 w-full relative">
              <UserCheck className="absolute left-3 top-2.5 text-[$theme.primary]" size={18} />
              <input 
                type="text" 
                placeholder="Saving contact as..." 
                value={newContactName}
                onChange={(e) => setNewContactName(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-black/40 border border-[#45484f]/15 rounded-xl text-sm outline-none focus:border-[$theme.primary]"
                autoFocus
              />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <button onClick={handleAddContact} className="flex-1 md:flex-none px-6 py-2 bg-[$theme.primary] text-[#0b0e14] font-bold text-xs uppercase rounded-xl">Save</button>
              <button onClick={() => setShowAddContact(false)} className="px-3 py-2 bg-white/5 text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"><X size={18} /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {adminNotice && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute top-20 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 px-6 py-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl backdrop-blur-xl shadow-2xl"
          >
            <AlertTriangle size={18} />
            <span className="text-sm font-bold">{adminNotice}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddMember && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#0b0e14]/95 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          >
            <div className="glass-card w-full max-w-md p-6 flex flex-col max-h-[80vh]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <UserPlus size={20} className="text-[$theme.primary]" />
                  Expand Your Circle
                </h3>
                <button onClick={() => setShowAddMember(false)} className="p-2 hover:bg-white/5 rounded-full text-slate-500 transition-all">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2">
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-[$theme.primary] uppercase tracking-wider px-1">Quick Add by Phone</p>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Phone size={14} className="absolute left-3 top-3 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Phone (+91...)"
                        value={phoneToAdd}
                        onChange={(e) => setPhoneToAdd(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-black/20 border border-[#45484f]/15 rounded-xl text-sm outline-none focus:border-[$theme.primary] transition-all"
                      />
                    </div>
                    <button 
                      onClick={handleAddMemberByPhone}
                      disabled={isAddingByPhone || !phoneToAdd.trim()}
                      className="px-4 py-2 bg-[$theme.primary] text-[#0b0e14] font-bold rounded-xl text-xs hover:brightness-110 disabled:opacity-50 transition-all"
                    >
                      {isAddingByPhone ? <Loader2 size={16} className="animate-spin" /> : "Add"}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">Suggested from Chats</p>
                  {pastChatUsers.filter(u => !contacts.some(c => c.userId?.toString() === (u._id || u).toString())).length === 0 && (
                    <p className="text-[10px] text-slate-500 px-1 italic">No new suggestions from recent chats.</p>
                  )}
                  {pastChatUsers
                    .filter(u => !contacts.some(c => c.userId?.toString() === (u._id || u).toString()))
                    .map(user => {
                      const isAlreadyIn = Array.isArray(selectedChat.participants) && selectedChat.participants.some(p => (p?._id || p).toString() === (user._id || user).toString());
                      return (
                        <div key={user._id || user} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-[#45484f]/15 hover:border-[$theme.primary]/30 transition-all">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[$theme.primary]/10 flex items-center justify-center text-[10px] font-bold text-[$theme.primary] uppercase tracking-tighter overflow-hidden">
                              {user.avatar ? (
                                <img src={`http://localhost:5002${user.avatar}`} className="w-full h-full object-cover" alt={user.name || "User"} />
                              ) : (user.name?.[0] || user.phoneNumber?.slice(-2) || "?")}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white">{user.name || user.phoneNumber}</p>
                              <p className="text-[10px] text-slate-500 uppercase tracking-widest leading-none mt-1">{isAlreadyIn ? "In Group" : "Recent Chat"}</p>
                            </div>
                          </div>
                          {isAlreadyIn ? (
                            <div className="p-1.5 text-[$theme.primary]/40">
                              <Check size={16} />
                            </div>
                          ) : (
                            <button 
                              onClick={() => handleAddMemberToGroup(user._id || user)}
                              className="p-2 bg-[$theme.primary]/10 text-[$theme.primary] rounded-lg hover:bg-[$theme.primary] hover:text-[#0b0e14] transition-all"
                            >
                              <Plus size={16} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">Your Contacts</p>
                  {contacts.filter(c => c.userId?.toString() !== myUserId?.toString()).length === 0 && <p className="text-center text-slate-500 py-6 text-[10px] italic">No contacts available.</p>}
                  {contacts.filter(c => c.userId?.toString() !== myUserId?.toString()).map(contact => {
                    const isAlreadyIn = Array.isArray(selectedChat.participants) && selectedChat.participants.some(p => (p?._id || p).toString() === contact.userId?.toString());
                    return (
                      <div key={contact.userId} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-[#45484f]/15 hover:border-[$theme.primary]/30 transition-all">
                        <div>
                          <p className="text-sm font-bold text-white">{contact.savedName}</p>
                          <p className="text-[10px] text-slate-500 uppercase tracking-widest leading-none mt-1">{isAlreadyIn ? "In Group" : "Connect"}</p>
                        </div>
                        {isAlreadyIn ? (
                          <div className="p-1.5 text-[$theme.primary]/40">
                            <Check size={16} />
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleAddMemberToGroup(contact.userId)}
                            className="p-2 bg-[$theme.primary]/10 text-[$theme.primary] rounded-lg hover:bg-[$theme.primary] hover:text-[#0b0e14] transition-all"
                          >
                            <Plus size={16} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRemoveMember && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#0b0e14]/95 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          >
            <div className="glass-card w-full max-w-md p-6 flex flex-col max-h-[80vh]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-rose-400 flex items-center gap-2">
                  <UserMinus size={20} />
                  Manage Collective
                </h3>
                <button onClick={() => setShowRemoveMember(false)} className="p-2 hover:bg-white/5 rounded-full text-slate-500 transition-all">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
                {Array.isArray(selectedChat.participants) && selectedChat.participants.filter(p => p && (p._id || p).toString() !== myUserId?.toString()).map(p => (
                  <div key={p._id || p} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-[#45484f]/15 hover:border-rose-500/30 transition-all">
                    <div>
                      <p className="text-sm font-bold text-white">{p.name || "Member"}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest">{p.phoneNumber || "Participant"}</p>
                    </div>
                    <button 
                      onClick={() => handleRemoveMemberFromGroup(p._id || p)}
                      className="px-4 py-1.5 bg-rose-500 text-white text-xs font-bold rounded-lg hover:bg-rose-600 active:scale-95 transition-all"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showParticipants && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#0b0e14]/95 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          >
            <div className="glass-card w-full max-w-md p-6 flex flex-col max-h-[80vh]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Info size={20} className="text-[$theme.primary]" />
                  Chat Participants
                </h3>
                <button onClick={() => setShowParticipants(false)} className="p-2 hover:bg-white/5 rounded-full text-slate-500 transition-all">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
                {Array.isArray(selectedChat.participants) && selectedChat.participants.map(p => {
                  const participantId = p?._id?.toString() || p?.toString();
                  const adminId = selectedChat.groupAdmin?._id?.toString() || selectedChat.groupAdmin?.toString();
                  const isAdmin = selectedChat.isGroup && adminId && participantId && adminId === participantId;
                  return (
                    <div key={p._id || p} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-[#45484f]/15 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[$theme.primary]/10 flex items-center justify-center font-bold text-[$theme.primary] overflow-hidden">
                          {p.avatar ? (
                            <img src={`http://localhost:5002${p.avatar}`} className="w-full h-full object-cover" alt={p.name || "Member"} />
                          ) : (p.name?.[0] || "?").toUpperCase()}
                        </div>
                          <div>
                            <p className="text-sm font-bold text-white flex items-center gap-2">
                              {p.name || "Member"}
                              {(p._id || p).toString() === myUserId?.toString() && <span className="text-[10px] text-slate-500 font-normal opacity-70">(You)</span>}
                              {isAdmin && <span className="text-[10px] text-[$theme.primary] font-semibold bg-[$theme.primary]/10 px-1.5 py-0.5 rounded border border-[$theme.primary]/20">(Admin)</span>}
                            </p>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest leading-none mt-0.5">{p.phoneNumber || "Participant"}</p>
                          </div>
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-[$theme.primary]/10 text-[$theme.primary] text-[10px] font-black uppercase rounded-lg border border-[$theme.primary]/20">
                          <Shield size={10} />
                          Admin
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message Info Modal */}
      <AnimatePresence>
        {showMessageInfo && selectedMessageForInfo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#0b0e14]/95 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={closeMessageInfo}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card w-full max-w-md p-6 flex flex-col max-h-[80vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Info size={20} className="text-[$theme.primary]" />
                  Message Info
                </h3>
                <button onClick={closeMessageInfo} className="p-2 hover:bg-white/5 rounded-full text-slate-500 transition-all">
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2">
                {/* Message Content */}
                <div className="p-4 bg-white/5 border border-[#45484f]/30 rounded-xl">
                  <p className="text-xs text-slate-500 uppercase tracking-widest mb-2 font-bold">Message</p>
                  <p className="text-sm text-white break-words">{selectedMessageForInfo.content}</p>
                </div>

                {/* Sent Time */}
                <div className="p-4 bg-white/5 border border-[#45484f]/30 rounded-xl">
                  <p className="text-xs text-slate-500 uppercase tracking-widest mb-2 font-bold">Sent</p>
                  <p className="text-sm text-white">
                    {new Date(selectedMessageForInfo.createdAt).toLocaleString([], { 
                      month: 'short', 
                      day: 'numeric', 
                      hour: '2-digit', 
                      minute: '2-digit'
                    })}
                  </p>
                </div>

                {/* Delivery Status */}
                {(selectedMessageForInfo.sender?._id || selectedMessageForInfo.sender)?.toString() === myUserId?.toString() && (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Delivery Status</p>
                    <div className="space-y-2">
                      {/* Show for each participant */}
                      {selectedChat.isGroup ? (
                        selectedChat.participants.map(participant => {
                          const participantId = getEntityId(participant);
                          if (participantId === myUserId?.toString()) return null;
                          
                          const readReceipt = findReadReceipt(selectedMessageForInfo, participantId);
                          
                          const formatTimestamp = (dateStr) => {
                            if (!dateStr) return new Date(selectedMessageForInfo.deliveredAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                            return new Date(dateStr).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                          };
                          
                          return (
                            <div key={participantId} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-[#45484f]/15 hover:bg-white/8 transition-all">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-[$theme.primary]/10 flex items-center justify-center font-bold text-[$theme.primary] text-xs">
                                  {(participant.name?.[0] || "?").toUpperCase()}
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-white">{participant.name || "Member"}</p>
                                  <p className="text-xs text-slate-500">{participant.phoneNumber || "Unknown"}</p>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                {readReceipt && readReceipt.readAt ? (
                                  <>
                                    <span className="flex items-center gap-1.5 px-3 py-1 bg-sky-500/10 border border-sky-500/30 rounded-full text-xs font-bold text-sky-400">
                                      <CheckCheck size={12} />
                                      Read
                                    </span>
                                    <p className="text-[10px] text-slate-500">{formatTimestamp(readReceipt.readAt)}</p>
                                  </>
                                ) : (
                                  <>
                                    <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-500/10 border border-slate-500/30 rounded-full text-xs font-bold text-slate-400">
                                      <Check size={12} />
                                      Delivered
                                    </span>
                                    <p className="text-[10px] text-slate-500">{formatTimestamp(selectedMessageForInfo.deliveredAt)}</p>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        // 1:1 Chat
                        selectedChat.participants.map(participant => {
                          const participantId = getEntityId(participant);
                          if (participantId === myUserId?.toString()) return null;
                          
                          const readReceipt = findReadReceipt(selectedMessageForInfo, participantId);
                          
                          const formatTimestamp = (dateStr) => {
                            if (!dateStr) return new Date(selectedMessageForInfo.deliveredAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                            return new Date(dateStr).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                          };
                          
                          return (
                            <div key={participantId} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-[#45484f]/15 hover:bg-white/8 transition-all">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-[$theme.primary]/10 flex items-center justify-center font-bold text-[$theme.primary] text-xs">
                                  {(participant.name?.[0] || "?").toUpperCase()}
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-white">{savedContact?.savedName || participant.name || "Unknown"}</p>
                                  <p className="text-xs text-slate-500">{participant.phoneNumber || "Contact"}</p>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                {readReceipt && readReceipt.readAt ? (
                                  <>
                                    <span className="flex items-center gap-1.5 px-3 py-1 bg-sky-500/10 border border-sky-500/30 rounded-full text-xs font-bold text-sky-400">
                                      <CheckCheck size={12} />
                                      Read
                                    </span>
                                    <p className="text-[10px] text-slate-500">{formatTimestamp(readReceipt.readAt)}</p>
                                  </>
                                ) : (
                                  <>
                                    <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-500/10 border border-slate-500/30 rounded-full text-xs font-bold text-slate-400">
                                      <Check size={12} />
                                      Delivered
                                    </span>
                                    <p className="text-[10px] text-slate-500">{formatTimestamp(selectedMessageForInfo.deliveredAt)}</p>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
