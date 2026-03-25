import { AnimatePresence, motion } from "framer-motion";
import { FilePlus, Mic, Paperclip, Send, Smile, X } from "lucide-react";
import VoiceRecorder from "../VoiceRecorder";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils";

const EMOJIS = ["😊", "😂", "❤️", "👍", "🙏", "🔥", "😭", "😮", "🎉", "✨", "💯", "✅", "🙌", "💀", "🤣", "🤔", "😘", "😎", "👀", "👋"];

export default function MessageInput({
  text,
  onTextChange,
  onSend,
  onPaste,
  selectedFile,
  onClearSelectedFile,
  onFilePicked,
  showEmojiPicker,
  setShowEmojiPicker,
  fileInputRef,
  isVoiceRecording,
  onVoiceSend,
  onCancelVoice,
  onStartVoice,
}) {
  return (
    <footer className="relative z-10 px-3 pb-3 pt-2 md:px-4 md:pb-4">
      <AnimatePresence mode="wait">
        {isVoiceRecording ? (
          <motion.div
            key="voice-recorder"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <VoiceRecorder onSend={onVoiceSend} onCancel={onCancelVoice} />
          </motion.div>
        ) : (
          <motion.div
            key="text-input"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="space-y-4"
          >
            <AnimatePresence>
              {selectedFile ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="surface-inline flex items-center justify-between rounded-[22px] border-secondary/20 bg-secondary/12 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl border border-secondary/20 bg-secondary/20 p-2">
                      <FilePlus size={16} className="text-secondary" />
                    </div>
                    <div>
                      <p className="max-w-xs truncate text-sm font-semibold text-foreground">{selectedFile.name}</p>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Attachment ready</p>
                    </div>
                  </div>
                  <IconButton icon={X} label="Remove attachment" variant="ghost" onClick={onClearSelectedFile} />
                </motion.div>
              ) : null}
            </AnimatePresence>

            <div className="surface-panel relative flex items-end gap-3 px-3 py-3 md:px-4">
              <div className="flex gap-2">
                <IconButton
                  icon={Smile}
                  label="Emoji picker"
                  variant={showEmojiPicker ? "primary" : "default"}
                  onClick={() => setShowEmojiPicker((value) => !value)}
                />
                <IconButton
                  icon={Paperclip}
                  label="Attach file"
                  variant="default"
                  onClick={() => fileInputRef.current?.click()}
                />
              </div>

              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files[0];
                  if (file) onFilePicked(file);
                }}
              />

              <div className="relative flex-1">
                <div className="rounded-[1.8rem] border border-white/10 bg-white/6 px-5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_20px_60px_-38px_hsl(var(--primary)/0.35)] backdrop-blur-xl">
                  <textarea
                    value={text}
                    onChange={(event) => onTextChange(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        onSend();
                      }
                    }}
                    onPaste={onPaste}
                    rows={1}
                    placeholder="Write a message..."
                    className="max-h-36 min-h-[1.5rem] w-full resize-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  />
                </div>

                <AnimatePresence>
                  {showEmojiPicker ? (
                    <motion.div
                      initial={{ opacity: 0, y: 18, scale: 0.94 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 18, scale: 0.94 }}
                      className="absolute bottom-[calc(100%+0.85rem)] left-0 z-50 grid grid-cols-5 gap-3 rounded-[24px] border border-white/10 bg-card/88 p-4 shadow-panel backdrop-blur-2xl"
                    >
                      {EMOJIS.map((emoji) => (
                        <motion.button
                          key={emoji}
                          whileHover={{ scale: 1.15 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => {
                            onTextChange(`${text}${emoji}`);
                            setShowEmojiPicker(false);
                          }}
                          className="rounded-xl p-1 text-2xl transition-colors hover:bg-white/8"
                        >
                          {emoji}
                        </motion.button>
                      ))}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={text.trim() || selectedFile ? onSend : onStartVoice}
                className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg transition-all",
                  text.trim() || selectedFile
                    ? "border border-primary/30 bg-primary text-primary-foreground shadow-button"
                    : "border border-white/10 bg-white/6 text-foreground hover:border-primary/25 hover:text-primary"
                )}
              >
                {text.trim() || selectedFile ? <Send size={22} /> : <Mic size={22} />}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </footer>
  );
}
