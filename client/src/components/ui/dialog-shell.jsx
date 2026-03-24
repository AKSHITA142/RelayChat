import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const DialogShell = DialogPrimitive.Root;
const DialogShellTrigger = DialogPrimitive.Trigger;
const DialogShellClose = DialogPrimitive.Close;
const DialogShellPortal = DialogPrimitive.Portal;

const DialogShellOverlay = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm",
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));

DialogShellOverlay.displayName = "DialogShellOverlay";

const DialogShellContent = React.forwardRef(
  ({ className, children, hideClose = false, ...props }, ref) => (
    <DialogShellPortal>
      <DialogShellOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4",
          "rounded-2xl border border-border/70 bg-card/95 p-6 shadow-2xl backdrop-blur-xl",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          className
        )}
        {...props}
      >
        {children}
        {hideClose ? null : (
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogShellPortal>
  )
);

DialogShellContent.displayName = "DialogShellContent";

const DialogShellHeader = ({ className, ...props }) => (
  <div className={cn("flex flex-col space-y-1.5 text-left", className)} {...props} />
);

const DialogShellFooter = ({ className, ...props }) => (
  <div className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />
);

const DialogShellTitle = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn("text-lg font-semibold text-foreground", className)} {...props} />
));

DialogShellTitle.displayName = "DialogShellTitle";

const DialogShellDescription = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm leading-relaxed text-muted-foreground", className)}
    {...props}
  />
));

DialogShellDescription.displayName = "DialogShellDescription";

export {
  DialogShell,
  DialogShellTrigger,
  DialogShellClose,
  DialogShellContent,
  DialogShellHeader,
  DialogShellFooter,
  DialogShellTitle,
  DialogShellDescription,
};
