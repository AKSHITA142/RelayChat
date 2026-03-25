import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const iconButtonVariants = cva(
  "interactive-btn inline-flex items-center justify-center rounded-2xl border transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "border-white/10 bg-white/6 text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:-translate-y-0.5 hover:border-primary/25 hover:bg-white/10 hover:text-foreground",
        primary:
          "border-primary/20 bg-primary/16 text-primary shadow-[0_14px_36px_-24px_hsl(var(--primary)/0.72)] hover:-translate-y-0.5 hover:bg-primary hover:text-primary-foreground",
        secondary:
          "border-secondary/20 bg-secondary/14 text-secondary shadow-[0_14px_36px_-24px_hsl(var(--secondary)/0.7)] hover:-translate-y-0.5 hover:bg-secondary hover:text-secondary-foreground",
        destructive:
          "border-destructive/20 bg-destructive/12 text-destructive shadow-[0_14px_36px_-24px_hsl(var(--destructive)/0.62)] hover:-translate-y-0.5 hover:bg-destructive hover:text-destructive-foreground",
        ghost:
          "border-transparent bg-transparent text-muted-foreground hover:bg-white/8 hover:text-foreground",
      },
      size: {
        sm: "h-9 w-9",
        md: "h-11 w-11",
        lg: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

const IconButton = React.forwardRef(
  ({ className, variant, size, icon: Icon, children, label, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      className={cn(iconButtonVariants({ variant, size }), className)}
      {...props}
    >
      {Icon ? <Icon className="size-4" /> : children}
    </button>
  )
);

IconButton.displayName = "IconButton";

// eslint-disable-next-line react-refresh/only-export-components
export { IconButton, iconButtonVariants };
