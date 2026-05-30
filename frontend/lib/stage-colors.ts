export const STAGE_COLORS = {
  brand:   { token: "var(--brand)",           label: "Indigo" },
  success: { token: "var(--status-success)",  label: "Green"  },
  warning: { token: "var(--status-warning)",  label: "Amber"  },
  danger:  { token: "var(--status-danger)",   label: "Red"    },
  info:    { token: "var(--status-info)",     label: "Blue"   },
  neutral: { token: "var(--muted-foreground)", label: "Gray"  },
} as const;

export type StageColorKey = keyof typeof STAGE_COLORS;

export function resolveStageColor(key?: string | null): string {
  if (!key) return "var(--brand)";
  if (key.startsWith("#") || key.startsWith("rgb") || key.startsWith("hsl")) {
    return key;
  }
  if (key in STAGE_COLORS) {
    return STAGE_COLORS[key as StageColorKey].token;
  }
  return "var(--brand)";
}

export function resolveStageLabel(key?: string | null): string {
  if (key && key in STAGE_COLORS) {
    return STAGE_COLORS[key as StageColorKey].label;
  }
  return "Indigo";
}
