"use client";

import * as React from "react";
import { AlertTriangle, Info, Trash2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "default" | "success";
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmButtonRef = React.useRef<HTMLButtonElement>(null);

  const handleClose = React.useCallback(() => {
    if (isLoading) return;
    onOpenChange(false);
    if (onCancel) onCancel();
  }, [isLoading, onOpenChange, onCancel]);

  React.useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, isLoading, handleClose]);

  const handleConfirm = async () => {
    try {
      await onConfirm();
    } finally {
      // The parent component controls onOpenChange(false) or keeping it open
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case "danger":
        return {
          icon: Trash2,
          iconBg: "bg-destructive/10 text-destructive border-destructive/20",
          confirmButtonVariant: "destructive" as const,
        };
      case "warning":
        return {
          icon: AlertTriangle,
          iconBg: "bg-amber-500/10 text-amber-500 border-amber-500/20",
          confirmButtonVariant: "default" as const,
        };
      case "success":
        return {
          icon: CheckCircle2,
          iconBg: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
          confirmButtonVariant: "default" as const,
        };
      case "default":
      default:
        return {
          icon: Info,
          iconBg: "bg-primary/10 text-primary border-primary/20",
          confirmButtonVariant: "default" as const,
        };
    }
  };

  const { icon: Icon, iconBg, confirmButtonVariant } = getVariantStyles();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm transition-all"
    >
      <div
        className="fixed inset-0"
        onClick={handleClose}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-2xl transition-all animate-in fade-in-0 zoom-in-95">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-xl border shadow-xs",
              iconBg
            )}
          >
            <Icon className="size-5" />
          </div>
          <div className="flex-1 space-y-1.5 pt-0.5">
            <h3
              id="confirm-dialog-title"
              className="text-base font-semibold leading-tight text-foreground tracking-tight"
            >
              {title}
            </h3>
            <div
              id="confirm-dialog-description"
              className="text-xs leading-relaxed text-muted-foreground"
            >
              {description}
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isLoading}
            onClick={handleClose}
          >
            {cancelLabel}
          </Button>
          <Button
            ref={confirmButtonRef}
            type="button"
            variant={confirmButtonVariant}
            size="sm"
            disabled={isLoading}
            onClick={handleConfirm}
            className={variant === "warning" ? "bg-amber-600 hover:bg-amber-700 text-white" : undefined}
          >
            {isLoading ? (
              <span className="flex items-center gap-1.5">
                <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                <span>Processing...</span>
              </span>
            ) : (
              confirmLabel
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
