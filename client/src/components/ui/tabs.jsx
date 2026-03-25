import * as React from "react";
import { cn } from "@/lib/utils";

const TabsContext = React.createContext(null);

function Tabs({ value, defaultValue, onValueChange, className, children, ...props }) {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const currentValue = value !== undefined ? value : internalValue;

  const setValue = React.useCallback(
    (nextValue) => {
      if (value === undefined) {
        setInternalValue(nextValue);
      }
      onValueChange?.(nextValue);
    },
    [onValueChange, value]
  );

  return (
    <TabsContext.Provider value={{ value: currentValue, setValue }}>
      <div className={cn("w-full", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

function TabsList({ className, ...props }) {
  return (
    <div
      role="tablist"
      className={cn("inline-flex items-center gap-2 rounded-[22px] border border-white/10 bg-white/6 p-1.5 backdrop-blur-xl", className)}
      {...props}
    />
  );
}

function TabsTrigger({ value, className, children, ...props }) {
  const context = React.useContext(TabsContext);
  const isActive = context?.value === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      data-state={isActive ? "active" : "inactive"}
      onClick={() => context?.setValue(value)}
      className={cn(
        "interactive-btn inline-flex items-center justify-center rounded-2xl px-3.5 py-2 text-sm font-semibold transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isActive
          ? "bg-primary text-primary-foreground shadow-button"
          : "text-muted-foreground hover:bg-white/8 hover:text-foreground",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function TabsContent({ value, className, children, ...props }) {
  const context = React.useContext(TabsContext);

  if (context?.value !== value) return null;

  return (
    <div
      role="tabpanel"
      data-state="active"
      className={cn("outline-none", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
