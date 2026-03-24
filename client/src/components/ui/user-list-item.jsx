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
          "flex w-full items-center gap-3 rounded-2xl border border-transparent px-3 py-3 text-left transition-all",
          (onClick || interactive) && "cursor-pointer hover:bg-accent/60",
          selected && "border-primary/20 bg-primary/10",
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
              {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
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
