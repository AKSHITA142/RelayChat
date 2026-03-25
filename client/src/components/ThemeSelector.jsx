import { motion, AnimatePresence } from "framer-motion";
import { Check, X } from "lucide-react";
import { getThemeClassName, THEME_NAMES } from "../hooks/useChatTheme";
import { cn } from "@/lib/utils";

const SWATCH_ORDER = ["stealth_dark", "void", "minimal_dark", "minimal_light"];

export default function ThemeSelector({ currentTheme, onSelect, onClose }) {
  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80]"
        onClick={onClose}
      />

      <motion.div
        key="panel"
        initial={{ opacity: 0, y: -12, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -12, scale: 0.94 }}
        transition={{ type: "spring", damping: 22, stiffness: 320 }}
        className="surface-panel absolute right-14 top-14 z-[90] w-72 p-4"
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-black uppercase tracking-widest text-primary">
            Chat Theme
          </p>
          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/6 p-1.5 text-muted-foreground transition-all hover:text-foreground"
          >
            <X size={14} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {SWATCH_ORDER.map((themeKey) => {
            const isActive = currentTheme === themeKey;

            return (
              <motion.button
                key={themeKey}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  onSelect(themeKey);
                  onClose();
                }}
                className={cn(
                  "relative rounded-[20px] border border-white/10 p-2.5 transition-all",
                  "bg-white/6 hover:-translate-y-0.5 hover:border-primary/20 hover:bg-white/10",
                  isActive && "border-primary/25 bg-primary/12 shadow-[0_16px_38px_-24px_hsl(var(--primary)/0.65)]"
                )}
              >
                <div className={cn("theme-preview rounded-lg border border-border/60 p-1", getThemeClassName(themeKey))}>
                  <div className="theme-preview__header" />
                  <div className="mt-1 flex flex-col gap-1 p-1">
                    <div className="theme-preview__bubble theme-preview__bubble--other w-3/5" />
                    <div className="theme-preview__bubble theme-preview__bubble--own ml-auto w-2/5" />
                  </div>
                </div>

                <span className="mt-2 block text-[10px] font-bold uppercase tracking-wider text-foreground/80">
                  {THEME_NAMES[themeKey]}
                </span>

                {isActive ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md"
                  >
                    <Check size={11} />
                  </motion.div>
                ) : null}
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
