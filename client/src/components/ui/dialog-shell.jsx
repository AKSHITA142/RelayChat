import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function DialogShell({ children, open, onOpenChange }) {
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="fixed inset-0 bg-background/70 backdrop-blur-md" 
        onClick={() => onOpenChange?.(false)}
      />
      {children}
    </div>
  );
}

export function DialogShellTrigger({ children, asChild }) {
  return children;
}

export function DialogShellClose({ children, className, onClick }) {
  return (
    <button 
      type="button" 
      className={className} 
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function DialogShellContent({ children, className }) {
  return (
    <div className={cn(
      "relative z-50 w-full max-w-2xl mx-auto p-6 surface-panel rounded-2xl shadow-2xl",
      className
    )}>
      {children}
    </div>
  );
}

export function DialogShellHeader({ children, className }) {
  return (
    <div className={cn("flex flex-col space-y-2 mb-4", className)}>
      {children}
    </div>
  );
}

export function DialogShellFooter({ children, className }) {
  return (
    <div className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end mt-4", className)}>
      {children}
    </div>
  );
}

export function DialogShellTitle({ children, className }) {
  return (
    <h2 className={cn("text-xl font-bold text-foreground", className)}>
      {children}
    </h2>
  );
}

export function DialogShellDescription({ children, className }) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)}>
      {children}
    </p>
  );
}

export function DialogClose({ children, onClose, className }) {
  return (
    <button 
      type="button"
      onClick={onClose}
      className={cn(
        "absolute right-4 top-4 rounded-xl border border-white/10 bg-white/6 p-1.5 text-muted-foreground transition-colors hover:text-foreground",
        className
      )}
    >
      <X size={16} />
      <span className="sr-only">Close</span>
    </button>
  );
}
