import { cn } from "@/lib/utils";

export default function MessageBubble({
  id,
  isOwn,
  myUserId,
  isHighlighted = false,
  isDimmed = false,
  isDeleted = false,
  hasReactions = false,
  onContextMenu,
  onPressStart,
  onPressEnd,
  children,
  footer,
  reactions,
  actions,
  replyTo,
  contacts = [],
}) {
  const replySenderId = (replyTo?.sender?._id || replyTo?.sender)?.toString();
  const isReplyToMe = replySenderId && myUserId && replySenderId === myUserId.toString();

  const getReplyToName = () => {
    if (isReplyToMe) return "You";
    const contact = contacts.find((c) => c.userId?.toString() === replySenderId);
    if (contact?.savedName) return contact.savedName;
    return replyTo?.sender?.name || replyTo?.sender?.phoneNumber || "User";
  };

  return (
    <div
      id={id}
      className={cn("group relative mb-4 flex px-2 md:px-4", isOwn ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "relative max-w-[min(84%,42rem)] border px-4 py-3 transition-all",
          isDeleted ? "max-w-fit rounded-[22px] border-white/10 bg-white/6 text-muted-foreground" : "rounded-2xl",
          !isDeleted && hasReactions ? "pb-6" : "",
          !isDeleted && isDimmed ? "border-dashed border-white/10 bg-white/6 text-muted-foreground grayscale opacity-40" : "",
          !isDeleted && !isDimmed && isHighlighted ? "border-amber-400/50 bg-amber-100 text-amber-950 ring-4 ring-amber-400/40" : "",
          !isDeleted && !isDimmed && !isHighlighted && isOwn
            ? "message-bubble--own rounded-br-[8px] border-primary/15"
            : "",
          !isDeleted && !isDimmed && !isHighlighted && !isOwn
            ? "message-bubble--other rounded-bl-[8px] border-white/10"
            : ""
        )}
        onContextMenu={onContextMenu}
        onTouchStart={onPressStart}
        onTouchEnd={onPressEnd}
        onMouseDown={onPressStart}
        onMouseUp={onPressEnd}
        onMouseLeave={onPressEnd}
      >
        {actions}
        
        {replyTo && (
          <div className="mb-2 overflow-hidden rounded-lg border-l-4 border-primary bg-black/30 p-2 text-[11px] backdrop-blur-md ring-1 ring-white/5">
            <p className="font-bold text-white drop-shadow-sm">
              {getReplyToName()}
            </p>
            <p className="mt-0.5 truncate text-white/80 font-medium leading-tight">
              {replyTo.content || (replyTo.fileName ? "📎 Attachment" : "Message start")}
            </p>
          </div>
        )}
        
        <div className="relative z-10">{children}</div>
        {footer ? (
          <div className={cn("mt-2 flex items-center justify-end gap-1.5", isOwn ? "opacity-80" : "opacity-65")}>
            {footer}
          </div>
        ) : null}
        {reactions}
      </div>
    </div>
  );
}
