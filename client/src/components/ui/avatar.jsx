import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const avatarVariants = cva(
  "relative inline-flex shrink-0 items-center justify-center overflow-hidden border border-white/10 bg-gradient-to-br from-primary/18 via-card to-secondary/10 text-foreground shadow-[0_18px_44px_-28px_rgba(2,8,23,0.85)]",
  {
    variants: {
      size: {
        xs: "h-8 w-8 text-[10px]",
        sm: "h-10 w-10 text-xs",
        md: "h-12 w-12 text-sm",
        lg: "h-14 w-14 text-base",
        xl: "h-20 w-20 text-2xl",
      },
      shape: {
        circle: "rounded-full",
        rounded: "rounded-2xl",
      },
    },
    defaultVariants: {
      size: "md",
      shape: "circle",
    },
  }
);

const Avatar = React.forwardRef(
  ({ src, alt = "", fallback, size, shape, className, imageClassName, ...props }, ref) => {
    const derivedFallback = fallback || alt?.trim()?.[0]?.toUpperCase() || "?";

    return (
      <div ref={ref} className={cn(avatarVariants({ size, shape }), className)} {...props}>
        {src ? (
          <img src={src} alt={alt} className={cn("h-full w-full object-cover", imageClassName)} />
        ) : (
          <span className="font-semibold uppercase tracking-tight text-foreground/95">{derivedFallback}</span>
        )}
      </div>
    );
  }
);

Avatar.displayName = "Avatar";

// eslint-disable-next-line react-refresh/only-export-components
export { Avatar, avatarVariants };
