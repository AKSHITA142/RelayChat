import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] backdrop-blur-xl",
  {
    variants: {
      status: {
        online: "border-secondary/20 bg-secondary/12 text-secondary",
        active: "border-primary/20 bg-primary/12 text-primary",
        busy: "border-destructive/20 bg-destructive/12 text-destructive",
        offline: "border-white/10 bg-white/6 text-muted-foreground",
        neutral: "border-white/10 bg-white/6 text-accent-foreground",
      },
    },
    defaultVariants: {
      status: "neutral",
    },
  }
);

const statusDotVariants = cva("size-1.5 rounded-full", {
  variants: {
    status: {
      online: "bg-secondary",
      active: "bg-primary",
      busy: "bg-destructive",
      offline: "bg-muted-foreground",
      neutral: "bg-accent-foreground/50",
    },
    pulse: {
      true: "animate-pulse",
      false: "",
    },
  },
  defaultVariants: {
    status: "neutral",
    pulse: false,
  },
});

function StatusBadge({ className, status = "neutral", label, pulse = false, hideDot = false, ...props }) {
  return (
    <span className={cn(statusBadgeVariants({ status }), className)} {...props}>
      {hideDot ? null : <span className={cn(statusDotVariants({ status, pulse }))} />}
      <span>{label || status}</span>
    </span>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export { StatusBadge, statusBadgeVariants };
