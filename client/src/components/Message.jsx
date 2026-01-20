export default function Message({ text, isMe }) {
  return (
    <div className={`message ${isMe ? "sent" : "received"}`}>
      {text}
    </div>
  );
}
