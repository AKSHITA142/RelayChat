import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cva } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const SheetPanel = DialogPrimitive.Root;
const SheetPanelTrigger = DialogPrimitive.Trigger;
const SheetPanelClose = DialogPrimitive.Close;
const SheetPanelPortal = DialogPrimitive.Portal;

const SheetPanelOverlay = React.forwardRef(({ className, ...props }, ref) => (
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

SheetPanelOverlay.displayName = "SheetPanelOverlay";

const sheetPanelVariants = cva(
  "fixed z-50 flex flex-col gap-4 border border-border/70 bg-card/95 p-6 shadow-2xl backdrop-blur-xl transition ease-in-out",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom:
          "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full w-full max-w-md border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
        right:
          "inset-y-0 right-0 h-full w-full max-w-md border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
      },
    },
    defaultVariants: {
      side: "right",
    },
  }
);

const SheetPanelContent = React.forwardRef(({ side, className, children, hideClose = false, ...props }, ref) => (
  <SheetPanelPortal>
    <SheetPanelOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        sheetPanelVariants({ side }),
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
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
  </SheetPanelPortal>
));

SheetPanelContent.displayName = "SheetPanelContent";

const SheetPanelHeader = ({ className, ...props }) => (
  <div className={cn("flex flex-col space-y-1.5 text-left", className)} {...props} />
);

const SheetPanelFooter = ({ className, ...props }) => (
  <div className={cn("mt-auto flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />
);

const SheetPanelTitle = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn("text-lg font-semibold text-foreground", className)} {...props} />
));

SheetPanelTitle.displayName = "SheetPanelTitle";

const SheetPanelDescription = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm leading-relaxed text-muted-foreground", className)}
    {...props}
  />
));

SheetPanelDescription.displayName = "SheetPanelDescription";

export {
  SheetPanel,
  SheetPanelTrigger,
  SheetPanelClose,
  SheetPanelContent,
  SheetPanelHeader,
  SheetPanelFooter,
  SheetPanelTitle,
  SheetPanelDescription,
};
