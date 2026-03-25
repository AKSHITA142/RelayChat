import { motion } from "framer-motion";
import { useRef, useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";

export function VoiceWaveform({ isActive, className }) {
  const [bars, setBars] = useState(Array(20).fill(0));

  useEffect(() => {
    if (!isActive) {
      setBars(Array(20).fill(0));
      return;
    }

    const interval = setInterval(() => {
      setBars(Array(20).fill(0).map(() => Math.random() * 100));
    }, 100);

    return () => clearInterval(interval);
  }, [isActive]);

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {bars.map((height, index) => (
        <motion.div
          key={index}
          className="w-1 bg-primary rounded-full"
          style={{ height: `${height}%` }}
          animate={{
            height: [`${height}%`, `${height * 1.2}%`, `${height}%`]
          }}
          transition={{
            duration: 0.2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );
}

export function FloatingActionMenu({ 
  items, 
  isOpen, 
  onToggle,
  className 
}) {
  return (
    <div className={cn("relative", className)}>
      <motion.button
        onClick={onToggle}
        className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        animate={{
          rotate: isOpen ? 45 : 0
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 12L12 12M12 12L12 12M12 12L12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M12 5L12 19M5 12L19 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            className="absolute bottom-14 left-1/2 -translate-x-1/2 flex flex-col gap-2"
          >
            {items.map((item, index) => (
              <motion.button
                key={item.id}
                onClick={() => {
                  item.onClick();
                  onToggle();
                }}
                className="surface-panel w-10 h-10 rounded-full flex items-center justify-center shadow-md"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  delay: index * 0.05
                }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                {item.icon}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function TypingIndicator({ users, className }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="surface-panel rounded-2xl px-3 py-2">
        <div className="flex items-center gap-2">
          {users.map((user, index) => (
            <div key={user.id} className="flex items-center gap-1">
              <div 
                className="w-6 h-6 rounded-full text-xs flex items-center justify-center text-white"
                style={{ backgroundColor: user.color }}
              >
                {user.name[0]}
              </div>
              <div className="flex gap-1">
                {[0, 1, 2].map((dot) => (
                  <motion.div
                    key={dot}
                    className="w-1 h-1 bg-foreground rounded-full"
                    animate={{
                      y: [0, -4, 0],
                      opacity: [0.4, 1, 0.4]
                    }}
                    transition={{
                      duration: 0.6,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: dot * 0.1
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
          <span className="text-sm text-muted-foreground">
            {users.map(u => u.name).join(", ")} {users.length === 1 ? "is" : "are"} typing...
          </span>
        </div>
      </div>
    </div>
  );
}

export function ReactionBar({ 
  reactions, 
  onReactionAdd,
  onReactionRemove,
  className 
}) {
  const [selectedReaction, setSelectedReaction] = useState(null);

  const availableReactions = ["❤️", "👍", "😂", "😮", "😢", "🔥"];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Existing Reactions */}
      <div className="flex gap-1">
        {Object.entries(reactions).map(([emoji, count]) => (
          <motion.button
            key={emoji}
            onClick={() => onReactionRemove?.(emoji)}
            className="surface-panel flex items-center gap-1 rounded-full px-2 py-1 text-sm hover:scale-110 transition-transform"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <span>{emoji}</span>
            <span className="text-xs text-muted-foreground">{count}</span>
          </motion.button>
        ))}
      </div>

      {/* Add Reaction */}
      <div className="flex gap-1">
        {availableReactions.map((emoji) => (
          <motion.button
            key={emoji}
            onClick={() => onReactionAdd?.(emoji)}
            className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-lg"
            whileHover={{ scale: 1.2, y: -2 }}
            whileTap={{ scale: 0.8 }}
          >
            {emoji}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

export function MessageStatus({ 
  status, 
  timestamp,
  className 
}) {
  const statusIcons = {
    sending: "⏳",
    sent: "✓",
    delivered: "✓✓",
    read: "✓✓",
    failed: "❌"
  };

  const statusColors = {
    sending: "text-yellow-500",
    sent: "text-blue-500",
    delivered: "text-blue-500",
    read: "text-green-500",
    failed: "text-red-500"
  };

  return (
    <div className={cn("flex items-center gap-1 text-xs", className)}>
      <span className={statusColors[status]}>
        {statusIcons[status]}
      </span>
      <span className="text-muted-foreground">
        {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  );
}

export function SearchHighlight({ 
  text, 
  query,
  className 
}) {
  if (!query) return <span className={className}>{text}</span>;

  const parts = text.split(new RegExp(`(${query})`, 'gi'));

  return (
    <span className={className}>
      {parts.map((part, index) => (
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={index} className="bg-primary/20 text-primary px-1 rounded">
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        )
      ))}
    </span>
  );
}

export function ProgressBar({ 
  progress, 
  showPercentage = true,
  animated = true,
  className 
}) {
  return (
    <div className={cn("w-full", className)}>
      <div className="surface-panel h-2 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{
            duration: animated ? 0.5 : 0,
            ease: "easeOut"
          }}
        />
      </div>
      {showPercentage && (
        <motion.div
          className="text-center text-sm text-muted-foreground mt-1"
          animate={{ opacity: [0, 1] }}
          transition={{ delay: 0.3 }}
        >
          {Math.round(progress)}%
        </motion.div>
      )}
    </div>
  );
}

export function NotificationToast({ 
  title, 
  message, 
  type = "info",
  isVisible,
  onClose,
  className 
}) {
  const typeStyles = {
    info: { bg: "bg-blue-500", icon: "ℹ️" },
    success: { bg: "bg-green-500", icon: "✅" },
    warning: { bg: "bg-yellow-500", icon: "⚠️" },
    error: { bg: "bg-red-500", icon: "❌" }
  };

  const style = typeStyles[type];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.8 }}
          className={cn(
            "surface-panel flex items-center gap-3 rounded-2xl p-4 shadow-lg max-w-sm",
            className
          )}
        >
          <div className={`w-10 h-10 rounded-full ${style.bg} flex items-center justify-center text-white`}>
            {style.icon}
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-sm">{title}</h4>
            <p className="text-xs text-muted-foreground">{message}</p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            ✕
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function SkeletonLoader({ 
  lines = 3, 
  className 
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array(lines).fill(0).map((_, index) => (
        <motion.div
          key={index}
          className="h-4 bg-gradient-to-r from-primary/20 to-primary/10 rounded-full"
          animate={{
            backgroundPosition: ["0% 50%", "100% 50%"]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear"
          }}
          style={{
            backgroundSize: "200% 100%",
            width: `${60 + Math.random() * 40}%`
          }}
        />
      ))}
    </div>
  );
}

export function ContextMenu({ 
  items, 
  position,
  isVisible,
  onClose,
  className 
}) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className={cn(
            "surface-panel rounded-2xl border border-white/10 shadow-xl py-2 min-w-[150px]",
            className
          )}
          style={{
            position: "fixed",
            left: position.x,
            top: position.y,
            zIndex: 1000
          }}
        >
          {items.map((item, index) => (
            <motion.button
              key={item.id}
              onClick={() => {
                item.onClick();
                onClose();
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-white/10 transition-colors flex items-center gap-2"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              {item.icon && <span>{item.icon}</span>}
              <span>{item.label}</span>
            </motion.button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function InfiniteScroll({ 
  children, 
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  className 
}) {
  const observerRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className={cn("space-y-4", className)}>
      {children}
      <div ref={observerRef} className="flex justify-center py-4">
        {isFetchingNextPage && (
          <motion.div
            className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        )}
      </div>
    </div>
  );
}
