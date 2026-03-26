import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef(({ className, type = "text", icon: Icon, ...props }, ref) => (
  <div className="relative">
    {Icon ? (
      <div className="pointer-events-none absolute left-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-xl border border-white/10 bg-white/6 text-muted-foreground">
        <Icon className="size-4" />
      </div>
    ) : null}
    <input
      type={type}
      className={cn(
        "flex h-12 w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_12px_30px_-22px_rgba(2,8,23,0.9)] backdrop-blur-xl transition-all file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground/90 focus-visible:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 disabled:cursor-not-allowed disabled:opacity-50",
        Icon ? "pl-14" : "",
        className
      )}
      ref={ref}
      {...props}
    />
  </div>
));

Input.displayName = "Input";

export { Input };
