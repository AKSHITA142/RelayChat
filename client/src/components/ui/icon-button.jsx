import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const iconButtonVariants = cva(
  "inline-flex items-center justify-center rounded-xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-border bg-card/70 text-muted-foreground hover:bg-accent hover:text-foreground",
        primary: "border-primary/20 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground",
        secondary: "border-secondary/20 bg-secondary/10 text-secondary hover:bg-secondary hover:text-secondary-foreground",
        destructive: "border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground",
        ghost: "border-transparent bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground",
      },
      size: {
        sm: "h-8 w-8",
        md: "h-10 w-10",
        lg: "h-11 w-11",
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
