import { memo, useEffect, useRef, useState, useCallback } from "react";
import { Check, CheckCheck, ShieldAlert } from "lucide-react";
import MessageActions from "./message/MessageActions";
import MessageAttachment from "./message/MessageAttachment";
import MessageBubble from "./message/MessageBubble";
import MessageReactions from "./message/MessageReactions";
import { getLoggedInUser } from "../utils/auth";
import socket from "../services/socket";
import api from "../services/api";
import { getDecryptedAttachmentData } from "../services/e2ee";

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

const Message = memo(function Message({
  id,
  message,
  isOwn,
  onDeleteMe,
  onDeleteEveryone,
  onShowMessageInfo,
  searchQuery = "",
  isHighlighted = false,
  participantIds = [],
  isGroupChat = false,
  onReply,
  onEdit,
  onPin,
  contacts = [],
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [menuIsUpwards, setMenuIsUpwards] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState(null);
  const [attachmentMeta, setAttachmentMeta] = useState(null);
  const [attachmentError, setAttachmentError] = useState(false);
  const pressTimerRef = useRef(null);

  const myId = getLoggedInUser()?._id;
  const msg = message;
  const isMe = isOwn;
  const effectiveFileName = attachmentMeta?.fileName || msg.fileName || "Attachment";
  const effectiveFileType = attachmentMeta?.mimeType || msg.fileType || "application/octet-stream";
  const isDeletedForMe = msg.deletedFor?.includes(myId);
  const hasReactions = Array.isArray(msg.reactions) && msg.reactions.length > 0;

  useEffect(() => {
    let cancelled = false;

    const resolveAttachment = async () => {
      if (!msg?.fileUrl) {
        setAttachmentUrl(null);
        setAttachmentMeta(null);
        setAttachmentError(false);
        return;
      }

      try {
        const resolvedAttachment = await getDecryptedAttachmentData(msg, myId);
        if (!cancelled) {
          setAttachmentUrl(resolvedAttachment?.url || null);
          setAttachmentMeta(resolvedAttachment);
          setAttachmentError(false);
        }
      } catch (error) {
        console.error("Failed to load attachment:", error);
        if (!cancelled) {
          setAttachmentUrl(null);
          setAttachmentMeta(null);
          setAttachmentError(true);
        }
      }
    };

    resolveAttachment();

    return () => {
      cancelled = true;
    };
  }, [msg, myId]);

  useEffect(() => {
    return () => clearTimeout(pressTimerRef.current);
  }, []);

  const renderContentWithHighlights = (content) => {
    if (!searchQuery.trim()) return content;
    const parts = content.split(new RegExp(`(${searchQuery})`, "gi"));

    return (
      <>
        {parts.map((part, index) =>
          part.toLowerCase() === searchQuery.toLowerCase() ? (
            <mark key={`${part}-${index}`} className="rounded-sm border-b border-amber-500/50 bg-amber-400/40 px-0.5 text-inherit">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  const formatTime = (dateStr) => {
    try {
      if (!dateStr) return "";
      const date = new Date(dateStr);
      if (Number.isNaN(date.getTime())) return "";
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  const handleDeleteForMe = () => {
    onDeleteMe(msg._id);
    setShowMenu(false);
  };

  const handleRestoreForMe = () => {
    socket.emit("restore-for-me", { messageId: msg._id });
    setShowMenu(false);
  };

  const handleDeleteForEveryone = () => {
    if (window.confirm("Permanently delete this message for all participants?")) {
      onDeleteEveryone(msg._id);
    }
    setShowMenu(false);
  };

  const handleReact = async (emoji) => {
    try {
      await api.patch(`/message/${msg._id}/react`, { emoji });
      setShowReactions(false);
    } catch (error) {
      console.error("Failed to react:", error);
    }
  };

  const startPress = () => {
    pressTimerRef.current = setTimeout(() => {
      setShowReactions(true);
    }, 500);
  };

  const endPress = () => {
    clearTimeout(pressTimerRef.current);
  };

  const renderStatus = () => {
    if (!isMe || msg?.isDeleted) return null;

    const otherParticipantIds = participantIds.filter((participantId) => participantId !== myId?.toString());
    const seenByIds = Array.isArray(msg?.seenBy)
      ? [...new Set(msg.seenBy.map((receipt) => getEntityId(receipt?.userId ?? receipt)).filter(Boolean))]
      : [];

    if (isGroupChat) {
      const hasAllReads =
        otherParticipantIds.length > 0 &&
        otherParticipantIds.every((participantId) => seenByIds.includes(participantId));

      if (hasAllReads) return <CheckCheck className="text-sky-400" size={14} />;
      if (msg?.status === "delivered" || msg?.status === "seen" || seenByIds.length > 0) {
        return <CheckCheck className="text-muted-foreground" size={14} />;
      }
      return <Check className="text-muted-foreground" size={14} />;
    }

    if (seenByIds.length > 0) return <CheckCheck className="text-sky-400" size={14} />;

    switch (msg?.status) {
      case "seen":
        return <CheckCheck className="text-sky-400" size={14} />;
      case "delivered":
        return <CheckCheck className="text-muted-foreground" size={14} />;
      default:
        return <Check className="text-muted-foreground" size={14} />;
    }
  };

  if (msg.isDeleted) {
    return (
      <MessageBubble id={id} isOwn={isMe} isDeleted>
        <div className="flex items-center gap-2 text-xs italic text-muted-foreground">
          <ShieldAlert size={14} />
          This message was retracted
          <span className="ml-2 text-[10px] opacity-60">{formatTime(msg.createdAt)}</span>
        </div>
      </MessageBubble>
    );
  }

  return (
      <MessageBubble
        id={id}
        isOwn={isMe}
        myUserId={myId}
        isHighlighted={isHighlighted}
        isDimmed={isDeletedForMe}
        hasReactions={hasReactions}
        onContextMenu={(event) => {
          event.preventDefault();
          setShowMenu(true);
        }}
        onPressStart={startPress}
        onPressEnd={endPress}
        footer={
          <>
            {msg.isEdited && <span className="text-[9px] font-medium opacity-50 uppercase mr-1">Edited</span>}
            <span className="text-[10px] font-bold uppercase tracking-tighter">{formatTime(msg.createdAt)}</span>
            {renderStatus()}
          </>
        }
        reactions={
          <MessageReactions
            reactions={msg.reactions}
            pickerVisible={showReactions}
            isOwn={isMe}
            onSelect={handleReact}
          />
        }
        replyTo={msg.replyTo}
        contacts={contacts}
        actions={
          <MessageActions
            isOwn={isMe}
            isOpen={showMenu}
            menuIsUpwards={menuIsUpwards}
            isDeletedForMe={isDeletedForMe}
            isDeleted={Boolean(msg.isDeleted)}
            onToggle={(event) => {
              event.stopPropagation();
              const rect = event.currentTarget.getBoundingClientRect();
              setMenuIsUpwards(rect.bottom + 200 > window.innerHeight);
              setShowMenu(true);
            }}
            onClose={() => setShowMenu(false)}
            onRestore={handleRestoreForMe}
            onDeleteMe={handleDeleteForMe}
            onDeleteEveryone={handleDeleteForEveryone}
            onViewInfo={() => {
              onShowMessageInfo(msg);
              setShowMenu(false);
            }}
            onReply={() => {
              onReply?.(msg);
              setShowMenu(false);
            }}
            onEdit={() => {
              onEdit?.(msg);
              setShowMenu(false);
            }}
            onPin={() => {
              onPin?.(msg);
              setShowMenu(false);
            }}
          />
        }
      >
      {msg?.fileUrl ? (
        <MessageAttachment
          message={msg}
          isOwn={isMe}
          attachmentUrl={attachmentUrl}
          attachmentError={attachmentError}
          effectiveFileName={effectiveFileName}
          effectiveFileType={effectiveFileType}
          renderContent={renderContentWithHighlights}
        />
      ) : (
        <p className="break-words text-[15px] leading-relaxed">{renderContentWithHighlights(msg.content)}</p>
      )}
    </MessageBubble>
  );
});

export default Message;
