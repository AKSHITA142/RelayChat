import * as React from "react";
import { cn } from "@/lib/utils";

const Card = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("rounded-xl border border-border bg-card/75 text-card-foreground shadow-glow backdrop-blur-xl", className)}
    {...props}
  />
));

Card.displayName = "Card";

export { Card };
