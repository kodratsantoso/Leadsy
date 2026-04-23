"use client";
import { Globe, ArrowLeft, Server, Database, Loader2 } from "lucide-react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

export default function EnvironmentPage() {
  // Fetch APP_NAME and APP_ENV from public settings endpoint (no auth required)
  const { data: publicData, isLoading } = useQuery({
    queryKey: ["public-settings"],
    queryFn: async () => {
      const r = await fetch("/api/settings/public");
      const json = await r.json();
      return json?.data || {};
    },
  });

  const envItems = [
    { label: "App Name",       value: publicData?.APP_NAME ?? "Leadsy",  icon: Globe },
    { label: "Environment",    value: publicData?.APP_ENV ?? process.env.NODE_ENV ?? "—", icon: Server },
    { label: "API Base URL",   value: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001", icon: Database },
    { label: "Frontend Port",  value: "3000",  icon: Server,   note: "Config" },
    { label: "Backend Port",   value: "3001",  icon: Server,   note: "Config" },
    { label: "DB Port (Host)", value: "5435",  icon: Database, note: "Config" },
    { label: "Redis Port",     value: "6382",  icon: Database, note: "Config" },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Link href="/settings" className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Environment</h1>
          <p className="text-sm text-muted-foreground">Runtime environment overview</p>
        </div>
      </div>

      {isLoading ? (
        <div className="py-16 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {envItems.map((item) => (
            <div key={item.label} className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{item.label}</span>
                </div>
                {(item as any).note && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {(item as any).note}
                  </span>
                )}
              </div>
              <p className="text-sm font-mono font-medium break-all">{item.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
