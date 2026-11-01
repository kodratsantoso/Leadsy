import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const inputVariants = cva(
  "w-full rounded-lg border border-input bg-background text-foreground shadow-xs outline-none transition placeholder:text-muted-foreground focus-visible:border-[var(--brand)] focus-visible:ring-3 focus-visible:ring-[color:var(--brand)]/15 disabled:cursor-not-allowed disabled:opacity-60",
  {
    variants: {
      size: {
        default: "h-9 px-3 text-sm",
        sm: "h-8 px-2.5 text-xs",
        xs: "h-7 px-2 text-xs",
        lg: "h-10 px-3.5 text-sm",
        xl: "h-11 px-4 text-base",
      },
      hasIcon: {
        true: "pl-9",
        false: "",
      },
    },
    defaultVariants: {
      size: "default",
      hasIcon: false,
    },
  }
);

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> &
  VariantProps<typeof inputVariants>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, size, hasIcon, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(inputVariants({ size, hasIcon, className }))}
      {...props}
    />
  )
);

Input.displayName = "Input";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs outline-none transition placeholder:text-muted-foreground focus-visible:border-[var(--brand)] focus-visible:ring-3 focus-visible:ring-[color:var(--brand)]/15 disabled:cursor-not-allowed disabled:opacity-60 leading-relaxed",
      className
    )}
    {...props}
  />
));

Textarea.displayName = "Textarea";

export { Input, Textarea, inputVariants };
