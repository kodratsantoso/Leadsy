import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon?: ComponentType<{ className?: string }>;
  title: ReactNode;
  description?: ReactNode;
  /** Usually a single primary Button. */
  action?: ReactNode;
  /** "card" sits on its own surface; "inline" drops the border for use inside one. */
  variant?: "card" | "inline";
  className?: string;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = "card",
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 text-center",
        variant === "card" ? "rounded-2xl border border-dashed border-border bg-card py-16" : "py-10",
        className
      )}
    >
      {Icon && <Icon className="mb-4 h-10 w-10 text-muted-foreground/30" />}
      <p className="font-semibold text-balance">{title}</p>
      {description && <p className="mt-1 max-w-prose text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
