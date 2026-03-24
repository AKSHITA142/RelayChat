import { AnimatePresence, motion } from "framer-motion";
import { Cpu, FilePlus, UserPlus } from "lucide-react";
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
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="surface-panel grid max-w-3xl gap-4 p-6 text-center md:grid-cols-3"
        >
          {[
            { icon: <FilePlus className="text-secondary" />, title: "Share media", description: "Drop files, audio, and attachments right into the conversation." },
            { icon: <UserPlus className="text-primary" />, title: "Build context", description: "Messages stay searchable so you can jump straight to the right moment." },
            { icon: <Cpu className="text-foreground" />, title: "Stay fluid", description: "Animations, voice, and attachments are kept responsive even in long threads." },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-border/60 bg-card/60 p-4">
              <div className="mb-4 inline-flex rounded-2xl bg-accent/70 p-3">{item.icon}</div>
              <p className="text-sm font-semibold text-foreground">{item.title}</p>
              <p className="mt-1 text-xs leading-6 text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 overflow-y-auto pb-20 pt-4">
      <AnimatePresence mode="popLayout">
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
      </AnimatePresence>
      <div ref={messagesEndRef} />
    </div>
  );
}
