import { memo } from "react";
import { ExternalLink, FileText } from "lucide-react";
import WaveformPlayer from "../WaveformPlayer";
import { cn } from "@/lib/utils";

const MessageAttachment = memo(function MessageAttachment({
  message,
  isOwn,
  attachmentUrl,
  attachmentError,
  effectiveFileName,
  effectiveFileType,
  renderContent,
}) {
  if (attachmentError) {
    return (
      <div
        className={cn(
          "rounded-[22px] border px-4 py-3 text-sm",
          isOwn ? "border-primary-foreground/10 bg-primary-foreground/10" : "border-white/10 bg-white/6"
        )}
      >
        Unable to decrypt attachment
      </div>
    );
  }

  if (effectiveFileType.startsWith("image/") && attachmentUrl) {
    return (
      <div className="space-y-3">
        <div className="relative overflow-hidden rounded-[22px] border border-black/10">
          <img
            src={attachmentUrl}
            alt={effectiveFileName}
            className="max-h-80 w-full cursor-pointer object-cover transition-transform duration-300 hover:scale-105"
            onClick={() => window.open(attachmentUrl, "_blank")}
          />
        </div>
        {message.content && message.content !== effectiveFileName ? (
          <p className="px-1 text-sm leading-relaxed">{renderContent(message.content)}</p>
        ) : null}
      </div>
    );
  }

  if (effectiveFileType.startsWith("audio/") && attachmentUrl) {
    return (
      <div className="space-y-3 py-1">
        <WaveformPlayer
          url={attachmentUrl}
          accentColor={isOwn ? "hsl(var(--primary-foreground))" : "hsl(var(--primary))"}
          trackColor={isOwn ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))"}
          playIconColor={isOwn ? "hsl(var(--primary))" : "hsl(var(--primary-foreground))"}
        />
        {message.content && message.content !== "Voice Message" ? (
          <p className="px-1 text-sm italic leading-relaxed opacity-80">{message.content}</p>
        ) : null}
      </div>
    );
  }

  if (attachmentUrl) {
    return (
      <div className="space-y-3">
        <a
          href={attachmentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "flex items-center gap-3 rounded-[22px] border p-3 transition-colors",
            isOwn
              ? "border-primary-foreground/10 bg-primary-foreground/10 hover:bg-primary-foreground/15"
              : "border-white/10 bg-white/6 hover:bg-white/10"
          )}
        >
          <div
            className={cn(
              "rounded-xl p-2.5",
              isOwn ? "bg-primary-foreground/15 text-primary-foreground" : "bg-primary/10 text-primary"
            )}
          >
            <FileText size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{effectiveFileName}</p>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">File attachment</p>
          </div>
          <ExternalLink size={14} className="opacity-40" />
        </a>
        {message.content && message.content !== effectiveFileName ? (
          <p className="px-1 text-sm leading-relaxed">{renderContent(message.content)}</p>
        ) : null}
      </div>
    );
  }

  return (
      <div
        className={cn(
          "rounded-[22px] border px-4 py-3 text-sm",
          isOwn ? "border-primary-foreground/10 bg-primary-foreground/10" : "border-white/10 bg-white/6"
        )}
      >
        Loading attachment...
    </div>
  );
});

export default MessageAttachment;
