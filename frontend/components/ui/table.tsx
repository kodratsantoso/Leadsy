import * as React from "react";
import {
  ArrowDown,
  ArrowDown01,
  ArrowDownAZ,
  ArrowUpDown,
  ArrowUp,
  ArrowUp10,
  ArrowUpZA,
} from "lucide-react";

import { cn } from "@/lib/utils";

function TableShell({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("overflow-hidden rounded-2xl border border-border bg-card shadow-xs", className)} {...props}>
      <div className="overflow-x-auto">
        {children}
      </div>
    </div>
  );
}

function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return <table className={cn("min-w-full text-sm", className)} {...props} />;
}

function TableHead({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("bg-[color:var(--surface-subtle)] text-left text-xs text-muted-foreground", className)} {...props} />;
}

function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("divide-y divide-border/70", className)} {...props} />;
}

function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("transition-colors hover:bg-accent/30", className)} {...props} />;
}

function TableHeaderCell({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn("px-5 py-3 font-medium", className)} {...props} />;
}

export type SortDirection = "asc" | "desc" | null;
export type SortType = "alphabet" | "number" | "date" | "status" | "default";

export interface SortableHeaderCellProps
  extends Omit<React.ThHTMLAttributes<HTMLTableCellElement>, "children"> {
  columnKey: string;
  currentSortKey?: string | null;
  currentSortDir?: SortDirection;
  sortType?: SortType;
  onSort?: (columnKey: string, nextDir: SortDirection) => void;
  align?: "left" | "center" | "right";
  children: React.ReactNode;
  hint?: string;
}

function SortableHeaderCell({
  columnKey,
  currentSortKey,
  currentSortDir,
  sortType = "default",
  onSort,
  align = "left",
  className,
  children,
  hint,
  ...props
}: SortableHeaderCellProps) {
  const isActive = currentSortKey === columnKey && Boolean(currentSortDir);

  const getNextDirection = (): SortDirection => {
    if (!isActive) {
      // Numerical or date columns typically start with descending (highest / newest first)
      if (sortType === "number" || sortType === "date") {
        return "desc";
      }
      return "asc";
    }
    if (currentSortDir === "asc") {
      return "desc";
    }
    // Return null to cycle back to default/unsorted
    return null;
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onSort) {
      onSort(columnKey, getNextDirection());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (onSort) {
        onSort(columnKey, getNextDirection());
      }
    }
  };

  const renderSortIcon = () => {
    if (!isActive) {
      return <ArrowUpDown className="h-3.5 w-3.5 opacity-30 group-hover:opacity-80 transition-opacity shrink-0" />;
    }

    if (sortType === "alphabet") {
      return currentSortDir === "asc" ? (
        <ArrowDownAZ className="h-3.5 w-3.5 text-brand shrink-0" />
      ) : (
        <ArrowUpZA className="h-3.5 w-3.5 text-brand shrink-0" />
      );
    }

    if (sortType === "number") {
      return currentSortDir === "asc" ? (
        <ArrowDown01 className="h-3.5 w-3.5 text-brand shrink-0" />
      ) : (
        <ArrowUp10 className="h-3.5 w-3.5 text-brand shrink-0" />
      );
    }

    if (sortType === "date") {
      return currentSortDir === "asc" ? (
        <ArrowUp className="h-3.5 w-3.5 text-brand shrink-0" />
      ) : (
        <ArrowDown className="h-3.5 w-3.5 text-brand shrink-0" />
      );
    }

    return currentSortDir === "asc" ? (
      <ArrowUp className="h-3.5 w-3.5 text-brand shrink-0" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-brand shrink-0" />
    );
  };

  const getSortBadge = () => {
    if (!isActive) return null;

    if (sortType === "alphabet") {
      return currentSortDir === "asc" ? "A → Z" : "Z → A";
    }
    if (sortType === "number") {
      return currentSortDir === "asc" ? "0 → 9" : "9 → 0";
    }
    if (sortType === "date") {
      return currentSortDir === "asc" ? "Lama" : "Baru";
    }
    return currentSortDir === "asc" ? "Asc" : "Desc";
  };

  const getTooltip = () => {
    if (hint) return hint;
    if (!isActive) {
      if (sortType === "alphabet") return "Klik untuk urutkan A ke Z";
      if (sortType === "number") return "Klik untuk urutkan nilai tertinggi";
      if (sortType === "date") return "Klik untuk urutkan tanggal terbaru";
      return "Klik untuk mengurutkan kolom";
    }
    if (currentSortDir === "asc") {
      if (sortType === "alphabet") return "Saat ini: A → Z. Klik untuk urutkan Z → A";
      if (sortType === "number") return "Saat ini: Terendah → Tertinggi. Klik untuk Tertinggi → Terendah";
      return "Saat ini urut naik. Klik untuk urut turun.";
    }
    return "Saat ini urut turun. Klik untuk mereset urutan.";
  };

  return (
    <th
      className={cn(
        "px-5 py-3 font-medium",
        align === "center" && "text-center",
        align === "right" && "text-right",
        className
      )}
      {...props}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        title={getTooltip()}
        className={cn(
          "group inline-flex items-center gap-1.5 cursor-pointer select-none py-1 px-1.5 -mx-1.5 rounded-lg transition-all",
          "hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand",
          isActive ? "text-foreground font-semibold" : "text-muted-foreground",
          align === "center" && "justify-center w-full",
          align === "right" && "justify-end w-full"
        )}
      >
        <span>{children}</span>
        <span
          className={cn(
            "inline-flex items-center gap-1 transition-colors",
            isActive ? "text-brand" : "text-muted-foreground/40 group-hover:text-muted-foreground"
          )}
        >
          {renderSortIcon()}
          {isActive && (
            <span className="text-[9px] font-semibold tracking-wider px-1 py-0.2 rounded bg-brand/15 text-brand border border-brand/20">
              {getSortBadge()}
            </span>
          )}
        </span>
      </div>
    </th>
  );
}

