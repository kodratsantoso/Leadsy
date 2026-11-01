"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  Activity,
  Layers,
  Building2,
  CreditCard,
  Flag,
  Server,
  Bot,
  ShieldCheck,
  ArrowRight,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  ExternalLink,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PlatformShellProps {
  children: ReactNode;
}

const navItems = [
  {
    href: "/admin/metrics",
    label: "Ikhtisar Platform",
    icon: Activity,
    badge: "Live",
  },
  {
    href: "/admin/tenants",
    label: "Tenant & Organisasi",
    icon: Building2,
  },
  {
    href: "/admin/plans",
    label: "Paket & Langganan",
    icon: CreditCard,
  },
  {
    href: "/admin/feature-flags",
    label: "Feature Flags & Modul",
    icon: Flag,
  },
  {
    href: "/admin/infrastructure",
    label: "Antrean & Infrastruktur",
    icon: Server,
  },
  {
    href: "/admin/ai-accounting",
    label: "Biaya AI & Token",
    icon: Bot,
  },
  {
    href: "/admin/audit-logs",
    label: "Jejak Audit Platform",
    icon: ShieldCheck,
  },
];

export function PlatformShell({ children }: PlatformShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground font-sans">
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Desktop & Mobile */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col h-full border-r border-sidebar-border bg-sidebar transition-all duration-300 lg:static lg:z-auto shrink-0",
          collapsed ? "w-20" : "w-72",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Brand Header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-sidebar-border px-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 text-white shadow-md shadow-indigo-500/20">
              <Layers className="h-5 w-5" />
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="text-sm font-bold tracking-tight text-sidebar-foreground flex items-center gap-1.5">
                  Leadsy Control Plane
                  <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary border border-primary/20">
                    SaaS
                  </span>
                </span>
                <span className="text-[11px] text-muted-foreground">Platform Superadmin</span>
              </div>
            )}
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex h-7 w-7 items-center justify-center rounded-lg border border-sidebar-border bg-sidebar-accent/50 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors cursor-pointer"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="flex lg:hidden h-8 w-8 items-center justify-center rounded-lg text-sidebar-foreground/70 hover:text-sidebar-foreground cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Global Cluster Status Pill */}
        {!collapsed && (
          <div className="p-3 shrink-0">
            <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                </span>
                <span>Cluster Healthy</span>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono">K3s 3-Node</span>
            </div>
          </div>
        )}

        {/* Navigation Section — ONLY this section scrolls if there are many items */}
        <nav className="flex-1 min-h-0 space-y-1.5 overflow-y-auto px-3 py-2">
          <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {!collapsed ? "Tata Kelola Platform" : "•"}
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition-all",
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/25 shadow-xs font-semibold"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                  collapsed && "justify-center px-0"
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    isActive ? "text-primary" : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground"
                  )}
                />
                {!collapsed && (
                  <div className="flex flex-1 items-center justify-between">
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <span className="rounded-full bg-primary/15 px-1.5 py-0.2 text-[9px] font-semibold text-primary">
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Pinned Bottom Actions & Profile — NEVER scrolls away */}
        <div className="shrink-0 mt-auto border-t border-sidebar-border p-3 space-y-2">
          {/* Switch to Customer Workspace */}
          <Link
            href="/dashboard"
            className={cn(
              "group flex items-center gap-2.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2.5 text-xs font-semibold text-cyan-700 dark:text-cyan-300 transition-all hover:bg-cyan-500/20 hover:border-cyan-500/50 shadow-xs",
              collapsed && "justify-center px-0"
            )}
            title={collapsed ? "Switch to Customer Workspace" : undefined}
          >
            <ExternalLink className="h-4 w-4 shrink-0 text-cyan-600 dark:text-cyan-400" />
            {!collapsed && (
              <div className="flex flex-1 items-center justify-between">
                <span>Customer Workspace</span>
                <ArrowRight className="h-3 w-3 text-cyan-600 dark:text-cyan-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
            )}
          </Link>

          {/* Superadmin Profile Footer */}
          <div
            className={cn(
              "flex items-center gap-3 rounded-xl border border-sidebar-border/60 bg-sidebar-accent/40 p-2 text-xs",
              collapsed && "justify-center p-1"
            )}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary font-bold border border-primary/25">
              {user?.name ? user.name.charAt(0).toUpperCase() : "S"}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-sidebar-foreground">{user?.name || "Super Admin"}</p>
                <p className="truncate text-[10px] text-muted-foreground">{user?.email}</p>
              </div>
            )}
            {!collapsed && (
              <button
                onClick={() => logout()}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                title="Sign out of Platform Admin"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/80 px-4 sm:px-6 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="flex lg:hidden h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
              <span>SaaS Platform Control Plane</span>
              <span>/</span>
              <span className="font-semibold text-foreground capitalize">
                {pathname.split("/")[2]?.replace("-", " ") || "Overview"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Telemetry Status Badges */}
            <div className="hidden md:flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                PostgreSQL PV
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Redis Workers
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
                AI Gateway
              </span>
            </div>

            <div className="h-4 w-px bg-border hidden sm:block" />

            <ThemeToggle />

            <Link href="/dashboard">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 rounded-lg border-border text-xs text-foreground hover:bg-accent"
              >
                <span>Workspace</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main className="flex-1 min-h-0 overflow-y-auto bg-muted/20 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
