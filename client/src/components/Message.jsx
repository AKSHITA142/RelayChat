import { getLoggedInUser } from "../utils/auth";

export default function Message({ msg }) {
  const myId = getLoggedInUser()?._id;
  const isMe = (msg.sender?._id || msg.sender)?.toString() === myId?.toString();

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const renderStatus = () => {
    if (!isMe) return null;
    
    switch (msg.status) {
      case "seen":
        return <span className="status-ticks seen">✓✓</span>;
      case "delivered":
        return <span className="status-ticks delivered">✓✓</span>;
      default:
        return <span className="status-ticks sent">✓</span>;
    }
  };

  return (
    <div className={`message ${isMe ? "sent" : "received"}`}>
      <div className="message-content">{msg.content}</div>
      <div className="message-info">
        <span className="message-time">{formatTime(msg.createdAt)}</span>
        {renderStatus()}
      </div>
    </div>
  );
}
