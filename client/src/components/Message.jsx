import { getLoggedInUser } from "../utils/auth";

export default function Message({ msg }) {
  const myId = getLoggedInUser()?._id;
  const isMe = (msg.sender?._id || msg.sender)?.toString() === myId?.toString();

  return (
    <div className={`message ${isMe ? "sent" : "received"}`}>
      {msg.content}
    </div>
  );
}
