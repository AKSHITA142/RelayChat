import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Cpu, FilePlus, UserPlus } from "lucide-react";
import ContactInfoPanel from "./ContactInfoPanel";
import ChatHeader from "./chat/ChatHeader";
import ChatSearchOverlay from "./chat/ChatSearchOverlay";
import GroupDialogs from "./chat/GroupDialogs";
import MessageInput from "./chat/MessageInput";
import MessageList from "./chat/MessageList";
import { useChatSearch } from "../hooks/useChatSearch";
import { getThemeClassName, useChatTheme } from "../hooks/useChatTheme";
import socket from "../services/socket";
import api from "../services/api";
import { getLoggedInUser } from "../utils/auth";
import {
  buildDeviceRecipients,
  encryptAttachmentFile,
  encryptDirectMessage,
  encryptGroupMessage,
  hydrateDecryptedMessage,
} from "../services/e2ee";
import { cn } from "@/lib/utils";
import Background3D from "@/components/ui/neural-network-bg";

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
  setActiveVideoCall,
}) {
  void setIsAddingContact;
  void setIsCreatingGroup;

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

  const [showAddContact, setShowAddContact] = useState(false);
  const [newContactName, setNewContactName] = useState("");
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);

  const [showMenu, setShowMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [recipientEncryptionUser, setRecipientEncryptionUser] = useState(null);
  const [groupEncryptionUsers, setGroupEncryptionUsers] = useState({});

  const [savedThemeName, setSavedThemeName] = useChatTheme(selectedChat?._id);
  const [activeThemeName, setActiveThemeName] = useState(savedThemeName);

  const [showMessageInfo, setShowMessageInfo] = useState(false);
  const [selectedMessageInfoId, setSelectedMessageInfoId] = useState(null);

  const menuRef = useRef(null);

  useEffect(() => {
    setActiveThemeName(savedThemeName);
  }, [savedThemeName]);

  const scrollToMessage = useCallback((messageId) => {
    if (!messageId) return;

    requestAnimationFrame(() => {
      document
        .getElementById(`msg-${messageId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, []);

  const {
    searchQuery,
    currentSearchIndex,
    searchResults,
    handleSearch,
    navigateSearch,
    resetSearch,
  } = useChatSearch(messages, scrollToMessage);

  const otherUser = Array.isArray(selectedChat?.participants)
    ? selectedChat.participants.find(
        (user) => user && (user._id?.toString() || user.toString()) !== myUserId?.toString()
      )
    : null;

  const isOnline =
    Array.isArray(onlineUsers) &&
    otherUser?._id &&
    onlineUsers.some((id) => id?.toString() === otherUser._id.toString());

  const lastSeen = lastSeenMap[otherUser?._id];
  const lastSeenText = (() => {
    try {
      if (!lastSeen) return "Offline";
      const date = new Date(lastSeen);
      if (Number.isNaN(date.getTime())) return "Offline";
      return `Available ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    } catch {
      return "Offline";
    }
  })();

  const savedContact = otherUser
    ? contacts.find((contact) => contact.userId?.toString() === otherUser?._id?.toString())
    : null;

  const displayName =
    (selectedChat?.isGroup
      ? selectedChat.groupName
      : savedContact
        ? savedContact.savedName
        : otherUser?.phoneNumber || otherUser?.name || "Unknown") || "Unknown";

  const chatThemeClassName = getThemeClassName(activeThemeName);

  const selectedMessageForInfo = selectedMessageInfoId
    ? messages.find((message) => message?._id?.toString() === selectedMessageInfoId.toString()) || null
    : null;

  const closeMessageInfo = () => {
    setShowMessageInfo(false);
    setSelectedMessageInfoId(null);
  };

  const handleThemeSelect = useCallback(
    (name) => {
      setActiveThemeName(name);
      setSavedThemeName(name);
      setShowThemePicker(false);
    },
    [setSavedThemeName]
  );

  const pastChatUsers = Array.from(
    new Map(
      chats
        .filter((chat) => !chat.isGroup)
        .map((chat) => {
          const user = chat.participants.find(
            (participant) => (participant?._id?.toString() || participant?.toString()) !== myUserId?.toString()
          );
          return user ? [(user._id || user).toString(), user] : null;
        })
        .filter(Boolean)
    ).values()
  );

  const selectedChatParticipantIds = (selectedChat?.participants || [])
    .map((participant) => getEntityId(participant))
    .filter(Boolean)
    .join(",");

  const selectedDirectRecipientId =
    (selectedChat?.participants || [])
      .map((participant) => getEntityId(participant))
      .find((participantId) => participantId !== myUserId?.toString()) || null;

  const participantIds = (selectedChat?.participants || [])
    .map((participant) => getEntityId(participant))
    .filter(Boolean);

  const handlePaste = (event) => {
    if (event.clipboardData && event.clipboardData.files.length > 0) {
      event.preventDefault();
      const file = event.clipboardData.files[0];
      setSelectedFile(file);
      if (showSearch) setShowSearch(false);
    }
  };

  const handleShowMessageInfo = (message) => {
    setSelectedMessageInfoId(message?._id || null);
    setShowMessageInfo(true);
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
    } catch (error) {
      console.error("Error sending voice message:", error);
      setIsVoiceRecording(false);
    }
  };

  const handleRenameChat = async () => {
    if (!tempGroupName.trim() || tempGroupName === displayName) {
      setIsRenaming(false);
      return;
    }

    try {
      if (selectedChat.isGroup) {
        const response = await api.put(`/chat/${selectedChat._id}/rename`, { name: tempGroupName });
        selectedChat.groupName = response.data.groupName;
        setChats((previous) =>
          previous.map((chat) =>
            chat._id === selectedChat._id ? { ...chat, groupName: response.data.groupName } : chat
          )
        );
      } else {
        const response = await api.post("/user/save-contact", {
          targetUserId: otherUser._id,
          savedName: tempGroupName,
        });
        const currentUser = getLoggedInUser();
        const updatedUser = { ...currentUser, contacts: response.data.contacts };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setContacts(response.data.contacts);
      }
      setIsRenaming(false);
    } catch (error) {
      console.error(error);
    }
  };

  const handleClearChat = async () => {
    try {
      if (window.confirm("Are you sure you want to clear this chat? This will remove all messages from your view.")) {
        await api.delete(`/message/clear/${selectedChat._id}`);
        setMessages([]);
        setShowMenu(false);
      }
    } catch (error) {
      console.error("Error clearing chat:", error);
    }
  };

  const handleAddContact = async () => {
    if (!newContactName.trim()) return;

    try {
      const response = await api.post("/user/save-contact", {
        targetUserId: otherUser._id,
        savedName: newContactName,
      });
      const currentUser = getLoggedInUser();
      const updatedUser = { ...currentUser, contacts: response.data.contacts };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setContacts(response.data.contacts);
      setShowAddContact(false);
      setNewContactName("");
    } catch (error) {
      console.error(error);
    }
  };

  const showTimedAdminNotice = useCallback((message) => {
    setAdminNotice(message);
    window.setTimeout(() => setAdminNotice(""), 3000);
  }, []);

  const handleAddMemberToGroup = async (userId) => {
    try {
      const response = await api.post(`/chat/${selectedChat._id}/add-to-group`, { userId });
      setChats((previous) => previous.map((chat) => (chat._id === selectedChat._id ? response.data : chat)));
      setSelectedChat(response.data);
      setShowAddMember(false);
      setPhoneToAdd("");
    } catch (error) {
      console.error(error);
      showTimedAdminNotice(error.response?.data?.message || "Failed to add member");
    } finally {
      setIsAddingByPhone(false);
    }
  };

  const handleAddMemberByPhone = async () => {
    if (!phoneToAdd.trim()) return;

    setIsAddingByPhone(true);
    try {
      const response = await api.post("/chat/start", { phone: phoneToAdd.trim() });
      const targetUserId =
        response.data.chat?.participants?.find((participant) => (participant._id || participant).toString() !== myUserId?.toString())?._id ||
        response.data.receiver_id;

      if (!targetUserId) throw new Error("User not found");

      await handleAddMemberToGroup(targetUserId);
    } catch (error) {
      console.error(error);
      showTimedAdminNotice(error.response?.data?.message || "User not found or unreachable");
      setIsAddingByPhone(false);
    }
  };

  const handleRemoveMemberFromGroup = async (userId) => {
    try {
      const response = await api.post(`/chat/${selectedChat._id}/remove-from-group`, { userId });
      setChats((previous) => previous.map((chat) => (chat._id === selectedChat._id ? response.data : chat)));
      setSelectedChat(response.data);
      setShowRemoveMember(false);
    } catch (error) {
      console.error(error);
      showTimedAdminNotice(error.response?.data?.message || "Failed to remove member");
    }
  };

  const closeSearch = useCallback(() => {
    setShowSearch(false);
    resetSearch();
  }, [resetSearch]);

  const requestAddMember = () => {
    const adminId = selectedChat.groupAdmin?._id?.toString() || selectedChat.groupAdmin?.toString();
    if (adminId && adminId === myUserId?.toString()) {
      setShowAddMember(true);
      setShowMenu(false);
      return;
    }

    setShowMenu(false);
    showTimedAdminNotice("Only group admin can add members");
  };

  const requestRemoveMember = () => {
    const adminId = selectedChat.groupAdmin?._id?.toString() || selectedChat.groupAdmin?.toString();
    if (adminId && adminId === myUserId?.toString()) {
      setShowRemoveMember(true);
      setShowMenu(false);
      return;
    }

    setShowMenu(false);
    showTimedAdminNotice("Only group admin can remove members");
  };

  const startVideoCall = useCallback(() => {
    const myName = getLoggedInUser()?.name || "Someone";
    setActiveVideoCall?.({
      to: otherUser?._id || otherUser,
      fromName: myName,
      isIncoming: false,
      callId: Date.now(),
    });
  }, [otherUser, setActiveVideoCall]);

  const handleTextChange = (value) => {
    setText(value);
    if (!selectedChat?._id) return;

    socket.emit("typing", selectedChat._id);
    clearTimeout(typingTimeout.current);
    typingTimeout.current = window.setTimeout(() => {
      socket.emit("stop-typing", selectedChat._id);
    }, 1500);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => clearTimeout(typingTimeout.current);
  }, []);

  useEffect(() => {
    if (!selectedChat?._id) return;

    let isCancelled = false;

    const loadMessages = async () => {
      try {
        const response = await api.get(`/message/${selectedChat._id}?includeDeleted=${showDeleted}`);
        if (isCancelled) return;

        if (Array.isArray(response.data)) {
          const sorted = response.data.sort((left, right) => new Date(left.createdAt) - new Date(right.createdAt));
          const hydratedMessages = await Promise.all(sorted.map((message) => hydrateDecryptedMessage(message, myUserId)));
          setMessages(hydratedMessages);
        } else {
          setMessages([]);
        }

        socket.emit("join-chat", selectedChat._id);
        socket.emit("open-chat", selectedChat._id);
        socket.emit("mark-seen", { chatId: selectedChat._id });
      } catch (error) {
        if (isCancelled) return;
        console.error("Failed to fetch messages:", error);
        setMessages([]);
      }
    };

    loadMessages();

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
    resetSearch();

    return () => {
      isCancelled = true;
      socket.emit("close-chat", selectedChat._id);
    };
  }, [selectedChat, showDeleted, myUserId, resetSearch]);

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

    const participantIdList = selectedChatParticipantIds
      .split(",")
      .map((participantId) => participantId.trim())
      .filter(Boolean);

    if (participantIdList.length === 0) {
      setGroupEncryptionUsers({});
      return;
    }

    let cancelled = false;

    const loadGroupKeys = async () => {
      try {
        const keyEntries = await Promise.all(
          participantIdList.map(async (participantId) => {
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

  useEffect(() => {
    if (selectedChat?._id) {
      const stored = localStorage.getItem(`chat-theme-${selectedChat._id}`) || "stealth_dark";
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
    const handler = async (message) => {
      if (!message || !selectedChat?._id || !message.chat) return;
      if (getEntityId(message.chat) !== selectedChat._id.toString()) return;

      const hydratedMessage = await hydrateDecryptedMessage(message, myUserId);
      setMessages((previous) => {
        if (message.clientTempId) {
          const optimisticIndex = previous.findIndex((item) => item._id === message.clientTempId);
          if (optimisticIndex !== -1) {
            const updatedMessages = [...previous];
            updatedMessages[optimisticIndex] = hydratedMessage;
            return updatedMessages;
          }
        }
        return [...previous, hydratedMessage];
      });

      if (getEntityId(message.sender) !== myUserId?.toString()) {
        socket.emit("mark-seen", { chatId: selectedChat._id });
      }
    };

    const statusHandler = ({ messageId }) => {
      setMessages((previous) =>
        previous.map((message) => (message._id === messageId ? { ...message, status: "delivered" } : message))
      );
    };

    const seenHandler = ({ chatId, readerId, readerIds = [], readAt, messageIds = [], messages: updatedMessages }) => {
      if (chatId?.toString() !== selectedChat?._id?.toString()) return;

      const normalizedReaderIds = [...new Set([readerId, ...readerIds].filter(Boolean).map((value) => value.toString()))];

      if (updatedMessages && Array.isArray(updatedMessages)) {
        const updatedById = new Map(updatedMessages.map((message) => [message._id.toString(), message]));
        setMessages((previous) =>
          previous.map((message) => {
            const updated = updatedById.get(message._id.toString());
            return updated ? { ...message, seenBy: updated.seenBy, status: updated.status || "seen" } : message;
          })
        );
        return;
      }

      setMessages((previous) =>
        previous.map((message) =>
          getEntityId(message.sender) === myUserId?.toString() &&
          (messageIds.length === 0 || messageIds.includes(message._id?.toString()))
            ? {
                ...message,
                status: "seen",
                seenBy: [
                  ...(message.seenBy || []).filter(
                    (receipt) => !normalizedReaderIds.includes(getEntityId(receipt?.userId ?? receipt))
                  ),
                  ...normalizedReaderIds.map((id) => ({ userId: id, readAt })),
                ],
              }
            : message
        )
      );
    };

    const deleteForMeHandler = ({ messageId }) => {
      if (!showDeleted) {
        setMessages((previous) => previous.filter((message) => message._id !== messageId));
        return;
      }

      setMessages((previous) =>
        previous.map((message) =>
          message._id === messageId
            ? { ...message, deletedFor: [...(message.deletedFor || []), myUserId] }
            : message
        )
      );
    };

    const restoreForMeHandler = ({ messageId }) => {
      setMessages((previous) =>
        previous.map((message) =>
          message._id === messageId
            ? { ...message, deletedFor: (message.deletedFor || []).filter((id) => id !== myUserId) }
            : message
        )
      );
    };

    const deleteForEveryoneHandler = ({ messageId }) => {
      setMessages((previous) =>
        previous.map((message) =>
          message?._id === messageId ? { ...message, content: "This message was deleted", isDeleted: true } : message
        )
      );
    };

    const reactionHandler = (updatedMessage) => {
      if (!updatedMessage?._id) return;
      setMessages((previous) =>
        previous.map((message) => (message?._id === updatedMessage._id ? updatedMessage : message))
      );
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

  const sendFileAndText = async () => {
    try {
      const formData = new FormData();
      formData.append("chatId", selectedChat._id);

      if (!selectedChat?.isGroup && selectedDirectRecipientId && recipientEncryptionUser) {
        const recipients = [
          ...buildDeviceRecipients([getLoggedInUser()]),
          ...buildDeviceRecipients([recipientEncryptionUser || { _id: selectedDirectRecipientId }]),
        ];
        const { encryptedFile, metadata } = await encryptAttachmentFile({
          file: selectedFile,
          recipients,
        });

        formData.append("encryptedFileMetadata", JSON.stringify(metadata));
        formData.append("fileName", selectedFile.name);
        formData.append("fileType", selectedFile.type);
        formData.append("file", encryptedFile);

        if (text.trim()) {
          const encryptedPayload = await encryptDirectMessage({
            content: text,
            recipients,
          });
          formData.append("encryptedPayload", JSON.stringify(encryptedPayload));
        }
      } else if (selectedChat?.isGroup) {
        const participantUsers = (selectedChat?.participants || []).map((participant) => {
          const participantId = getEntityId(participant);
          return groupEncryptionUsers[participantId] || participant;
        });
        const recipients = buildDeviceRecipients(participantUsers);
        const missingParticipantKey = participantUsers.find(
          (participant) => buildDeviceRecipients([participant]).length === 0
        );

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
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSelectedFile(null);
      setText("");
    } catch (error) {
      console.error("Upload failed", error);
      window.alert(error.response?.data?.message || "Failed to upload attachment");
    }
  };

  const handleSend = async () => {
    if (!text.trim() && !selectedFile) return;

    if (selectedFile) {
      await sendFileAndText();
      return;
    }

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
        setMessages((previous) => [
          ...previous,
          {
            _id: clientTempId,
            chat: selectedChat._id,
            sender: { _id: myUserId },
            content: messageText,
            createdAt: new Date().toISOString(),
            status: "sent",
            seenBy: [],
            reactions: [],
          },
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
        const participantUsers = (selectedChat?.participants || []).map((participant) => {
          const participantId = getEntityId(participant);
          return groupEncryptionUsers[participantId] || participant;
        });
        const recipients = buildDeviceRecipients(participantUsers);
        const missingParticipantKey = participantUsers.find(
          (participant) => buildDeviceRecipients([participant]).length === 0
        );

        if (missingParticipantKey) {
          socket.emit("send-message", {
            chatId: selectedChat._id,
            content: messageText,
          });
          return;
        }

        clientTempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        setMessages((previous) => [
          ...previous,
          {
            _id: clientTempId,
            chat: selectedChat._id,
            sender: { _id: myUserId },
            content: messageText,
            createdAt: new Date().toISOString(),
            status: "sent",
            seenBy: [],
            reactions: [],
          },
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
        setMessages((previous) => previous.filter((message) => message._id !== clientTempId));
      }
      setText((current) => current || messageText);
      window.alert(error.message || "Failed to send encrypted message");
    }
  };

  if (!selectedChat) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="grid max-w-5xl grid-cols-1 gap-6 px-2 md:grid-cols-3"
        >
          {[
            { icon: <FilePlus className="text-secondary" />, title: "Collaborate", desc: "Share documents, images, voice notes, and encrypted attachments without leaving the thread." },
            { icon: <UserPlus className="text-primary" />, title: "Expand Network", desc: "Start a private chat or build a group space the moment you need one." },
            { icon: <Cpu className="text-foreground" />, title: "Premium Focus", desc: "A glass-driven workspace keeps search, motion, and message context easy to track." },
          ].map((card) => (
            <motion.div
              key={card.title}
              whileHover={{ y: -5 }}
              className="glass-card group flex cursor-pointer flex-col items-center p-6 text-center"
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/6 transition-colors group-hover:bg-white/10">
                {card.icon}
              </div>
              <h3 className="mb-2 font-headline text-xl font-bold tracking-tight text-foreground">{card.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{card.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    );
  }

  return (
    <div className={cn("relative flex h-full flex-1 flex-col overflow-hidden text-foreground", chatThemeClassName)}>
      {/* Premium Advanced 3D Background Layers */}
      <Background3D className="absolute inset-0 z-0" />

      {/* Enhanced Content Container */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col backdrop-blur-sm">
        {/* Contact Info Panel - Enhanced with Glass */}
        {showContactInfo && !selectedChat?.isGroup ? (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="absolute inset-0 z-20"
          >
            <div className="surface-panel h-full backdrop-blur-2xl border-l border-white/10">
              <ContactInfoPanel
                user={otherUser}
                displayName={displayName}
                onClose={() => setShowContactInfo(false)}
                onVideoCall={() => {
                  setShowContactInfo(false);
                  setActiveVideoCall?.({ chatId: selectedChat._id, recipientId: otherUser?._id, isVideo: true });
                }}
                onVoiceCall={() => {
                  setShowContactInfo(false);
                  setActiveVideoCall?.({ chatId: selectedChat._id, recipientId: otherUser?._id, isVideo: false });
                }}
                onSearch={() => {
                  setShowContactInfo(false);
                  setShowSearch(true);
                }}
                onClearChat={() => {
                  setShowContactInfo(false);
                }}
              />
            </div>
          </motion.div>
        ) : null}
        <ChatHeader
          selectedChat={selectedChat}
          displayName={displayName}
          otherUser={otherUser}
          isOnline={isOnline}
          isTyping={isTyping}
          lastSeenText={lastSeenText}
          savedContact={savedContact}
          isRenaming={isRenaming}
          tempGroupName={tempGroupName}
          setTempGroupName={setTempGroupName}
          onRenameSubmit={handleRenameChat}
          onCancelRename={() => setIsRenaming(false)}
          onStartRename={() => {
            setIsRenaming(true);
            setTempGroupName(displayName);
            setShowMenu(false);
          }}
          onToggleContactInfo={() => setShowContactInfo((value) => !value)}
          showThemePicker={showThemePicker}
          setShowThemePicker={setShowThemePicker}
          activeThemeName={activeThemeName}
          onThemeSelect={handleThemeSelect}
          showMenu={showMenu}
          setShowMenu={setShowMenu}
          onOpenSearch={() => {
            setShowSearch(true);
            setShowMenu(false);
          }}
          onOpenParticipants={() => {
            setShowParticipants(true);
            setShowMenu(false);
          }}
          onRequestAddMember={requestAddMember}
          onRequestRemoveMember={requestRemoveMember}
          onOpenAddContact={() => {
            setShowAddContact(true);
            setShowMenu(false);
          }}
          onToggleShowDeleted={() => {
            setShowDeleted((value) => !value);
            setShowMenu(false);
          }}
          showDeleted={showDeleted}
          onClearChat={handleClearChat}
          onStartVideoCall={startVideoCall}
          menuRef={menuRef}
        />

        <ChatSearchOverlay
          visible={showSearch}
          searchQuery={searchQuery}
          onSearchChange={handleSearch}
          resultCount={searchResults.length}
          currentIndex={currentSearchIndex}
          onNext={navigateSearch}
          onPrev={navigateSearch}
          onClose={closeSearch}
          onPaste={handlePaste}
        />

        <MessageList
          messages={messages}
          myUserId={myUserId}
          selectedChat={selectedChat}
          searchQuery={searchQuery}
          searchResults={searchResults}
          currentSearchIndex={currentSearchIndex}
          onDeleteMe={(messageId) => socket.emit("delete-for-me", { messageId })}
          onDeleteEveryone={(messageId) =>
            socket.emit("delete-for-everyone", { messageId, chatId: selectedChat?._id })
          }
          onShowMessageInfo={handleShowMessageInfo}
          messagesEndRef={messagesEndRef}
        />

        <MessageInput
          text={text}
          onTextChange={handleTextChange}
          onSend={handleSend}
          onPaste={handlePaste}
          selectedFile={selectedFile}
          onClearSelectedFile={() => setSelectedFile(null)}
          onFilePicked={setSelectedFile}
          showEmojiPicker={showEmojiPicker}
          setShowEmojiPicker={setShowEmojiPicker}
          fileInputRef={fileInputRef}
          isVoiceRecording={isVoiceRecording}
          onVoiceSend={handleVoiceSend}
          onCancelVoice={() => setIsVoiceRecording(false)}
          onStartVoice={() => setIsVoiceRecording(true)}
        />
      </div>

      <GroupDialogs
        showAddContact={showAddContact}
        setShowAddContact={setShowAddContact}
        newContactName={newContactName}
        setNewContactName={setNewContactName}
        onAddContact={handleAddContact}
        adminNotice={adminNotice}
        showAddMember={showAddMember}
        setShowAddMember={setShowAddMember}
        phoneToAdd={phoneToAdd}
        setPhoneToAdd={setPhoneToAdd}
        isAddingByPhone={isAddingByPhone}
        onAddMemberByPhone={handleAddMemberByPhone}
        pastChatUsers={pastChatUsers}
        contacts={contacts}
        selectedChat={selectedChat}
        myUserId={myUserId}
        onAddMemberToGroup={handleAddMemberToGroup}
        showRemoveMember={showRemoveMember}
        setShowRemoveMember={setShowRemoveMember}
        onRemoveMemberFromGroup={handleRemoveMemberFromGroup}
        showParticipants={showParticipants}
        setShowParticipants={setShowParticipants}
        showMessageInfo={showMessageInfo}
        closeMessageInfo={closeMessageInfo}
        selectedMessageForInfo={selectedMessageForInfo}
        savedContact={savedContact}
      />
    </div>
  );
}
