"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, Building2, BarChart3, ArrowUpRight, Zap, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PlatformAdminHeaderProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function PlatformAdminHeader({ onRefresh, isRefreshing }: PlatformAdminHeaderProps) {
  const pathname = usePathname();

  const tabs = [
    { href: "/admin/tenants", label: "Tenant Directory", icon: Building2 },
    { href: "/admin/metrics", label: "SaaS Telemetry & Health", icon: BarChart3 },
  ];

  return (
    <div className="relative mb-8 overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-r from-card via-card to-primary/5 p-6 shadow-xl backdrop-blur-xl">
      <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs uppercase tracking-wider text-primary font-bold">
                  SaaS Control Plane
                </span>
                <Badge variant="outline" className="border-primary/30 text-primary text-[10px] uppercase font-semibold">
                  <Zap className="mr-1 h-3 w-3 fill-primary" /> Multi-Tenant Superadmin
                </Badge>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Platform Administrator Panel
              </h1>
            </div>
          </div>
          <p className="max-w-2xl text-xs text-muted-foreground sm:text-sm">
            Isolated tenant orchestration, subscription plans, resource quota enforcement, and cross-organization telemetry.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="rounded-xl border-border hover:bg-accent"
            >
              <RefreshCw className={cn("mr-2 h-3.5 w-3.5", isRefreshing && "animate-spin text-primary")} />
              Sync Platform
            </Button>
          )}

          <Link href="/dashboard">
            <Button variant="default" size="sm" className="rounded-xl bg-primary text-primary-foreground shadow-md hover:bg-primary/90">
              <span>Customer Workspace</span>
              <ArrowUpRight className="ml-1.5 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="mt-6 flex border-b border-border/60">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                isActive
                  ? "border-primary text-primary font-semibold"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
