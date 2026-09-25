"use client";

import { useState } from "react";
import { AlertTriangle, Check, Copy, RefreshCw, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { describeThrown, flattenFieldErrors, type ApiErrorInfo } from "@/lib/apiError";

type ErrorNoticeProps = {
  /** An ApiError, a plain Error, or an already-built ApiErrorInfo. Null renders nothing. */
  error: unknown;
  /** Shown when the error carries no message of its own. */
  fallbackTitle?: string;
  /** Rendered as a "Try again" button when the failure is worth retrying. */
  onRetry?: () => void;
  className?: string;
};

function toInfo(error: unknown, fallbackTitle?: string): ApiErrorInfo | null {
  if (!error) return null;
  if (typeof error === "object" && error !== null && "title" in error && "fields" in error) {
    return error as ApiErrorInfo;
  }
  return describeThrown(error, fallbackTitle);
}

/** Retrying only helps when the failure was about reaching the server, not about the data. */
const RETRYABLE = new Set([0, 429, 500, 502, 503, 504]);

/** Turn `estimated_closing_amount` into `Estimated closing amount`. */
function humanizeField(name: string): string {
  const spaced = name.replace(/[._]/g, " ").replace(/\bid\b/gi, "").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * The single way an API failure is shown to a user.
 *
 * It answers three questions in order: what went wrong, which fields to fix, and what to
 * do next — including a reference code that ties the screen to one line in the server log,
 * so "it says an error" can become "it says ERR-4K2P9XQZ" without a reproduction.
 */
export function ErrorNotice({ error, fallbackTitle, onRetry, className }: ErrorNoticeProps) {
  const [copied, setCopied] = useState(false);
  const info = toInfo(error, fallbackTitle);

  if (!info) return null;

  const fieldEntries = Object.entries(info.fields ?? {});
  const hasFields = fieldEntries.length > 0;
  // With field errors listed below, repeating the first one as the headline reads as a stutter.
  const showTitleSeparately = !hasFields || flattenFieldErrors(info.fields)[0] !== info.title;
  const canRetry = Boolean(onRetry) && RETRYABLE.has(info.status);
  const Icon = info.isOffline ? WifiOff : AlertTriangle;

  const copyReference = async () => {
    if (!info.reference) return;
    try {
      await navigator.clipboard.writeText(info.reference);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be refused; the code is on screen to read either way.
    }
  };

  return (
    <div
      role="alert"
      className={cn(
        "rounded-lg border border-[var(--status-danger)]/30 bg-[var(--status-danger-soft)] px-4 py-3",
        className
      )}
    >
      <div className="flex gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--status-danger)]" />
        <div className="min-w-0 flex-1 space-y-2">
          {showTitleSeparately && (
            <p className="text-sm font-medium text-[var(--status-danger)]">{info.title}</p>
          )}

          {hasFields && (
            <ul className="space-y-1 text-sm text-foreground/90">
              {fieldEntries.map(([field, messages]) => (
                <li key={field} className="flex flex-wrap gap-x-1.5">
                  <span className="font-medium">{humanizeField(field)}:</span>
                  <span className="text-muted-foreground">{messages.join(" ")}</span>
                </li>
              ))}
            </ul>
          )}

          {info.detail && <p className="text-xs text-muted-foreground">{info.detail}</p>}

          {(info.reference || canRetry) && (
            <div className="flex flex-wrap items-center gap-3 pt-0.5">
              {info.reference && (
                <button
                  type="button"
                  onClick={copyReference}
                  className="inline-flex items-center gap-1.5 rounded border border-border bg-card px-2 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                  title="Copy this code and send it to your administrator"
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {info.reference}
                </button>
              )}
              {canRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--status-danger)] hover:underline"
                >
                  <RefreshCw className="h-3 w-3" />
                  Try again
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
