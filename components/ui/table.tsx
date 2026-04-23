import { cn } from "@/lib/utils";

export function TableWrapper({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("w-full overflow-x-auto rounded-xl border border-border bg-card shadow-sm", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function Table({ className, children, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <table className={cn("w-full text-sm", className)} {...props}>
      {children}
    </table>
  );
}

export function TableHead({ className, children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={cn("border-b border-border bg-muted/30", className)} {...props}>
      {children}
    </thead>
  );
}

interface TableHeaderCellProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  align?: "left" | "right" | "center";
}

export function TableHeaderCell({ align = "left", className, children, ...props }: TableHeaderCellProps) {
  return (
    <th
      className={cn(
        "h-10 px-4 text-xs font-medium uppercase tracking-wide text-muted-foreground",
        align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left",
        className
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function TableBody({ className, children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={cn("divide-y divide-border/50", className)} {...props}>
      {children}
    </tbody>
  );
}

export function TableRow({ className, children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn("border-b border-border transition-colors hover:bg-accent/20", className)}
      {...props}
    >
      {children}
    </tr>
  );
}

interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  muted?: boolean;
  align?: "left" | "right" | "center";
}

export function TableCell({ muted = false, align = "left", className, children, ...props }: TableCellProps) {
  return (
    <td
      className={cn(
        "px-4 py-3 align-middle text-sm",
        muted ? "text-muted-foreground" : "text-foreground",
        align === "right" ? "text-right" : align === "center" ? "text-center" : "",
        className
      )}
      {...props}
    >
      {children}
    </td>
  );
}
