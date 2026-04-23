import { cn } from "@/lib/utils";

export type BadgeVariant = "success" | "warning" | "danger" | "info" | "neutral" | "brand" | "brand-soft";

const BORDER_CLASS: Partial<Record<BadgeVariant, string>> = {
  success: "border border-[var(--status-success-border)]",
  warning: "border border-[var(--status-warning-border)]",
  danger:  "border border-[var(--status-danger-border)]",
};

interface BadgeProps {
  variant?: BadgeVariant;
  bordered?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function Badge({ variant = "neutral", bordered = false, className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
        `badge-${variant}`,
        bordered && BORDER_CLASS[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
