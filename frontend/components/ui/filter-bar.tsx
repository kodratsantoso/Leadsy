import * as React from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function FilterBar({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-xs",
        className
      )}
      {...props}
    />
  );
}

function FilterBarSearch({
  className,
  size,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> & {
  size?: "default" | "sm" | "xs" | "lg" | "xl";
}) {
  return (
    <div className={cn("relative min-w-[240px] flex-1", className)}>
      <Search
        className={cn(
          "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground",
          size === "sm" || size === "xs" ? "h-3.5 w-3.5" : "h-4 w-4"
        )}
      />
      <Input hasIcon size={size} placeholder="Search..." {...props} />
    </div>
  );
}

export { FilterBar, FilterBarSearch };
