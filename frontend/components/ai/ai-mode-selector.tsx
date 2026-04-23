"use client";

import { Bot, Sparkles, Users, Wrench } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type AiMode = "full_ai" | "hybrid" | "manual";

type Props = {
  value: AiMode;
  onChange: (mode: AiMode) => void;
  className?: string;
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

export function AiModeSelector({ value, onChange, className }: Props) {
  return (
    <div className={cn("space-y-3", className)}>
      <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        AI Mode
      </label>
      <div className="grid gap-3 md:grid-cols-3">
        {modes.map((mode) => {
          const active = value === mode.key;
          return (
            <button
              key={mode.key}
              onClick={() => onChange(mode.key)}
              className={cn(
                "group flex min-h-44 flex-col items-start rounded-3xl border px-4 py-4 text-left transition-all md:min-h-40",
                active
                  ? "border-[color:var(--brand)] bg-[color:var(--surface-subtle)] shadow-[0_0_0_1px_color-mix(in_oklch,var(--brand)_35%,transparent)]"
                  : "border-border bg-card hover:bg-accent/20 hover:border-[color:var(--brand)]/20",
              )}
            >
              <div className="flex w-full items-start justify-between gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
                    active ? "bg-card" : "bg-muted"
                  )}
                >
                  <mode.icon
                    className={cn(
                      "h-4.5 w-4.5",
                      active ? "text-[color:var(--brand)]" : "text-muted-foreground"
                    )}
                  />
                </div>
                <Badge variant={mode.variant} className="px-2.5 py-1 text-[11px] font-semibold">
                  {mode.label}
                </Badge>
              </div>

              <div className="mt-4 space-y-2">
                <h3
                  className={cn(
                    "text-base font-semibold tracking-tight",
                    active ? "text-foreground" : "text-foreground/90"
                  )}
                >
                  {mode.label}
                </h3>
                <p className="max-w-[22ch] text-sm leading-7 text-muted-foreground md:max-w-none md:leading-6">
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
