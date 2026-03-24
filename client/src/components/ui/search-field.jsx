import * as React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const SearchField = React.forwardRef(
  // eslint-disable-next-line no-unused-vars
  ({ className, inputClassName, trailing, icon: Icon = Search, ...props }, ref) => (
    <div className={cn("relative", className)}>
      <Icon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input ref={ref} icon={undefined} className={cn("pl-10", trailing ? "pr-12" : "", inputClassName)} {...props} />
      {trailing ? (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">{trailing}</div>
      ) : null}
    </div>
  )
);

SearchField.displayName = "SearchField";

export { SearchField };
