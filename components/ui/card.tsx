import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export function Card({ interactive = false, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card shadow-sm",
        interactive && "card-interactive transition-all hover:shadow-md",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
