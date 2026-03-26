import * as React from "react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";

const UserListItem = React.forwardRef(
  (
    {
      className,
      title,
      subtitle,
      avatarSrc,
      avatarAlt,
      avatarFallback,
      avatarSize = "md",
      status,
      statusLabel,
      badge,
      rightContent,
      selected = false,
      interactive = false,
      onClick,
      ...props
    },
    ref
  ) => {
    const Component = onClick || interactive ? "button" : "div";

    return (
      <Component
        ref={ref}
        onClick={onClick}
        className={cn(
          "group/item flex w-full items-center gap-3 rounded-[24px] border border-white/5 px-3.5 py-3.5 text-left transition-all duration-300",
          (onClick || interactive) && "cursor-pointer hover:-translate-y-0.5 hover:border-primary/15 hover:bg-white/8",
          selected && "border-primary/25 bg-primary/12 shadow-[0_18px_42px_-26px_hsl(var(--primary)/0.55)]",
          className
        )}
        {...props}
      >
        <Avatar src={avatarSrc} alt={avatarAlt || title} fallback={avatarFallback} size={avatarSize} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-foreground">{title}</p>
            {badge}
          </div>
          {subtitle || status ? (
            <div className="mt-1 flex items-center gap-2">
              {subtitle ? <p className="truncate text-xs text-muted-foreground transition-colors group-hover/item:text-foreground/80">{subtitle}</p> : null}
              {status ? <StatusBadge status={status} label={statusLabel} /> : null}
            </div>
          ) : null}
        </div>

        {rightContent ? <div className="shrink-0">{rightContent}</div> : null}
      </Component>
    );
  }
);

UserListItem.displayName = "UserListItem";

export { UserListItem };
