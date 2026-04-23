import { cn } from "@/lib/utils";

type TabItem<T extends string> = {
  key: T;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
};

type TabsProps<T extends string> = {
  value: T;
  onValueChange: (value: T) => void;
  items: TabItem<T>[];
};

function Tabs<T extends string>({ value, onValueChange, items }: TabsProps<T>) {
  return (
    <div className="inline-flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-[color:var(--surface-subtle)] p-1">
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.key === value;
        return (
          <button
            key={item.key}
            onClick={() => onValueChange(item.key)}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {Icon ? <Icon className="h-4 w-4" /> : null}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export { Tabs };
