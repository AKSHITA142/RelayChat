import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, MoreVertical } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const dropdownVariants = {
  hidden: { opacity: 0, y: -10, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -10, scale: 0.95 },
};

export default function DropdownMenu({ 
  trigger, 
  children, 
  className,
  position = "bottom-right",
  align = "end"
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleToggle = () => setIsOpen(!isOpen);

  const handleClickOutside = (event) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getPositionClasses = () => {
    switch (position) {
      case "bottom-right":
        return "top-full right-0 mt-2";
      case "bottom-left":
        return "top-full left-0 mt-2";
      case "top-right":
        return "bottom-full right-0 mb-2";
      case "top-left":
        return "bottom-full left-0 mb-2";
      default:
        return "top-full right-0 mt-2";
    }
  };

  return (
    <div ref={dropdownRef} className={cn("relative inline-block", className)}>
      {/* Trigger */}
      <button
        onClick={handleToggle}
        className="inline-flex items-center justify-center rounded-xl p-2 text-muted-foreground transition-all duration-300 hover:bg-white/10 hover:text-foreground"
      >
        {trigger || <MoreVertical size={20} />}
      </button>

      {/* Dropdown Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={dropdownVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={cn(
              "absolute z-50 min-w-[200px] overflow-hidden rounded-2xl border border-white/10 bg-card/95 backdrop-blur-2xl shadow-panel",
              getPositionClasses(),
              align === "end" && "text-right"
            )}
          >
            <div className="py-2">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function DropdownItem({ 
  children, 
  icon: Icon, 
  onClick, 
  className,
  variant = "default",
  disabled = false 
}) {
  const variantStyles = {
    default: "text-foreground hover:bg-white/10",
    destructive: "text-destructive hover:bg-destructive/10",
    success: "text-secondary hover:bg-secondary/10",
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02, x: 4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-3 text-sm transition-all duration-200",
        variantStyles[variant],
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {Icon && <Icon size={16} className="flex-shrink-0" />}
      <span className="flex-1 text-left">{children}</span>
    </motion.button>
  );
}

export function DropdownSeparator() {
  return (
    <div className="mx-4 my-1 h-px bg-white/10" />
  );
}
