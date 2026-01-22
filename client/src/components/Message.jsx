export default function Message({ msg }) {
  const myId = localStorage.getItem("userId");

  return (
    <div className={msg.sender === myId ? "msg me" : "msg"}>
      {msg.content}
    </div>
  );
}
