import { useState, useCallback, useRef, useEffect } from "react";
import { FilePlus, Mic, Paperclip, Send, Smile, X } from "lucide-react";
import VoiceRecorder from "../VoiceRecorder";
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
  const textareaRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const inputContainerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        emojiPickerRef.current && 
        !emojiPickerRef.current.contains(event.target) && 
        inputContainerRef.current && 
        !inputContainerRef.current.contains(event.target)
      ) {
        setShowEmojiPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setShowEmojiPicker]);

  const handleEmojiClick = useCallback((emoji) => {
    const newText = text + emoji;
    onTextChange(newText);
    setShowEmojiPicker(false);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [text, onTextChange, setShowEmojiPicker]);

  const handleInputChange = useCallback((e) => {
    onTextChange(e.target.value);
  }, [onTextChange]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }, [onSend]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 144) + "px";
    }
  }, [text]);

  return (
    <footer className="relative z-10 px-3 pb-3 pt-2 md:px-4 md:pb-4">
      {isVoiceRecording ? (
        <VoiceRecorder onSend={onVoiceSend} onCancel={onCancelVoice} />
      ) : (
        <div className="space-y-3">
          {selectedFile && (
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/20 p-2">
                  <FilePlus size={16} className="text-primary" />
                </div>
                <span className="max-w-[200px] truncate text-sm font-medium">{selectedFile.name}</span>
              </div>
              <button
                onClick={onClearSelectedFile}
                className="rounded-lg p-1 text-white/50 hover:bg-white/10 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
          )}

          <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 md:px-4" ref={inputContainerRef}>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
                  showEmojiPicker
                    ? "bg-primary text-primary-foreground"
                    : "text-white/60 hover:bg-white/10 hover:text-white"
                )}
              >
                <Smile size={20} />
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              >
                <Paperclip size={20} />
              </button>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) onFilePicked(file);
                e.target.value = "";
              }}
            />

            <div className="relative flex-1">
              {showEmojiPicker && (
                <div 
                  ref={emojiPickerRef}
                  className="absolute bottom-full left-0 mb-2 w-64 rounded-xl border border-white/10 bg-black/95 p-3 shadow-xl backdrop-blur-md"
                >
                  <div className="grid grid-cols-5 gap-1">
                    {EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleEmojiClick(emoji)}
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-xl transition-all hover:bg-white/10 hover:scale-110"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              <textarea
                ref={textareaRef}
                value={text}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onPaste={onPaste}
                rows={1}
                placeholder="Type a message..."
                className="max-h-36 w-full resize-none bg-transparent py-2 text-sm text-white outline-none placeholder:text-white/40"
              />
            </div>

            <button
              onClick={text.trim() || selectedFile ? onSend : onStartVoice}
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all",
                text.trim() || selectedFile
                  ? "bg-primary text-primary-foreground"
                  : "bg-white/10 text-white/80 hover:bg-white/20"
              )}
            >
              {text.trim() || selectedFile ? <Send size={18} /> : <Mic size={18} />}
            </button>
          </div>
        </div>
      )}
    </footer>
  );
}
