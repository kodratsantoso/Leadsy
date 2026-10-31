"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── SPINNER COMPONENT ── */

export interface SpinnerProps extends React.SVGAttributes<SVGSVGElement> {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  variant?: "brand" | "muted" | "white" | "current";
}

const SIZE_MAP = {
  xs: "h-3 w-3",
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-8 w-8",
  xl: "h-11 w-11",
};

const VARIANT_MAP = {
  brand: "text-brand",
  muted: "text-muted-foreground",
  white: "text-white",
  current: "text-current",
};

export function Spinner({
  size = "md",
  variant = "brand",
  className,
  ...props
}: SpinnerProps) {
  return (
    <svg
      className={cn("animate-spin shrink-0", SIZE_MAP[size], VARIANT_MAP[variant], className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
      {...props}
    >
      <circle
        className="opacity-20"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3.5"
      />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

/* ── UNIFIED LOADING STATE COMPONENT ── */

export interface LoadingStateProps {
  variant?: "section" | "card" | "inline" | "fullscreen" | "page" | "ai";
  size?: "sm" | "md" | "lg" | "xl";
  label?: string;
  description?: string;
  className?: string;
  icon?: React.ReactNode;
}

export function LoadingState({
  variant = "section",
  size = "md",
  label = "Memuat data...",
  description,
  className,
  icon,
}: LoadingStateProps) {
  // Inline Variant (e.g. inside header or compact card)
  if (variant === "inline") {
    return (
      <div className={cn("inline-flex items-center gap-2 text-xs text-muted-foreground", className)}>
        {icon || <Spinner size={size === "lg" || size === "xl" ? "md" : size} />}
        {label && <span className="font-medium">{label}</span>}
      </div>
    );
  }

  // Fullscreen / Page Variant
  if (variant === "fullscreen" || variant === "page") {
    const isFullScreen = variant === "fullscreen";
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center text-center p-6",
          isFullScreen
            ? "fixed inset-0 z-50 bg-background/85 backdrop-blur-md"
            : "min-h-[55vh] w-full",
          className
        )}
      >
        <div className="relative flex items-center justify-center mb-4">
          {/* Subtle breathing aura behind spinner */}
          <div className="absolute -inset-2 rounded-full bg-brand/15 blur-lg animate-pulse" />
          {icon || <Spinner size="xl" variant="brand" />}
        </div>

        {label && (
          <h3 className="text-base font-semibold text-foreground tracking-tight">
            {label}
          </h3>
        )}

        {description && (
          <p className="text-xs text-muted-foreground mt-1 max-w-sm leading-relaxed">
            {description}
          </p>
        )}
      </div>
    );
  }

  // AI-Themed Variant (Smart processes, Copilot, Profiling)
  if (variant === "ai") {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center py-10 px-6 rounded-xl border border-brand/20 bg-brand/5 text-center my-3",
          className
        )}
      >
        <div className="relative flex items-center justify-center mb-3">
          <div className="absolute -inset-3 rounded-full bg-brand/20 blur-md animate-pulse" />
          <div className="h-10 w-10 rounded-full bg-brand/15 text-brand flex items-center justify-center border border-brand/30 shadow-xs">
            {icon || <Sparkles className="h-5 w-5 animate-pulse" />}
          </div>
        </div>

        {label && (
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5 justify-center">
            {label}
          </h4>
        )}

        {description && (
          <p className="text-xs text-muted-foreground mt-1.5 max-w-md leading-relaxed">
            {description}
          </p>
        )}
      </div>
    );
  }

  // Card Variant
  if (variant === "card") {
    return (
      <div
        className={cn(
          "rounded-xl border border-border bg-card/60 p-8 flex flex-col items-center justify-center text-center shadow-xs",
          className
        )}
      >
        <div className="mb-3">{icon || <Spinner size={size} variant="brand" />}</div>
        {label && <p className="text-sm font-medium text-foreground">{label}</p>}
        {description && <p className="text-xs text-muted-foreground mt-1 max-w-xs">{description}</p>}
      </div>
    );
  }

  // Default: Section Variant
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-10 px-4 text-center text-muted-foreground",
        className
      )}
    >
      <div className="mb-2.5">{icon || <Spinner size={size} variant="brand" />}</div>
      {label && <p className="text-xs font-medium text-foreground">{label}</p>}
      {description && <p className="text-[11px] text-muted-foreground mt-0.5 max-w-sm">{description}</p>}
    </div>
  );
}

/* ── SHORTHAND EXPORTS ── */

export function PageLoader({
  label = "Memuat Halaman...",
  description = "Menyiapkan data dan konfigurasi terbaru",
  className,
}: {
  label?: string;
  description?: string;
  className?: string;
}) {
  return (
    <LoadingState
      variant="page"
      label={label}
      description={description}
      className={className}
    />
  );
}

export function TableLoading({
  colSpan,
  label = "Memuat data tabel...",
  className,
}: {
  colSpan: number;
  label?: string;
  className?: string;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className={cn("px-5 py-12 text-center", className)}>
        <LoadingState variant="section" size="md" label={label} />
      </td>
    </tr>
  );
}
