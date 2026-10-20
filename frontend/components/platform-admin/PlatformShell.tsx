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
  Sparkles,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PlatformShellProps {
  children: ReactNode;
}

const navItems = [
  {
    href: "/admin/metrics",
    label: "Platform Overview",
    icon: Activity,
    badge: "Live",
  },
  {
    href: "/admin/tenants",
    label: "Tenants & Workspaces",
    icon: Building2,
  },
  {
    href: "/admin/plans",
    label: "Plans & Subscriptions",
    icon: CreditCard,
  },
  {
    href: "/admin/feature-flags",
    label: "Feature Flags & Modules",
    icon: Flag,
  },
  {
    href: "/admin/infrastructure",
    label: "Queues & Infrastructure",
    icon: Server,
  },
  {
    href: "/admin/ai-accounting",
    label: "AI Cost & Tokens",
    icon: Bot,
  },
  {
    href: "/admin/audit-logs",
    label: "Platform Audit Trail",
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
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Desktop & Mobile */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-800/80 bg-slate-900/95 backdrop-blur-xl transition-all duration-300 lg:static lg:z-auto",
          collapsed ? "w-20" : "w-72",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-800/80 px-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 text-white shadow-lg shadow-indigo-500/25">
              <Layers className="h-5 w-5" />
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                  Leadsy Control Plane
                  <span className="rounded-full bg-indigo-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-indigo-400 border border-indigo-500/20">
                    SaaS
                  </span>
                </span>
                <span className="text-[11px] text-slate-400">Platform Superadmin</span>
              </div>
            )}
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700/60 bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="flex lg:hidden h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Global Cluster Status Pill */}
        {!collapsed && (
          <div className="p-3">
            <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-950/20 px-3 py-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-300 font-medium">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                </span>
                <span>Cluster Healthy</span>
              </div>
              <span className="text-[10px] text-slate-400">K3s 3-Node</span>
            </div>
          </div>
        )}

        {/* Navigation Section */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-3">
          <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            {!collapsed ? "Platform Governance" : "•"}
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
                    ? "bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 shadow-sm"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200",
                  collapsed && "justify-center px-0"
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    isActive ? "text-indigo-400" : "text-slate-400 group-hover:text-slate-200"
                  )}
                />
                {!collapsed && (
                  <div className="flex flex-1 items-center justify-between">
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <span className="rounded-full bg-indigo-500/20 px-1.5 py-0.2 text-[9px] font-semibold text-indigo-300">
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Switch to Customer CRM Workspace */}
        <div className="border-t border-slate-800/80 p-3">
          <Link
            href="/dashboard"
            className={cn(
              "group flex items-center gap-2.5 rounded-xl border border-cyan-500/25 bg-cyan-950/20 px-3 py-2.5 text-xs font-semibold text-cyan-300 transition-all hover:bg-cyan-900/40 hover:border-cyan-500/40 shadow-sm",
              collapsed && "justify-center px-0"
            )}
            title={collapsed ? "Switch to Customer Workspace" : undefined}
          >
            <ExternalLink className="h-4 w-4 shrink-0 text-cyan-400" />
            {!collapsed && (
              <div className="flex flex-1 items-center justify-between">
                <span>Customer Workspace</span>
                <ArrowRight className="h-3 w-3 text-cyan-400/70 group-hover:translate-x-0.5 transition-transform" />
              </div>
            )}
          </Link>
        </div>

        {/* Superadmin Profile Footer */}
        <div className="border-t border-slate-800/80 p-3">
          <div
            className={cn(
              "flex items-center gap-3 rounded-xl bg-slate-800/40 p-2 text-xs",
              collapsed && "justify-center p-1"
            )}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
              {user?.name ? user.name.charAt(0).toUpperCase() : "S"}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-200">{user?.name || "Super Admin"}</p>
                <p className="truncate text-[10px] text-slate-400">{user?.email}</p>
              </div>
            )}
            {!collapsed && (
              <button
                onClick={() => logout()}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                title="Sign out of Platform Admin"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-800/80 bg-slate-900/80 px-4 sm:px-6 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="flex lg:hidden h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-800/60 text-slate-300"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
              <span>SaaS Platform Control Plane</span>
              <span>/</span>
              <span className="font-semibold text-slate-200 capitalize">
                {pathname.split("/")[2]?.replace("-", " ") || "Overview"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Telemetry Status Badges */}
            <div className="hidden md:flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-800/50 px-2.5 py-1 text-[11px] font-medium text-slate-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                PostgreSQL PV
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-800/50 px-2.5 py-1 text-[11px] font-medium text-slate-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Redis Workers
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-800/50 px-2.5 py-1 text-[11px] font-medium text-slate-300">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                AI Gateway
              </span>
            </div>

            <div className="h-4 w-px bg-slate-800 hidden sm:block" />

            <ThemeToggle />

            <Link href="/dashboard">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 rounded-lg border-slate-700 bg-slate-800/70 text-xs text-slate-200 hover:bg-slate-700 hover:text-white"
              >
                <span>Workspace</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto bg-slate-950/60 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
