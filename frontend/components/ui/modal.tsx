import * as React from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  size?: "sm" | "md" | "lg" | "xl" | "5xl" | "7xl" | "full";
  footer?: React.ReactNode;
  children: React.ReactNode;
  /** Blocks backdrop click, header X, and Escape from closing — e.g. while a background job is still running. */
  preventClose?: boolean;
};

const sizeClasses = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
  "5xl": "sm:max-w-6xl",
  "7xl": "sm:max-w-7xl",
  full: "sm:max-w-[95vw]",
};

function Modal({
  open,
  onOpenChange,
  title,
  description,
  size = "md",
  footer,
  children,
  preventClose = false,
}: ModalProps) {
  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !preventClose) onOpenChange(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange, preventClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:px-4 sm:py-8">
      <div
        className="absolute inset-0"
        onClick={() => !preventClose && onOpenChange(false)}
        aria-hidden="true"
      />
      <div
        className={cn(
          "relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-border bg-card shadow-2xl sm:max-h-[90vh] sm:rounded-3xl",
          sizeClasses[size]
        )}
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-border sm:hidden" aria-hidden="true" />
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-4 sm:gap-4 sm:px-6 sm:py-5">
          <div className="min-w-0 space-y-1">
            <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{title}</h2>
            {description ? <p className="text-xs text-muted-foreground sm:text-sm">{description}</p> : null}
          </div>
          {!preventClose && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onOpenChange(false)}
              aria-label="Close modal"
              className="shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className={cn("min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5", !footer && "pb-safe")}>
          {children}
        </div>
        {footer ? (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border px-4 py-3 pb-safe sm:px-6 sm:py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export { Modal };
