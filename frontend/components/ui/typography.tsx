import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Reusable Centralized Typography Primitives
 * Conforms to Section 9 of the Leadsy Centralized Typography System.
 */

export interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
  as?: React.ElementType;
}

export function DisplayHero({ as: Component = "h1", className, ...props }: TypographyProps) {
  return (
    <Component
      className={cn("text-display-hero text-foreground tracking-tight", className)}
      {...props}
    />
  );
}

export function DisplayLogin({ as: Component = "h1", className, ...props }: TypographyProps) {
  return (
    <Component
      className={cn("text-display-login text-foreground tracking-tight", className)}
      {...props}
    />
  );
}

export function PageTitle({ as: Component = "h1", className, ...props }: TypographyProps) {
  return (
    <Component
      className={cn("text-page-title text-foreground tracking-tight", className)}
      {...props}
    />
  );
}

export function SectionTitle({ as: Component = "h2", className, ...props }: TypographyProps) {
  return (
    <Component
      className={cn("text-section-title text-foreground tracking-tight", className)}
      {...props}
    />
  );
}

export function BrandEdition({ as: Component = "span", className, ...props }: TypographyProps) {
  return (
    <Component
      className={cn("text-brand-edition text-muted-foreground", className)}
      {...props}
    />
  );
}

export function CardHeading({ as: Component = "h3", className, ...props }: TypographyProps) {
  return (
    <Component
      className={cn("text-card-title text-foreground font-semibold", className)}
      {...props}
    />
  );
}

export function KpiValue({ as: Component = "div", className, ...props }: TypographyProps) {
  return (
    <Component
      className={cn("text-kpi-value text-foreground font-bold numeric-value", className)}
      {...props}
    />
  );
}

export function TechnicalText({ as: Component = "code", className, ...props }: TypographyProps) {
  return (
    <Component
      className={cn("text-technical text-muted-foreground font-mono", className)}
      {...props}
    />
  );
}

export function NumericValue({ as: Component = "span", className, ...props }: TypographyProps) {
  return (
    <Component
      className={cn("numeric-value font-medium", className)}
      {...props}
    />
  );
}
