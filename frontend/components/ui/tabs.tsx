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
    <div className="inline-flex max-w-full items-center gap-1.5 overflow-x-auto rounded-2xl border border-border bg-[color:var(--surface-subtle)] p-1 scroll-smooth">
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.key === value;
        return (
          <button
            key={item.key}
            type="button"
            onClick={(e) => {
              onValueChange(item.key);
              e.currentTarget.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
            }}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200",
              active
                ? "bg-card text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-card/50"
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
