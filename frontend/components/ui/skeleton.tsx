import * as React from "react";
import { cn } from "@/lib/utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  shimmer?: boolean;
}

export function Skeleton({ className, shimmer = true, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-md bg-muted/60 dark:bg-muted/40 relative overflow-hidden",
        shimmer ? "animate-pulse" : "",
        className
      )}
      {...props}
    />
  );
}
