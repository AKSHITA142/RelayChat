import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const bubbleVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", damping: 20, stiffness: 280 },
  },
};

export default function MessageBubble({
  id,
  isOwn,
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
}) {
  return (
    <motion.div
      id={id}
      variants={bubbleVariants}
      initial="hidden"
      animate="visible"
      className={cn("group relative mb-4 flex px-4", isOwn ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "relative max-w-[min(82%,40rem)] border px-4 py-3 shadow-sm transition-all duration-200 backdrop-blur-xl",
          isDeleted ? "max-w-fit rounded-2xl border-border/60 bg-muted/40 text-muted-foreground shadow-none" : "rounded-[20px]",
          !isDeleted && hasReactions ? "pb-6" : "",
          !isDeleted && isDimmed ? "border-dashed border-border bg-muted/40 text-muted-foreground grayscale opacity-40" : "",
          !isDeleted && !isDimmed && isHighlighted ? "border-amber-400/50 bg-amber-100 text-amber-950 ring-4 ring-amber-400/40" : "",
          !isDeleted && !isDimmed && !isHighlighted && isOwn
            ? "message-bubble--own rounded-br-[6px] border-border/20 shadow-[0_24px_60px_-36px_hsl(var(--primary)/0.48)]"
            : "",
          !isDeleted && !isDimmed && !isHighlighted && !isOwn
            ? "message-bubble--other rounded-bl-[6px] border-border/60 shadow-[0_18px_48px_-34px_hsl(var(--foreground)/0.32)]"
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
        {children}
        {footer ? <div className={cn("mt-2 flex items-center justify-end gap-1.5", isOwn ? "opacity-80" : "opacity-65")}>{footer}</div> : null}
        {reactions}
      </div>
    </motion.div>
  );
}
