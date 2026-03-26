import { Clock, Info, MoreVertical, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MessageActions({
  isOwn,
  isOpen,
  menuIsUpwards,
  isDeletedForMe,
  isDeleted,
  onToggle,
  onClose,
  onRestore,
  onDeleteMe,
  onDeleteEveryone,
  onViewInfo,
}) {
  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        onMouseDown={(event) => event.stopPropagation()}
        onTouchStart={(event) => event.stopPropagation()}
        className={cn(
          "absolute -right-10 top-3 rounded-full border border-white/10 bg-card/78 p-1.5 shadow-md transition-all duration-200",
          "opacity-0 backdrop-blur-xl group-hover:translate-x-0 group-hover:opacity-100",
          isOpen ? "opacity-100" : "translate-x-1",
          isOwn ? "text-primary-foreground/80 hover:text-primary-foreground" : "text-muted-foreground hover:text-primary"
        )}
      >
        <MoreVertical size={15} />
      </button>

      {isOpen ? (
        <>
          <div
            className="fixed inset-0 z-[100]"
            onClick={onClose}
          />
          <div
            className={cn(
              "absolute z-[101] min-w-[190px] overflow-hidden rounded-[22px] border border-white/10 bg-card/88 py-1.5 shadow-panel backdrop-blur-2xl",
              isOwn ? "right-3" : "left-3",
              menuIsUpwards ? "bottom-[calc(100%-10px)]" : "top-[calc(100%-10px)]"
            )}
          >
            {isOwn ? (
              <>
                <button
                  type="button"
                  onClick={onViewInfo}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-sky-400 transition-colors hover:bg-sky-500/10 hover:text-sky-300"
                >
                  <Info size={16} />
                  View info
                </button>
                <div className="h-px bg-white/10" />
              </>
            ) : null}

            {isDeletedForMe ? (
              <button
                type="button"
                onClick={onRestore}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-primary transition-colors hover:bg-primary/10"
              >
                <Clock size={16} />
                Bring it back
              </button>
            ) : (
              <button
                type="button"
                onClick={onDeleteMe}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-white/8"
              >
                <Trash2 size={16} className="text-muted-foreground" />
                Remove for me
              </button>
            )}

            {isOwn && !isDeleted ? (
              <button
                type="button"
                onClick={onDeleteEveryone}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
              >
                <Trash2 size={16} />
                Discard for all
              </button>
            ) : null}
          </div>
        </>
      ) : null}
    </>
  );
}
