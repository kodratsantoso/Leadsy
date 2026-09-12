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
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  "5xl": "max-w-6xl",
  "7xl": "max-w-7xl",
  full: "max-w-[95vw]",
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8 backdrop-blur-sm">
      <div
        className="absolute inset-0"
        onClick={() => !preventClose && onOpenChange(false)}
        aria-hidden="true"
      />
      <div
        className={cn(
          "relative z-10 max-h-[90vh] w-full overflow-y-auto rounded-3xl border border-border bg-card shadow-2xl",
          sizeClasses[size]
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
            {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          </div>
          {!preventClose && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onOpenChange(false)}
              aria-label="Close modal"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer ? <div className="flex justify-end gap-2 border-t border-border px-6 py-4">{footer}</div> : null}
      </div>
    </div>
  );
}

export { Modal };
