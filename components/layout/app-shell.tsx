"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Map, Building2, Package, Layers,
  FileText, MessageSquare, Settings,
  ChevronLeft, ChevronRight, Search, LogOut, ChevronDown
} from "lucide-react";
import { useState, useRef, useEffect, type ReactNode } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useTheme } from "@/lib/theme-context";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const navItems = [
  { href: "/",                icon: LayoutDashboard, label: "Dashboard" },
  { href: "/map",             icon: Map,             label: "Map & Territory" },
  { href: "/leads",           icon: Building2,       label: "Leads" },
  { href: "/products",        icon: Package,         label: "Products" },
  { href: "/industries",      icon: Layers,          label: "Industries" },
  { href: "/whatsapp",        icon: MessageSquare,   label: "WhatsApp" },
  { href: "/audit-logs",      icon: FileText,        label: "Audit Logs" },
  { href: "/settings",        icon: Settings,        label: "Settings" },
];

function ThemedLogo({ collapsed }: { collapsed: boolean }) {
  const { resolved } = useTheme();
  const src = resolved === "dark" ? "/Leadsy_logo_dark.png" : "/Leadsy_logo_light.png";

  if (collapsed) {
    return (
      <Link href="/" className="mx-auto">
        <Image
          src={src}
          alt="Leadsy"
          width={32}
          height={32}
          className="h-8 w-8 object-contain"
          priority
        />
      </Link>
    );
  }

  return (
    <Link href="/" className="flex items-center min-w-0">
      <Image
        src={src}
        alt="Leadsy"
        width={120}
        height={32}
        className="h-8 w-auto object-contain"
        priority
      />
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col border-r border-border bg-sidebar transition-all duration-300",
          collapsed ? "w-16" : "w-60",
        )}
      >
        {/* Logo area */}
        <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-3">
          <ThemedLogo collapsed={collapsed} />
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex h-10 items-center justify-center border-t border-sidebar-border text-sidebar-foreground/50 hover:text-sidebar-foreground"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-6">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search..."
                className="h-9 w-64 rounded-lg border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <ThemeToggle />

            {/* User dropdown */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-bold text-white">
                  {user?.name?.charAt(0)?.toUpperCase() ?? "?"}
                </div>
                {user && (
                  <div className="hidden sm:block text-left">
                    <p className="text-xs font-medium leading-none">{user.name}</p>
                    <p className="text-[10px] text-muted-foreground">{user.role?.name ?? "User"}</p>
                  </div>
                )}
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-border bg-card shadow-xl z-50">
                  <div className="border-b border-border px-3 py-2.5">
                    <p className="text-xs font-medium">{user?.name ?? "User"}</p>
                    <p className="text-[10px] text-muted-foreground">{user?.email}</p>
                  </div>
                  <div className="p-1">
                    <button
                      onClick={() => { setUserMenuOpen(false); logout(); }}
                      className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-xs font-medium text-red-500 transition-colors hover:bg-red-500/10"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
