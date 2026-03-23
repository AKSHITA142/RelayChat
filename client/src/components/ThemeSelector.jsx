import { motion, AnimatePresence } from "framer-motion";
import { Check, X } from "lucide-react";
import { THEMES, THEME_NAMES } from "../hooks/useChatTheme";

const SWATCH_ORDER = ["stealth_dark", "void", "minimal_dark", "minimal_light"];
void motion; // ensure framer-motion is treated as used by the linter (used in JSX via <motion.* />)
export default function ThemeSelector({ currentTheme, onSelect, onClose }) {
  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80]"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        key="panel"
        initial={{ opacity: 0, y: -12, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -12, scale: 0.94 }}
        transition={{ type: "spring", damping: 22, stiffness: 320 }}
        className="absolute top-14 right-14 z-[90] bg-[#1c2028]/95 backdrop-blur-3xl border border-[#45484f]/30 rounded-2xl shadow-2xl p-4 w-56"
        style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.5)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-black uppercase tracking-widest text-[#12f1ff]">
            Chat Theme
          </p>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-all"
          >
            <X size={14} />
          </button>
        </div>

        {/* Swatches grid */}
        <div className="grid grid-cols-2 gap-3">
          {SWATCH_ORDER.map((key) => {
            const t = THEMES[key];
            const isActive = currentTheme === key;
            return (
              <motion.button
                key={key}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.93 }}
                onClick={() => { onSelect(key); onClose(); }}
                className="relative flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all"
                style={{
                  borderColor: isActive ? t.primary : "transparent",
                  background: isActive ? `${t.primary}22` : "rgba(255,255,255,0.05)",
                }}
              >
                {/* Mini chat preview */}
                <div
                  className="w-full h-10 rounded-lg overflow-hidden flex flex-col justify-end gap-0.5 border border-white/5 shadow-inner"
                  style={{ background: t.background }}
                >
                  {/* header preview */}
                  <div className="absolute top-0 left-0 right-0 h-2 bg-[#111b21]" />
                  <div className="flex flex-col gap-0.5 p-1">
                    {/* other‑user bubble */}
                    <div
                      className="self-start h-2 w-3/5 rounded-full"
                      style={{ background: t.bubbleOther }}
                    />
                    {/* own bubble */}
                    <div
                      className="self-end h-2 w-2/5 rounded-full"
                      style={{ background: t.bubbleOwn }}
                    />
                  </div>
                </div>

                <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider">
                  {THEME_NAMES[key]}
                </span>

                {/* Active checkmark */}
                {isActive && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center shadow-md"
                    style={{ background: t.primary }}
                  >
                    <Check size={11} color="#fff" />
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
