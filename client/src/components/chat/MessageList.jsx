import { FilePlus, UserPlus } from "lucide-react";
import Message from "../Message";

export default function MessageList({
  messages,
  myUserId,
  selectedChat,
  searchQuery,
  searchResults,
  currentSearchIndex,
  onDeleteMe,
  onDeleteEveryone,
  onShowMessageInfo,
  messagesEndRef,
}) {
  if (!messages?.length) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="max-w-4xl text-center">
          <div className="mb-4 text-6xl opacity-20">💬</div>
          <h3 className="text-lg font-semibold text-white/50">No messages yet</h3>
          <p className="mt-2 text-sm text-white/30">Start a conversation to see messages here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 overflow-y-auto px-1 pb-24 pt-5 md:px-2">
      {messages.map((message, index) => {
        if (!message?._id) return null;

        return (
          <Message
            key={message._id}
            id={`msg-${message._id}`}
            message={message}
            isOwn={(message.sender?._id || message.sender)?.toString() === myUserId?.toString()}
            participantIds={(selectedChat?.participants || []).map((participant) =>
              typeof participant === "string" ? participant : (participant?._id || participant)?.toString()
            )}
            isGroupChat={Boolean(selectedChat?.isGroup)}
            onDeleteMe={onDeleteMe}
            onDeleteEveryone={onDeleteEveryone}
            onShowMessageInfo={onShowMessageInfo}
            searchQuery={searchQuery}
            isHighlighted={searchResults[currentSearchIndex] === index}
          />
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}
