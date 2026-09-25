"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Z_INDEX } from "@/lib/z-index";
import { describeThrown, flattenFieldErrors } from "@/lib/apiError";

type ToastTone = "success" | "error" | "info";

type Toast = {
  id: number;
  tone: ToastTone;
  title: string;
  detail?: string;
  reference?: string;
};

type ToastApi = {
  success: (title: string, detail?: string) => void;
  info: (title: string, detail?: string) => void;
  error: (title: string, detail?: string) => void;
  /** Show whatever was caught, already translated into a readable cause. */
  fromError: (error: unknown, fallbackTitle?: string) => void;
  dismiss: (id: number) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

/** Errors stay until dismissed; confirmations get out of the way on their own. */
const AUTO_DISMISS_MS: Record<ToastTone, number | null> = {
  success: 4000,
  info: 5000,
  error: null,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (tone: ToastTone, title: string, detail?: string, reference?: string) => {
      const id = nextId.current++;
      setToasts((current) => [...current.slice(-3), { id, tone, title, detail, reference }]);

      const ttl = AUTO_DISMISS_MS[tone];
      if (ttl) setTimeout(() => dismiss(id), ttl);
    },
    [dismiss]
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (title, detail) => push("success", title, detail),
      info: (title, detail) => push("info", title, detail),
      error: (title, detail) => push("error", title, detail),
      fromError: (error, fallbackTitle) => {
        const info = describeThrown(error, fallbackTitle ?? "Something went wrong.");
        const fieldMessages = flattenFieldErrors(info.fields);
        // A field error already says which input is wrong; the hint is more useful than
        // repeating the count, so only fall back to the field list when there is no hint.
        const detail = info.detail ?? (fieldMessages.length > 1 ? fieldMessages.join(" ") : undefined);
        push("error", info.title, detail, info.reference);
      },
      dismiss,
    }),
    [push, dismiss]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

/**
 * Notifications for work that finished after the user moved on.
 *
 * Use this for background outcomes — a save that completed, a delete that failed. An error
 * that belongs to a form the user is still looking at belongs in `<ErrorNotice />` next to
 * that form instead, where it stays visible while they fix it.
 */
export function useToast(): ToastApi {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside <ToastProvider> — it is mounted in app/providers.tsx.");
  }

  return context;
}

const TONE_STYLES: Record<ToastTone, { icon: typeof Info; accent: string }> = {
  success: { icon: CheckCircle2, accent: "var(--status-success)" },
  error: { icon: AlertTriangle, accent: "var(--status-danger)" },
  info: { icon: Info, accent: "var(--status-info)" },
};

function ToastViewport({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
      style={{ zIndex: Z_INDEX.toast }}
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const { icon: Icon, accent } = TONE_STYLES[toast.tone];

        return (
          <div
            key={toast.id}
            role={toast.tone === "error" ? "alert" : "status"}
            className={cn(
              "pointer-events-auto flex gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-lg",
              "animate-in slide-in-from-bottom-2 fade-in duration-200"
            )}
            style={{ borderLeftColor: accent, borderLeftWidth: 3 }}
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: accent }} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{toast.title}</p>
              {toast.detail && <p className="mt-0.5 text-xs text-muted-foreground">{toast.detail}</p>}
              {toast.reference && (
                <p className="mt-1 font-mono text-[11px] text-muted-foreground">{toast.reference}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
