import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef(({ className, type = "text", icon: Icon, ...props }, ref) => (
  <div className="relative">
    {Icon ? (
      <Icon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    ) : null}
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-lg border border-input bg-card/70 px-3 py-2 text-sm text-foreground shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        Icon ? "pl-10" : "",
        className
      )}
      ref={ref}
      {...props}
    />
  </div>
));

Input.displayName = "Input";

export { Input };
