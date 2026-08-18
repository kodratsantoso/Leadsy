"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Loader2, ArrowRight } from "lucide-react";
import { navItems, NavItem } from "./app-shell";
import { apiFetch } from "@/lib/apiFetch";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { useAuthStore } from "@/store/useAuthStore";
import { canAccessPath } from "@/lib/permissions";

type RemoteResultGroup = {
  group: string;
  items: Array<{
    id: string;
    title: string;
    subtitle: string;
    url: string;
  }>;
};

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [remoteResults, setRemoteResults] = useState<RemoteResultGroup[]>([]);
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce API search
  useEffect(() => {
    if (query.length < 2) {
      setRemoteResults([]);
      setLoading(false);
      return;
    }
    
    const delayDebounceFn = setTimeout(() => {
      setLoading(true);
      apiFetch(`/search?query=${encodeURIComponent(query)}`)
        .then((res) => res.json())
        .then((data) => {
          setRemoteResults(Array.isArray(data) ? data : []);
        })
        .catch(() => setRemoteResults([]))
        .finally(() => setLoading(false));
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  // Click outside to close
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);
  
  // Cmd+K shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Filter static routes
  const staticResults = navItems.reduce<{ title: string; url: string; icon: any }[]>((acc, item) => {
    // Check main item
    if (canAccessPath(item.href, user) && item.label.toLowerCase().includes(query.toLowerCase())) {
      acc.push({ title: item.label, url: item.href, icon: item.icon });
    }
    // Check children
    if (item.children) {
      item.children.forEach(child => {
        if (canAccessPath(child.href, user) && child.label.toLowerCase().includes(query.toLowerCase())) {
          acc.push({ title: child.label, url: child.href, icon: child.icon });
        }
      });
    }
    return acc;
  }, []).slice(0, 5); // Limit static results to 5

  const hasStaticResults = query.length >= 2 && staticResults.length > 0;
  const hasRemoteResults = query.length >= 2 && remoteResults.length > 0;
  const showResults = open && query.length > 0;

  return (
    <div className="relative z-50" ref={containerRef}>
      <Command 
        className="relative" 
        shouldFilter={false} // We handle filtering manually
        onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === "Escape") {
                setOpen(false);
                const input = containerRef.current?.querySelector('input');
                if (input) input.blur();
            }
        }}
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Command.Input
            data-tour="global-search"
            value={query}
            onValueChange={setQuery}
            onFocus={() => setOpen(true)}
            placeholder="Search (Cmd+K)"
            className="h-9 w-64 rounded-lg border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {showResults && (
          <div className="absolute top-full left-0 mt-2 w-[400px] rounded-md border border-border bg-popover shadow-lg overflow-hidden flex flex-col max-h-[400px]">
            <Command.List className="overflow-y-auto p-2">
              {query.length < 2 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Type at least 2 characters to search...
                </div>
              ) : (
                <>
                  {loading && !hasRemoteResults && (
                    <div className="flex items-center justify-center py-6 text-sm text-muted-foreground gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Searching...
                    </div>
                  )}

                  {!loading && !hasStaticResults && !hasRemoteResults && (
                    <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                      No results found for "{query}".
                    </Command.Empty>
                  )}

                  {hasStaticResults && (
                    <Command.Group heading="Pages & Settings" className="text-xs font-medium text-muted-foreground mb-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1">
                      <div className="mt-1 space-y-1">
                        {staticResults.map((result) => (
                          <Command.Item
                            key={result.url}
                            value={result.url}
                            onSelect={() => {
                              router.push(result.url);
                              setOpen(false);
                              setQuery("");
                            }}
                            className="flex items-center gap-2 rounded-sm px-2 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                          >
                            <result.icon className="h-4 w-4 text-muted-foreground" />
                            <span>{result.title}</span>
                          </Command.Item>
                        ))}
                      </div>
                    </Command.Group>
                  )}

                  {hasRemoteResults && remoteResults.map((group, idx) => (
                    <div key={group.group}>
                      {hasStaticResults && idx === 0 && <div className="h-px bg-border my-2" />}
                      {idx > 0 && <div className="h-px bg-border my-2" />}
                      <Command.Group heading={group.group} className="text-xs font-medium text-muted-foreground mb-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1">
                        <div className="mt-1 space-y-1">
                          {group.items.map((item) => (
                            <Command.Item
                              key={item.id}
                              value={item.id}
                              onSelect={() => {
                                router.push(item.url);
                                setOpen(false);
                                setQuery("");
                              }}
                              className="flex flex-col justify-center rounded-sm px-2 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                            >
                              <div className="flex items-center justify-between w-full">
                                <span className="font-medium text-foreground">{item.title}</span>
                                <ArrowRight className="h-3 w-3 opacity-50" />
                              </div>
                              <span className="text-xs text-muted-foreground">{item.subtitle}</span>
                            </Command.Item>
                          ))}
                        </div>
                      </Command.Group>
                    </div>
                  ))}
                </>
              )}
            </Command.List>
          </div>
        )}
      </Command>
    </div>
  );
}
