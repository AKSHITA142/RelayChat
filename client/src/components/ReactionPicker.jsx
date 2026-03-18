import React from "react";
import { motion, AnimatePresence } from "framer-motion";

// Ensure `motion` is treated as used by the linter (used in JSX via <motion.* />)
void motion;

const REACTION_EMOJIS = ["❤️", "😂", "👍", "🙏", "🔥", "😭"];

export default function ReactionPicker({ onSelect, isVisible, position = "top" }) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5, y: position === "top" ? 10 : -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: position === "top" ? 10 : -10 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className={`absolute ${position === "top" ? "bottom-full mb-2" : "top-full mt-2"} left-0 z-[60] flex items-center gap-1 bg-whatsapp-sidebar-dark/95 backdrop-blur-xl border border-white/10 p-1.5 rounded-full shadow-2xl`}
        >
          {REACTION_EMOJIS.map((emoji) => (
            <motion.button
              key={emoji}
              whileHover={{ scale: 1.3, y: -2 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(emoji);
              }}
              className="w-9 h-9 flex items-center justify-center text-xl hover:bg-white/10 rounded-full transition-colors"
            >
              {emoji}
            </motion.button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
