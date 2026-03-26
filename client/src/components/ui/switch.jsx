import * as React from "react";
import { cn } from "@/lib/utils";

const Switch = React.forwardRef(
  ({ className, checked = false, onCheckedChange, disabled = false, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => {
        if (!disabled) {
          onCheckedChange?.(!checked);
        }
      }}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-all duration-300",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "border-primary/30 bg-primary shadow-[0_12px_28px_-14px_hsl(var(--primary)/0.75)]" : "border-white/10 bg-white/8",
        className
      )}
      {...props}
    >
      <span
        className={cn(
          "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-[0_8px_16px_-10px_rgba(2,8,23,0.8)] transition-transform",
          checked ? "translate-x-5" : "translate-x-0.5"
        )}
      />
    </button>
  )
);

Switch.displayName = "Switch";

export { Switch };
