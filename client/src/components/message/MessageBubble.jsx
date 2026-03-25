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

const hoverVariants = {
  hover: {
    scale: 1.02,
    transition: { type: "spring", damping: 20, stiffness: 400 },
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
      className={cn("group relative mb-4 flex px-2 md:px-4", isOwn ? "justify-end" : "justify-start")}
    >
      <motion.div
        className={cn(
          "relative max-w-[min(84%,42rem)] border px-4 py-3 shadow-sm transition-all duration-300 backdrop-blur-2xl",
          isDeleted ? "max-w-fit rounded-[22px] border-white/10 bg-white/6 text-muted-foreground shadow-none" : "rounded-[24px]",
          !isDeleted && hasReactions ? "pb-6" : "",
          !isDeleted && isDimmed ? "border-dashed border-white/10 bg-white/6 text-muted-foreground grayscale opacity-40" : "",
          !isDeleted && !isDimmed && isHighlighted ? "border-amber-400/50 bg-amber-100 text-amber-950 ring-4 ring-amber-400/40" : "",
          !isDeleted && !isDimmed && !isHighlighted && isOwn
            ? "message-bubble--own rounded-br-[8px] border-primary/15 shadow-[0_28px_70px_-40px_hsl(var(--primary)/0.55)] hover:shadow-[0_32px_80px_-40px_hsl(var(--primary)/0.65)]"
            : "",
          !isDeleted && !isDimmed && !isHighlighted && !isOwn
            ? "message-bubble--other rounded-bl-[8px] border-white/10 shadow-[0_18px_48px_-34px_hsl(var(--foreground)/0.32)] hover:shadow-[0_22px_56px_-34px_hsl(var(--foreground)/0.42)]"
            : ""
        )}
        variants={hoverVariants}
        whileHover="hover"
        onContextMenu={onContextMenu}
        onTouchStart={onPressStart}
        onTouchEnd={onPressEnd}
        onMouseDown={onPressStart}
        onMouseUp={onPressEnd}
        onMouseLeave={onPressEnd}
      >
        {actions}
        <div className="relative z-10">{children}</div>
        {footer ? <div className={cn("mt-2 flex items-center justify-end gap-1.5", isOwn ? "opacity-80" : "opacity-65")}>{footer}</div> : null}
        {reactions}
      </motion.div>
    </motion.div>
  );
}
