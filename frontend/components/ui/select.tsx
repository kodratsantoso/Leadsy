import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const selectVariants = cva(
  "w-full appearance-none rounded-lg border border-input bg-background text-foreground shadow-xs outline-none transition focus-visible:border-[var(--brand)] focus-visible:ring-3 focus-visible:ring-[color:var(--brand)]/15 disabled:cursor-not-allowed disabled:opacity-60",
  {
    variants: {
      size: {
        default: "h-9 px-3 pr-8 text-sm",
        sm: "h-8 px-2.5 pr-7 text-xs",
        xs: "h-7 px-2 pr-6 text-xs",
        lg: "h-10 px-3.5 pr-9 text-sm",
        xl: "h-11 px-4 pr-10 text-base",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
);

type SelectProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> &
  VariantProps<typeof selectVariants> & {
    placeholder?: string;
    wrapperClassName?: string;
  };

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, wrapperClassName, size = "default", children, placeholder, ...props }, ref) => {
    const isWidthSpecified = className && /\b(w-|flex-1|min-w-|max-w-)/.test(className);

    return (
      <div className={cn("relative", isWidthSpecified ? "" : "w-full", wrapperClassName)}>
        <select
          ref={ref}
          className={cn(selectVariants({ size, className }))}
          {...props}
        >
          {placeholder ? <option value="">{placeholder}</option> : null}
          {children}
        </select>
        <ChevronDown
          className={cn(
            "pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground transition-colors",
            size === "sm" || size === "xs" ? "right-2.5 h-3.5 w-3.5" : "right-3 h-4 w-4"
          )}
        />
      </div>
    );
  }
);

Select.displayName = "Select";

export { Select, selectVariants };