function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-5 py-3 align-middle", className)} {...props} />;
}

function TableEmpty({
  colSpan,
  children,
}: {
  colSpan: number;
  children: React.ReactNode;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-16 text-center text-sm text-muted-foreground">
        {children}
      </td>
    </tr>
  );
}

/**
 * Universal client-side sort helper supporting alphabetical, numerical,
 * timestamp, and status-based collections.
 */
export function sortTableData<T>(
  data: T[],
  sortKey: string | null,
  sortDir: SortDirection,
  sortType: SortType = "default",
  customAccessor?: (item: T) => any
): T[] {
  if (!sortKey || !sortDir) return data;

  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

  return [...data].sort((a, b) => {
    const valA = customAccessor ? customAccessor(a) : (a as any)[sortKey];
    const valB = customAccessor ? customAccessor(b) : (b as any)[sortKey];

    // Push null / undefined / empty string to the bottom regardless of direction
    if (valA === null || valA === undefined || valA === "") return 1;
    if (valB === null || valB === undefined || valB === "") return -1;

    let comparison = 0;

    if (sortType === "alphabet") {
      comparison = collator.compare(String(valA), String(valB));
    } else if (sortType === "number") {
      const numA = typeof valA === "number" ? valA : parseFloat(String(valA).replace(/[^0-9.-]/g, "")) || 0;
      const numB = typeof valB === "number" ? valB : parseFloat(String(valB).replace(/[^0-9.-]/g, "")) || 0;
      comparison = numA - numB;
    } else if (sortType === "date") {
      const dateA = new Date(valA).getTime() || 0;
      const dateB = new Date(valB).getTime() || 0;
      comparison = dateA - dateB;
    } else {
      if (typeof valA === "number" && typeof valB === "number") {
        comparison = valA - valB;
      } else {
        comparison = collator.compare(String(valA), String(valB));
      }
    }

    return sortDir === "asc" ? comparison : -comparison;
  });
}

export { TableLoading } from "@/components/ui/loading";

export {
  TableShell,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  SortableHeaderCell,
  TableCell,
  TableEmpty,
};
