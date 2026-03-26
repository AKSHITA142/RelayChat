import { ChevronDown, ChevronUp, X } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { SearchField } from "@/components/ui/search-field";

export default function ChatSearchOverlay({
  visible,
  searchQuery,
  onSearchChange,
  resultCount,
  currentIndex,
  onNext,
  onPrev,
  onClose,
  onPaste,
}) {
  if (!visible) return null;

  return (
    <div className="absolute left-4 right-4 top-24 z-40 overflow-hidden rounded-2xl border border-white/10 bg-black/90 px-4 py-4 backdrop-blur-md shadow-xl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <SearchField
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          onPaste={onPaste}
          placeholder="Search in chat..."
          className="flex-1"
        />

        <div className="flex items-center justify-between gap-2 lg:justify-end">
          <span className="min-w-[7rem] text-right text-xs text-white/50">
            {resultCount > 0 ? `${resultCount - currentIndex} of ${resultCount}` : "No matches"}
          </span>
          <IconButton icon={ChevronUp} label="Next result" variant="ghost" onClick={() => onNext(1)} disabled={resultCount === 0} />
          <IconButton icon={ChevronDown} label="Previous result" variant="ghost" onClick={() => onPrev(-1)} disabled={resultCount === 0} />
          <IconButton icon={X} label="Close search" variant="destructive" onClick={onClose} />
        </div>
      </div>
    </div>
  );
}
