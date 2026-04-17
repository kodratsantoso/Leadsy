"use client";

import { useState, useCallback, type ReactNode } from "react";
import { X, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";

type DrawerProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
};

export function LeadDrawer({ open, onClose, children, title }: DrawerProps) {
  const [expanded, setExpanded] = useState(false);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] lg:hidden"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full flex-col border-l border-border bg-card shadow-2xl transition-all duration-300",
          expanded ? "w-full lg:w-[55%]" : "w-full sm:w-[420px] lg:w-[380px]",
        )}
      >
        {/* Header */}
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
          <h3 className="text-xl font-semibold">{title ?? "Lead Detail"}</h3>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setExpanded(!expanded)}
              className="hidden rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground lg:block"
            >
              {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </>
  );
}
