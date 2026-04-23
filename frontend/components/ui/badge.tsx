import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium",
  {
    variants: {
      variant: {
        neutral: "border-border bg-muted text-muted-foreground",
        brand: "border-[color:var(--brand)]/20 bg-[color:var(--brand)]/10 text-[color:var(--brand)]",
        success: "border-[color:var(--success)]/20 bg-[color:var(--success-soft)] text-[color:var(--success)]",
        warning: "border-[color:var(--warning)]/20 bg-[color:var(--warning-soft)] text-[color:var(--warning)]",
        danger: "border-[color:var(--danger)]/20 bg-[color:var(--danger-soft)] text-[color:var(--danger)]",
        info: "border-[color:var(--info)]/20 bg-[color:var(--info-soft)] text-[color:var(--info)]",
        outline: "border-border bg-background text-foreground",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
);

function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}

export { Badge, badgeVariants };
