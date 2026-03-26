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
      {pickerVisible ? (
        <div
          className={cn(
            "absolute bottom-full z-[60] mb-3 flex items-center gap-1 rounded-full border border-white/10 bg-card/88 p-1.5 shadow-panel backdrop-blur-xl",
            isOwn ? "right-0" : "left-0"
          )}
        >
          {REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={(event) => {
                event.stopPropagation();
                onSelect(emoji);
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full text-xl transition-transform hover:scale-125 hover:bg-white/8 active:scale-95"
            >
              {emoji}
            </button>
          ))}
        </div>
      ) : null}

      {groupedReactions.length ? (
        <div className={cn("absolute -bottom-4 z-10 flex flex-wrap gap-1", isOwn ? "right-3" : "left-3")}>
          {groupedReactions.map(([emoji, count]) => (
            <button
              key={emoji}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onSelect(emoji);
              }}
              className="flex items-center gap-1 rounded-full border border-white/10 bg-card/88 px-2 py-1 text-sm shadow-lg backdrop-blur-md transition-transform hover:scale-105"
            >
              <span>{emoji}</span>
              {count > 1 ? <span className="text-[10px] font-bold text-muted-foreground">{count}</span> : null}
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}
