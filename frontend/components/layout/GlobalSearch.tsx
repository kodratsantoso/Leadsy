"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Loader2, ArrowRight } from "lucide-react";
import { navItems } from "./app-shell";
import { apiFetch } from "@/lib/apiFetch";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { useAuthStore } from "@/store/useAuthStore";
import { canAccessPath } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

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
  const [mobileModalOpen, setMobileModalOpen] = useState(false);
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

  // Click outside to close desktop popover
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
        if (window.innerWidth < 640) {
          setMobileModalOpen((prev) => !prev);
        } else {
          setOpen((prev) => !prev);
          const input = containerRef.current?.querySelector("input");
          if (input) input.focus();
        }
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Filter static routes
  const staticResults = navItems
    .reduce<{ title: string; url: string; icon: any }[]>((acc, item) => {
      if (canAccessPath(item.href, user) && item.label.toLowerCase().includes(query.toLowerCase())) {
        acc.push({ title: item.label, url: item.href, icon: item.icon });
      }
      if (item.children) {
        item.children.forEach((child) => {
          if (canAccessPath(child.href, user) && child.label.toLowerCase().includes(query.toLowerCase())) {
            acc.push({ title: child.label, url: child.href, icon: child.icon });
          }
        });
      }
      return acc;
    }, [])
    .slice(0, 5);

  const hasStaticResults = query.length >= 2 && staticResults.length > 0;
  const hasRemoteResults = query.length >= 2 && remoteResults.length > 0;
  const showResults = open && query.length > 0;

  const handleNavigate = (url: string) => {
    router.push(url);
    setOpen(false);
    setMobileModalOpen(false);
    setQuery("");
  };

  const renderResultsList = () => (
    <Command.List className="overflow-y-auto p-2">
      {query.length < 2 ? (
        <div className="py-6 text-center text-sm text-muted-foreground">
          Ketik minimal 2 karakter untuk mencari leads, kontak, atau menu...
        </div>
      ) : (
        <>
          {loading && !hasRemoteResults && (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Mencari...
            </div>
          )}

          {!loading && !hasStaticResults && !hasRemoteResults && (
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              Tidak ada hasil untuk &ldquo;{query}&rdquo;.
            </Command.Empty>
          )}

          {hasStaticResults && (
            <Command.Group
              heading="Halaman & Pengaturan"
              className="mb-2 text-xs font-medium text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1"
            >
              <div className="mt-1 space-y-1">
                {staticResults.map((result) => (
                  <Command.Item
                    key={result.url}
                    value={result.url}
                    onSelect={() => handleNavigate(result.url)}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                  >
                    <result.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{result.title}</span>
                  </Command.Item>
                ))}
              </div>
            </Command.Group>
          )}

          {hasRemoteResults &&
            remoteResults.map((group, idx) => (
              <div key={group.group}>
                {hasStaticResults && idx === 0 && <div className="my-2 h-px bg-border" />}
                {idx > 0 && <div className="my-2 h-px bg-border" />}
                <Command.Group
                  heading={group.group}
                  className="mb-2 text-xs font-medium text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1"
                >
                  <div className="mt-1 space-y-1">
                    {group.items.map((item) => (
                      <Command.Item
                        key={item.id}
                        value={item.id}
                        onSelect={() => handleNavigate(item.url)}
                        className="flex cursor-pointer flex-col justify-center rounded-lg px-2.5 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                      >
                        <div className="flex w-full items-center justify-between gap-2">
                          <span className="truncate font-medium text-foreground">{item.title}</span>
                          <ArrowRight className="h-3 w-3 shrink-0 opacity-50" />
                        </div>
                        <span className="truncate text-xs text-muted-foreground">{item.subtitle}</span>
                      </Command.Item>
                    ))}
                  </div>
                </Command.Group>
              </div>
            ))}
        </>
      )}
    </Command.List>
  );

  return (
    <>
      {/* Mobile Compact Trigger (< sm) */}
      <div className="sm:hidden">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-lg"
          onClick={() => setMobileModalOpen(true)}
          aria-label="Cari di Leadsy"
        >
          <Search className="h-4 w-4" />
        </Button>

        <Modal
          open={mobileModalOpen}
          onOpenChange={setMobileModalOpen}
          title="Pencarian Cepat"
          description="Cari leads, kontak, industri, atau halaman pengaturan."
          size="md"
        >
          <Command shouldFilter={false} className="flex flex-col gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Command.Input
                autoFocus
                value={query}
                onValueChange={setQuery}
                placeholder="Ketik nama perusahaan, kontak, atau menu..."
                className="h-10 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="max-h-[55dvh] overflow-y-auto rounded-xl border border-border bg-popover">
              {renderResultsList()}
            </div>
          </Command>
        </Modal>
      </div>

      {/* Desktop & Tablet Inline Search (sm+) */}
      <div className="relative z-50 hidden sm:block" ref={containerRef}>
        <Command
          className="relative"
          shouldFilter={false}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === "Escape") {
              setOpen(false);
              const input = containerRef.current?.querySelector("input");
              if (input) input.blur();
            }
          }}
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Command.Input
              data-tour="global-search"
              value={query}
              onValueChange={setQuery}
              onFocus={() => setOpen(true)}
              placeholder="Search (Cmd+K)"
              className="h-9 w-48 rounded-lg border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring md:w-64"
            />
          </div>

          {showResults && (
            <div className="absolute left-0 top-full mt-2 flex max-h-[400px] w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
              {renderResultsList()}
            </div>
          )}
        </Command>
      </div>
    </>
  );
}
