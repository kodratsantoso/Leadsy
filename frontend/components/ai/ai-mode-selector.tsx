"use client";

import { Bot, Sparkles, Users, Wrench } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type AiMode = "full_ai" | "hybrid" | "manual";

type Props = {
  value: AiMode;
  onChange: (mode: AiMode) => void;
  className?: string;
  layout?: "compact" | "grid";
  hideLabel?: boolean;
};

const modes: {
  key: AiMode;
  label: string;
  desc: string;
  icon: typeof Bot;
  variant: "brand" | "info" | "warning";
}[] = [
  {
    key: "full_ai",
    label: "Full AI",
    desc: "AI parses reference, generates company profile, and auto-scores leads",
    icon: Sparkles,
    variant: "brand",
  },
  {
    key: "hybrid",
    label: "Hybrid",
    desc: "Partial AI enrichment with manual review for critical fields",
    icon: Users,
    variant: "info",
  },
  {
    key: "manual",
    label: "Manual",
    desc: "Rule-based scoring only, no AI processing applied",
    icon: Wrench,
    variant: "warning",
  },
];

export function AiModeSelector({ value, onChange, className, layout = "compact", hideLabel = false }: Props) {
  const activeMode = modes.find((m) => m.key === value) ?? modes[0];

  if (layout === "compact") {
    return (
      <div className={cn("space-y-2", className)}>
        {!hideLabel && (
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
            AI Intelligence Mode
          </span>
        )}

        {/* 3-way Segmented Control */}
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted/60 p-1 border border-border/40">
          {modes.map((mode) => {
            const active = value === mode.key;
            const Icon = mode.icon;
            return (
              <button
                key={mode.key}
                type="button"
                onClick={() => onChange(mode.key)}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-lg py-1.5 px-2 text-xs font-semibold transition-all cursor-pointer select-none",
                  active
                    ? "bg-card text-foreground shadow-xs border border-border/80"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                )}
              >
                <Icon className={cn("h-3.5 w-3.5 shrink-0", active ? "text-[color:var(--brand)]" : "")} />
                <span className="truncate">{mode.label}</span>
              </button>
            );
          })}
        </div>

        {/* Selected Mode Detail Callout */}
        <div className="rounded-xl border border-border/80 bg-card p-2.5 shadow-2xs space-y-1 animate-in fade-in duration-200">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <activeMode.icon className="h-3.5 w-3.5 text-[color:var(--brand)]" />
              {activeMode.label}
            </span>
            <Badge variant={activeMode.variant} className="text-[10px] px-2 py-0.5 font-semibold">
              Active
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {activeMode.desc}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {!hideLabel && (
        <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground block">
          AI Mode
        </label>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        {modes.map((mode) => {
          const active = value === mode.key;
          const Icon = mode.icon;
          return (
            <button
              key={mode.key}
              type="button"
              onClick={() => onChange(mode.key)}
              className={cn(
                "group flex flex-col justify-between rounded-2xl border p-4 text-left transition-all",
                active
                  ? "border-[color:var(--brand)] bg-[color:var(--surface-subtle)] shadow-[0_0_0:1px_color-mix(in_oklch,var(--brand)_35%,transparent)]"
                  : "border-border bg-card hover:bg-accent/20 hover:border-[color:var(--brand)]/20"
              )}
            >
              <div className="flex w-full items-start justify-between gap-2">
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                    active ? "bg-card shadow-xs" : "bg-muted"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      active ? "text-[color:var(--brand)]" : "text-muted-foreground"
                    )}
                  />
                </div>
                <Badge variant={mode.variant} className="px-2 py-0.5 text-[10px] font-semibold shrink-0">
                  {mode.label}
                </Badge>
              </div>

              <div className="mt-3 space-y-1">
                <h3
                  className={cn(
                    "text-sm font-semibold tracking-tight",
                    active ? "text-foreground" : "text-foreground/90"
                  )}
                >
                  {mode.label}
                </h3>
                <p className="text-xs leading-relaxed text-muted-foreground line-clamp-3">
                  {mode.desc}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
