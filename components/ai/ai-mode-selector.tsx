"use client";

import { Bot, Sparkles, Users, Wrench } from "lucide-react";
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
  color: string;
}[] = [
  {
    key: "full_ai",
    label: "Full AI",
    desc: "AI parses reference, generates company profile, and auto-scores leads",
    icon: Sparkles,
    color: "from-indigo-500 to-purple-600",
  },
  {
    key: "hybrid",
    label: "Hybrid",
    desc: "Partial AI enrichment with manual review for critical fields",
    icon: Users,
    color: "from-blue-500 to-cyan-600",
  },
  {
    key: "manual",
    label: "Manual",
    desc: "Rule-based scoring only, no AI processing applied",
    icon: Wrench,
    color: "from-amber-500 to-orange-600",
  },
];

export function AiModeSelector({ value, onChange, className }: Props) {
  return (
    <div className={cn("space-y-2", className)}>
      <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        AI Mode
      </label>
      <div className="grid gap-2 sm:grid-cols-3">
        {modes.map((mode) => {
          const active = value === mode.key;
          return (
            <button
              key={mode.key}
              onClick={() => onChange(mode.key)}
              className={cn(
                "group relative flex flex-col items-start rounded-xl border p-3.5 text-left transition-all",
                active
                  ? "border-indigo-500/50 bg-indigo-500/5 shadow-md shadow-indigo-500/10"
                  : "border-border bg-card hover:border-border/80 hover:bg-accent/20",
              )}
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-lg transition-all",
                    active
                      ? `bg-gradient-to-br ${mode.color} shadow-lg`
                      : "bg-muted",
                  )}
                >
                  <mode.icon className={cn("h-3.5 w-3.5", active ? "text-white" : "text-muted-foreground")} />
                </div>
                <span className={cn("text-xs font-semibold", active ? "text-foreground" : "text-muted-foreground")}>
                  {mode.label}
                </span>
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
                {mode.desc}
              </p>
              {/* Active indicator */}
              {active && (
                <div className={`absolute bottom-0 left-0 h-0.5 w-full rounded-b-xl bg-gradient-to-r ${mode.color}`} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
