import { useState } from "react";
import { getLoggedInUser } from "../utils/auth";
import socket from "../services/socket";

export default function Message({ msg }) {
  const [showMenu, setShowMenu] = useState(false);
  const myId = getLoggedInUser()?._id;
  const isMe = (msg.sender?._id || msg.sender)?.toString() === myId?.toString();

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const handleDeleteForMe = () => {
    socket.emit("delete-for-me", { messageId: msg._id });
    setShowMenu(false);
  };

  const handleDeleteForEveryone = () => {
    if (window.confirm("Delete this message for everyone?")) {
      socket.emit("delete-for-everyone", { messageId: msg._id, chatId: msg.chat });
    }
    setShowMenu(false);
  };

  const renderStatus = () => {
    if (!isMe || msg.isDeleted) return null;
    
    switch (msg.status) {
      case "seen":
        return <span className="status-ticks seen">✓✓</span>;
      case "delivered":
        return <span className="status-ticks delivered">✓✓</span>;
      default:
        return <span className="status-ticks sent">✓</span>;
    }
  };

  if (msg.isDeleted) {
    return (
      <div className={`message deleted ${isMe ? "sent" : "received"}`}>
        <div className="message-content">
          <span className="deleted-icon">🚫</span> This message was deleted
        </div>
        <div className="message-info">
          <span className="message-time">{formatTime(msg.createdAt)}</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`message ${isMe ? "sent" : "received"}`}
      onContextMenu={(e) => {
        e.preventDefault();
        setShowMenu(true);
      }}
    >
      <div className="message-content">
        {msg.fileUrl ? (
          <div className="message-attachment">
            {msg.fileType.startsWith("image/") ? (
              <img 
                src={`http://localhost:5002${msg.fileUrl}`} 
                alt={msg.fileName} 
                className="attachment-image" 
                onClick={() => window.open(`http://localhost:5002${msg.fileUrl}`, "_blank")}
              />
            ) : (
              <a 
                href={`http://localhost:5002${msg.fileUrl}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="attachment-file"
              >
                <span className="file-icon">📄</span>
                <span className="file-name">{msg.fileName}</span>
              </a>
            )}
            {msg.content && msg.content !== msg.fileName && <p className="attachment-caption">{msg.content}</p>}
          </div>
        ) : (
          msg.content
        )}
        <button 
          className="message-options-btn" 
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(true);
          }}
        >
          ⌄
        </button>
      </div>
      <div className="message-info">
        <span className="message-time">{formatTime(msg.createdAt)}</span>
        {renderStatus()}
      </div>

      {showMenu && (
        <>
          <div className="menu-backdrop" onClick={() => setShowMenu(false)} />
          <div className="message-menu">
            <button onClick={handleDeleteForMe}>Delete for me</button>
            {isMe && <button onClick={handleDeleteForEveryone} className="delete-everyone">Delete for everyone</button>}
          </div>
        </>
      )}
    </div>
  );
}

