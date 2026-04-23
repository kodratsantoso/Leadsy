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
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">) {
  return (
    <div className={cn("relative min-w-[240px] flex-1", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input hasIcon placeholder="Search..." {...props} />
    </div>
  );
}

export { FilterBar, FilterBarSearch };
