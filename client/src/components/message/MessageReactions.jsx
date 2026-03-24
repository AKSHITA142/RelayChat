import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

const REACTION_EMOJIS = ["❤️", "😂", "👍", "🙏", "🔥", "😭"];

export default function MessageReactions({
  reactions = [],
  pickerVisible,
  isOwn,
  onSelect,
}) {
  const groupedReactions = Object.entries(
    (Array.isArray(reactions) ? reactions : []).reduce((accumulator, reaction) => {
      if (reaction?.emoji) {
        accumulator[reaction.emoji] = (accumulator[reaction.emoji] || 0) + 1;
      }
      return accumulator;
    }, {})
  );

  return (
    <>
      <AnimatePresence>
        {pickerVisible ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            transition={{ type: "spring", stiffness: 380, damping: 24 }}
            className={cn(
              "absolute bottom-full z-[60] mb-3 flex items-center gap-1 rounded-full border border-border/80 bg-card/95 p-1.5 shadow-2xl backdrop-blur-xl",
              isOwn ? "right-0" : "left-0"
            )}
          >
            {REACTION_EMOJIS.map((emoji) => (
              <motion.button
                key={emoji}
                whileHover={{ scale: 1.22, y: -2 }}
                whileTap={{ scale: 0.92 }}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelect(emoji);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full text-xl transition-colors hover:bg-accent"
              >
                {emoji}
              </motion.button>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {groupedReactions.length ? (
        <div className={cn("absolute -bottom-4 z-10 flex flex-wrap gap-1", isOwn ? "right-3" : "left-3")}>
          {groupedReactions.map(([emoji, count]) => (
            <motion.button
              key={emoji}
              type="button"
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={{ scale: 1.08 }}
              onClick={(event) => {
                event.stopPropagation();
                onSelect(emoji);
              }}
              className="flex items-center gap-1 rounded-full border border-border/70 bg-card/95 px-2 py-1 text-sm shadow-lg backdrop-blur-md"
            >
              <span>{emoji}</span>
              {count > 1 ? <span className="text-[10px] font-bold text-muted-foreground">{count}</span> : null}
            </motion.button>
          ))}
        </div>
      ) : null}
    </>
  );
}
