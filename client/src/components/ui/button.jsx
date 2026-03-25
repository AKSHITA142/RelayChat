import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "interactive-btn relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl border text-sm font-semibold tracking-[-0.01em] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border-primary/30 bg-primary text-primary-foreground shadow-button hover:-translate-y-0.5 hover:brightness-105",
        secondary:
          "border-secondary/20 bg-secondary/14 text-secondary shadow-[0_16px_40px_-22px_hsl(var(--secondary)/0.55)] hover:-translate-y-0.5 hover:bg-secondary hover:text-secondary-foreground",
        outline:
          "border-white/10 bg-white/6 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:-translate-y-0.5 hover:border-primary/30 hover:bg-white/10",
        ghost:
          "border-transparent bg-transparent text-muted-foreground hover:bg-white/8 hover:text-foreground",
        destructive:
          "border-destructive/25 bg-destructive/12 text-destructive shadow-[0_16px_40px_-24px_hsl(var(--destructive)/0.6)] hover:-translate-y-0.5 hover:bg-destructive hover:text-destructive-foreground",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-9 rounded-xl px-3.5 text-xs",
        lg: "h-12 rounded-2xl px-8 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

const Button = React.forwardRef(({ className, variant, size, ...props }, ref) => (
  <button
    className={cn(buttonVariants({ variant, size, className }))}
    ref={ref}
    {...props}
  />
));

Button.displayName = "Button";

// eslint-disable-next-line react-refresh/only-export-components
export { Button, buttonVariants };
