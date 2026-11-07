"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Map, Building2, Package,
  Settings, ClipboardCheck,
  ChevronLeft, ChevronRight, LogOut, ChevronDown, HelpCircle, RadioTower, Share2,
  Globe, Key, Bell, Shield, Database, Users, Bot, Webhook, Target, Tags, GitBranch, Coins, Layers, FileText, Briefcase, Activity,
  HeartPulse, ArrowRightLeft, TestTube2, Trash2, BookOpen, Inbox, Wifi, WifiOff, LayoutGrid, Mail,
  Receipt, FileSpreadsheet, Hash, CalendarClock, Newspaper, Menu, X, Download
} from "lucide-react";
import { useOfflineSync } from "@/lib/offline/offlineSyncManager";
import { usePwaInstall } from "@/lib/pwa/pwa-context";
import { useState, useRef, useEffect, useMemo, type ComponentType, type ReactNode } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useTheme } from "@/lib/theme-context";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { canAccessPath, isSuperAdminUser } from "@/lib/permissions";
import { apiFetch } from "@/lib/apiFetch";
import { ProductTour, PRODUCT_TOUR_ENABLED } from "@/components/ProductTour/ProductTour";
import { Button } from "@/components/ui/button";
import { GlobalSearch } from "./GlobalSearch";
import { PrivacyShield } from "@/components/security/PrivacyShield";

export type NavItem = {
  href: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  children?: Array<{
    href: string;
    icon: ComponentType<{ className?: string }>;
    label: string;
    group?: string;
  }>;
};

export const navItems: NavItem[] = [
  { href: "/dashboard",               icon: LayoutDashboard, label: "Dashboard" },
  {
    href: "/lead-generator",
    icon: RadioTower,
    label: "Leads Generator",
    children: [
      { href: "/map", icon: Map, label: "Map & Territory" },
      { href: "/lead-generator/newsletter", icon: Newspaper, label: "Industry Newsletter" },
      { href: "/lead-generator/idx", icon: Building2, label: "IDX Public Companies" },
      { href: "/lead-generator/platforms", icon: Share2, label: "Social & Platform Generator" },
    ],
  },
  {
    href: "/leads",
    icon: Building2,
    label: "Leads",
    children: [
      { href: "/leads", icon: Building2, label: "All Leads" },
      { href: "/leads/by-industry", icon: Layers, label: "By Industry" },
      { href: "/leads/trash", icon: Trash2, label: "Trash" },
    ],
  },
  { href: "/products",               icon: Package,         label: "Products" },
  { href: "/inbox",                  icon: Inbox,           label: "Omnichannel Inbox" },
  {
    href: "/professional-services",
    icon: Briefcase,
    label: "Professional Services",
    children: [
      { href: "/professional-services", icon: Briefcase, label: "Estimations", group: "Estimator" },
      { href: "/professional-services/estimations/new", icon: ClipboardCheck, label: "New Estimation", group: "Estimator" },
      { href: "/settings/professional-services/templates", icon: FileText, label: "Templates", group: "Configuration" },
      { href: "/settings/professional-services/roles", icon: Coins, label: "Rate Cards & Roles", group: "Configuration" },
      { href: "/settings/professional-services/complexity", icon: Layers, label: "Complexity Matrix", group: "Configuration" },
      { href: "/settings/professional-services/service-categories", icon: Package, label: "Categories", group: "Configuration" },
    ],
  },
  {
    href: "/finance",
    icon: Receipt,
    label: "Finance Hub",
    children: [
      { href: "/finance", icon: Receipt, label: "Invoices & Billing" },
      { href: "/finance/faktur-pajak", icon: FileSpreadsheet, label: "Faktur Pajak (DJP)" },
      { href: "/finance/nsfp-pool", icon: Hash, label: "NSFP Pool" },
      { href: "/finance/payment-terms", icon: CalendarClock, label: "Payment Terms" },
    ],
  },
  {
    href: "/customer-success",
    icon: HeartPulse,
    label: "Customer Success",
    children: [
      { href: "/customer-success", icon: HeartPulse, label: "Health Dashboard" },
      { href: "/customer-success/renewals", icon: ArrowRightLeft, label: "Renewals" },
    ],
  },
  {
    href: "/settings",
    icon: Settings,
    label: "Settings",
    children: [
      { href: "/settings",                icon: LayoutGrid,   label: "Settings Overview", group: "General" },
      { href: "/settings/users",          icon: Users,        label: "Users & Roles", group: "User & Targets" },
      { href: "/settings/targets/revenue", icon: Target,       label: "Target Revenue", group: "User & Targets" },
      { href: "/settings/targets/kpi",     icon: Activity,     label: "Target KPI", group: "User & Targets" },
      { href: "/settings/ai-defaults",    icon: Bot,          label: "AI Defaults", group: "AI Intelligence" },
      { href: "/settings/ai-testing-console", icon: TestTube2, label: "AI Testing Console", group: "AI Intelligence" },
      { href: "/settings/ai-screening-monitor", icon: HeartPulse, label: "AI Screening Monitor", group: "AI Intelligence" },
      { href: "/settings/icp-profiles",   icon: Target,       label: "ICP Profiles", group: "AI Intelligence" },
      { href: "/settings/industries",     icon: Layers,       label: "Industries", group: "CRM Taxonomy" },
      { href: "/settings/business-categories", icon: Briefcase,    label: "Business Categories", group: "CRM Taxonomy" },
      { href: "/settings/lead-sources",    icon: Tags,         label: "Lead Sources", group: "CRM Taxonomy" },
      { href: "/settings/lead-channels",   icon: GitBranch,    label: "Lead Channels", group: "CRM Taxonomy" },
      { href: "/settings/lead-stages",     icon: GitBranch,    label: "Lead Stages", group: "CRM Taxonomy" },
      { href: "/settings/currency",        icon: Coins,        label: "Currency", group: "CRM Taxonomy" },
      { href: "/settings/o2c/tax-codes",   icon: Coins,        label: "Tax Codes", group: "Order to Cash" },
      { href: "/settings/o2c/withholding-tax-codes", icon: Coins, label: "Withholding Tax", group: "Order to Cash" },
      { href: "/settings/o2c/item-settings", icon: Settings,     label: "Item Settings", group: "Order to Cash" },
      { href: "/settings/email",           icon: Mail,         label: "Email & SMTP", group: "Integrations" },
      { href: "/settings/integrations",    icon: Key,          label: "Integration Settings", group: "Integrations" },
      { href: "/settings/webhooks",        icon: Webhook,      label: "Webhooks", group: "Integrations" },
      { href: "/settings/api",             icon: FileText,     label: "API Documentation", group: "Integrations" },
      { href: "/settings/integrations/lark-base", icon: Database, label: "Lark Base Sync", group: "Integrations" },
      { href: "/settings/system-playbook", icon: BookOpen,     label: "System & AI Playbook", group: "System & Security" },
      { href: "/settings/security",        icon: Shield,       label: "Security", group: "System & Security" },
      { href: "/settings/company",         icon: Building2,    label: "Company Settings", group: "System & Security" },
      { href: "/settings/workflows",       icon: GitBranch,    label: "Custom Workflows", group: "System & Security" },
      { href: "/settings/environment",     icon: Globe,        label: "Environment", group: "System & Security" },
      { href: "/settings/notifications",   icon: Bell,         label: "Notifications", group: "System & Security" },
      { href: "/settings/backup",          icon: Database,     label: "Backup & Recovery", group: "System & Security" },
      { href: "/settings/audit-logs",     icon: FileText,     label: "Audit Logs", group: "System & Security" },
    ],
  },
];

function OfflineStatusPill() {
  const { isOnline, pendingCount, isSyncing, syncNow } = useOfflineSync();

  if (!isOnline) {
    return (
      <div
        className="flex items-center gap-1.5 rounded-full border border-[var(--warning)]/30 bg-[var(--warning-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--warning)] animate-pulse sm:px-2.5 sm:py-1"
        title="Jaringan terputus. Data kunjungan akan disimpan offline."
      >
        <WifiOff className="h-3 w-3 shrink-0" />
        <span>
          Offline{pendingCount > 0 ? ` (${pendingCount})` : ""}
        </span>
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <button
        type="button"
        onClick={() => syncNow()}
        disabled={isSyncing}
        className="flex items-center gap-1.5 rounded-full border border-[var(--info)]/30 bg-[var(--info-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--info)] transition-colors hover:opacity-90 sm:px-2.5 sm:py-1"
        title="Klik untuk menyinkronkan data offline sekarang"
      >
        <Wifi className="h-3 w-3 shrink-0" />
        <span>{isSyncing ? "Sync..." : `Sync (${pendingCount})`}</span>
      </button>
    );
  }

  return (
    <div
      className="hidden items-center gap-1 rounded-full border border-[var(--success)]/30 bg-[var(--success-soft)] px-2 py-0.5 text-[10px] font-medium text-[var(--success)] md:flex"
      title="Sistem terhubung secara online"
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
      <span>Online</span>
    </div>
  );
}

function ThemedLogo({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { resolved } = useTheme();
  const src = resolved === "dark" ? "/Leadsy_logo_dark.png" : "/Leadsy_logo_light.png";

  if (collapsed) {
    return (
      <Link href="/dashboard" onClick={onNavigate} className="mx-auto">
        <Image
          src={src}
          alt="Leadsy"
          width={40}
          height={40}
          className="h-10 w-10 object-contain"
          priority
        />
      </Link>
    );
  }

  return (
    <Link href="/dashboard" onClick={onNavigate} className="flex min-w-0 items-center">
      <Image
        src={src}
        alt="Leadsy"
        width={320}
        height={80}
        className="h-14 w-auto object-contain lg:h-20"
        priority
      />
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const setUser = useAuthStore((s) => s.setUser);
  const { canOfferInstall, requestInstall } = usePwaInstall();

  // In mobile drawer, always render expanded labels regardless of desktop collapsed toggle
  const isCompact = collapsed && !mobileMenuOpen;

  const visibleNavItems = useMemo(() => {
    return navItems
      .map((item) => ({
        ...item,
        children: item.children?.filter((child) => canAccessPath(child.href, user)),
      }))
      .filter((item) => canAccessPath(item.href, user) || Boolean(item.children?.length));
  }, [user]);

  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});

  // Close mobile drawer automatically on route transitions
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Auto-expand active sub-menus on pathname changes
  useEffect(() => {
    visibleNavItems.forEach((item) => {
      if (item.children?.length) {
        const isChildActive = item.children.some((child) => pathname.startsWith(child.href));
        if (isChildActive) {
          setExpandedMenus({ [item.href]: true });
        }
      }
    });
  }, [pathname, visibleNavItems]);

  const toggleMenu = (href: string) => {
    if (isCompact) {
      setCollapsed(false);
      setExpandedMenus({ [href]: true });
      return;
    }

    setExpandedMenus((prev) => (prev[href] ? {} : { [href]: true }));
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    apiFetch("/version")
      .then((res) => res.json())
      .then((data) => setAppVersion(data?.version ?? null))
      .catch(() => {/* silently ignore */});
  }, []);

  useEffect(() => {
    apiFetch("/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data) setUser(json.data);
      })
      .catch(() => {/* keep the cached user if this fails */});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Active section label for compact mobile topbar orientation
  const mobileSectionTitle = useMemo(() => {
    if (pathname === "/dashboard") return "Dashboard";
    if (pathname.startsWith("/leads")) return "Leads";
    if (pathname.startsWith("/map")) return "Field Map";
    if (pathname.startsWith("/inbox")) return "Inbox";
    if (pathname.startsWith("/lead-generator/newsletter")) return "Newsletter";
    if (pathname.startsWith("/lead-generator")) return "Lead Gen";
    if (pathname.startsWith("/products")) return "Products";
    if (pathname.startsWith("/professional-services")) return "Services";
    if (pathname.startsWith("/finance")) return "Finance";
    if (pathname.startsWith("/customer-success")) return "CS Hub";
    if (pathname.startsWith("/settings")) return "Settings";
    return "Leadsy";
  }, [pathname]);

  const bottomTabs = useMemo(() => {
    const tabs: Array<{
      key: string;
      label: string;
      href?: string;
      icon: ComponentType<{ className?: string }>;
      active: boolean;
      allowed: boolean;
    }> = [
      {
        key: "dashboard",
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        active: pathname === "/dashboard" && !mobileMenuOpen,
        allowed: true,
      },
      {
        key: "leads",
        label: "Leads",
        href: "/leads",
        icon: Building2,
        active: pathname.startsWith("/leads") && !mobileMenuOpen,
        allowed: canAccessPath("/leads", user),
      },
      {
        key: "map",
        label: "Map",
        href: "/map",
        icon: Map,
        active: pathname.startsWith("/map") && !mobileMenuOpen,
        allowed: canAccessPath("/map", user),
      },
      {
        key: "inbox",
        label: "Inbox",
        href: "/inbox",
        icon: Inbox,
        active: pathname.startsWith("/inbox") && !mobileMenuOpen,
        allowed: canAccessPath("/inbox", user),
      },
    ];
    return tabs.filter((t) => t.allowed);
  }, [pathname, mobileMenuOpen, user]);

  const isSecondaryRouteActive =
    mobileMenuOpen ||
    (pathname !== "/dashboard" &&
      !pathname.startsWith("/leads") &&
      !pathname.startsWith("/map") &&
      !pathname.startsWith("/inbox"));

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      {/* Mobile Slide-Over Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar (Slide-over Drawer on < lg, Collapsible Static Rail on lg+) */}
      <aside
        data-tour="sidebar"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-full w-72 shrink-0 flex-col border-r border-border bg-sidebar pt-safe pb-safe transition-transform duration-300 lg:static lg:z-auto lg:translate-x-0 lg:transition-all",
          collapsed ? "lg:w-16" : "lg:w-60",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo area */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-sidebar-border px-3 lg:h-20">
          <ThemedLogo collapsed={isCompact} onNavigate={() => setMobileMenuOpen(false)} />
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground lg:hidden"
            aria-label="Tutup menu navigasi"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2" data-tour="sidebar-nav">
          {visibleNavItems.map((item) => {
            const hasChildren = Boolean(item.children?.length);
            const isExpanded = expandedMenus[item.href] ?? false;
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href) ||
                  Boolean(item.children?.some((child) => pathname.startsWith(child.href)));

            const itemContent = (
              <>
                <item.icon className="h-4 w-4 shrink-0" />
                {!isCompact && <span className="truncate">{item.label}</span>}
                {!isCompact && hasChildren && (
                  <ChevronDown
                    className={cn(
                      "ml-auto h-4 w-4 shrink-0 transition-transform duration-200",
                      isExpanded && "rotate-180"
                    )}
                  />
                )}
              </>
            );

            return (
              <div key={item.href} className="space-y-1">
                {hasChildren ? (
                  <button
                    type="button"
                    onClick={() => toggleMenu(item.href)}
                    data-tour={`nav-${item.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`}
                    className={cn(
                      "group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                      isCompact && "justify-center px-0"
                    )}
                    title={isCompact ? item.label : undefined}
                  >
                    {itemContent}
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    data-tour={`nav-${item.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`}
                    className={cn(
                      "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                      isCompact && "justify-center px-0"
                    )}
                    title={isCompact ? item.label : undefined}
                  >
                    {itemContent}
                  </Link>
                )}

                {!isCompact && isExpanded && item.children ? (
                  <div className="ml-4 space-y-1 border-l border-sidebar-border pl-2">
                    {(() => {
                      let lastGroup: string | undefined = undefined;
                      return item.children.map((child, index) => {
                        const showGroupHeader = child.group && child.group !== lastGroup;
                        if (child.group) {
                          lastGroup = child.group;
                        }

                        const activeChildHref =
                          item.children?.reduce(
                            (acc, c) =>
                              pathname.startsWith(c.href) && c.href.length > acc.length ? c.href : acc,
                            ""
                          ) || "";
                        const childActive = child.href === activeChildHref;

                        return (
                          <div key={child.href} className="space-y-0.5">
                            {showGroupHeader && (
                              <div
                                className={cn(
                                  "px-2 pb-1 text-[9px] font-bold uppercase tracking-wider text-sidebar-foreground/45",
                                  index === 0 ? "pt-1.5" : "mt-2 border-t border-sidebar-border/30 pt-4"
                                )}
                              >
                                {child.group}
                              </div>
                            )}
                            <Link
                              href={child.href}
                              onClick={() => setMobileMenuOpen(false)}
                              className={cn(
                                "group flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                                childActive
                                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                              )}
                            >
                              <child.icon className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{child.label}</span>
                            </Link>
                          </div>
                        );
                      });
                    })()}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>

        {/* Install PWA CTA inside Sidebar / Mobile Drawer */}
        {canOfferInstall && (
          <div className="border-t border-sidebar-border p-2">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                void requestInstall();
              }}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-xl border border-[var(--brand)]/25 bg-[var(--brand)]/10 px-2.5 py-2 text-xs font-semibold text-[var(--brand)] transition-colors hover:bg-[var(--brand)]/15",
                isCompact && "justify-center px-0"
              )}
              title={isCompact ? "Install Aplikasi Leadsy" : undefined}
            >
              <Download className="h-4 w-4 shrink-0" />
              {!isCompact && <span className="truncate">Install Aplikasi (PWA)</span>}
            </button>
          </div>
        )}

        {/* SaaS Platform Admin Quick Launcher for Superadmins */}
        {isSuperAdminUser(user) && (
          <div className="border-t border-sidebar-border p-2">
            <Link
              href="/admin/tenants"
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                "flex items-center gap-2.5 rounded-xl border border-primary/25 bg-primary/10 px-2.5 py-2 text-xs font-semibold text-primary shadow-sm transition-all hover:bg-primary/20",
                isCompact && "justify-center px-0"
              )}
              title={isCompact ? "SaaS Platform Admin" : undefined}
            >
              <Shield className="h-4 w-4 shrink-0 text-primary" />
              {!isCompact && <span className="truncate">SaaS Platform Admin</span>}
            </Link>
          </div>
        )}

        {/* System & AI Playbook quick button */}
        <div className="border-t border-sidebar-border p-2">
          <Link
            href="/settings/system-playbook"
            onClick={() => setMobileMenuOpen(false)}
            data-tour="nav-system-playbook"
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors",
              pathname === "/settings/system-playbook"
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/75 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
              isCompact && "justify-center px-0"
            )}
            title={isCompact ? "System & AI Playbook" : undefined}
          >
            <BookOpen className="h-4 w-4 shrink-0 text-[color:var(--brand)]" />
            {!isCompact && <span className="truncate">System & AI Playbook</span>}
          </Link>
        </div>

        {/* Version badge */}
        {appVersion && (
          <div
            className={cn(
              "flex items-center border-t border-sidebar-border px-3 py-2",
              isCompact ? "justify-center" : "justify-between"
            )}
          >
            {!isCompact && (
              <span className="text-[10px] font-medium tracking-wide text-sidebar-foreground/40">
                Leadsy
              </span>
            )}
            <span className="rounded-md bg-sidebar-accent/60 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-sidebar-foreground/50">
              v{appVersion}
            </span>
          </div>
        )}

        {/* Collapse toggle (Desktop only) */}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="hidden h-10 items-center justify-center border-t border-sidebar-border text-sidebar-foreground/50 hover:text-sidebar-foreground lg:flex"
          aria-label={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </aside>

      {/* Main Column */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-background/95 px-3 py-2 pt-safe backdrop-blur-md sm:h-14 sm:px-6 sm:py-0">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0 rounded-lg lg:hidden"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Buka menu navigasi"
            >
              <Menu className="h-4 w-4" />
            </Button>

            <Link
              href="/dashboard"
              className="flex min-w-0 items-center gap-2 lg:hidden"
            >
              <img
                src="/icons/icon-192.png"
                alt="Leadsy"
                className="h-7 w-7 shrink-0 rounded-lg border border-border bg-card object-contain p-0.5"
              />
              <span className="truncate text-sm font-semibold tracking-tight text-foreground">
                {mobileSectionTitle}
              </span>
            </Link>

            <div className="hidden sm:block">
              <GlobalSearch />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {/* Mobile search trigger placed cleanly on the right cluster */}
            <div className="sm:hidden">
              <GlobalSearch />
            </div>

            {PRODUCT_TOUR_ENABLED && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="hidden md:inline-flex"
                data-tour="tour-trigger"
                tooltip="Take a tour"
                onClick={() => window.dispatchEvent(new Event("leadsy:start-tour"))}
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
            )}

            {/* SaaS Platform Admin Top Launcher for Superadmins */}
            {user?.role?.name === "super_admin" && (
              <Link href="/admin/tenants" className="hidden md:block">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex h-8 items-center gap-1.5 rounded-xl border-primary/30 text-xs font-semibold text-primary shadow-sm hover:bg-primary/10"
                >
                  <Shield className="h-3.5 w-3.5" />
                  <span>SaaS Admin</span>
                </Button>
              </Link>
            )}

            {/* Offline PWA Status indicator */}
            <OfflineStatusPill />

            {/* Settings Quick Access Button (sm+) */}
            <Link href="/settings" title="Settings Hub & Overview" className="hidden sm:block">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </Link>

            {/* Theme toggle */}
            <ThemeToggle />

            {/* User dropdown */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-1.5 rounded-lg px-1.5 py-1 transition-colors hover:bg-accent sm:gap-2 sm:px-2 sm:py-1.5"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--brand)] text-xs font-bold text-[color:var(--brand-foreground)]">
                  {user?.name?.charAt(0)?.toUpperCase() ?? "?"}
                </div>
                {user && (
                  <div className="hidden text-left md:block">
                    <p className="text-xs font-medium leading-none">{user.name}</p>
                    <p className="text-[10px] text-muted-foreground">{user.role?.name ?? "User"}</p>
                  </div>
                )}
                <ChevronDown className="hidden h-3 w-3 text-muted-foreground sm:block" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-xl border border-border bg-card p-1 shadow-xl">
                  <div className="border-b border-border px-3 py-2.5">
                    <p className="truncate text-xs font-medium">{user?.name ?? "User"}</p>
                    <p className="truncate text-[10px] text-muted-foreground">{user?.email}</p>
                  </div>
                  <div className="p-1">
                    {canOfferInstall && (
                      <button
                        type="button"
                        onClick={() => {
                          setUserMenuOpen(false);
                          void requestInstall();
                        }}
                        className="mb-0.5 flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-xs font-semibold text-[var(--brand)] transition-colors hover:bg-accent"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Install Aplikasi Leadsy
                      </button>
                    )}
                    <Link
                      href="/settings"
                      onClick={() => setUserMenuOpen(false)}
                      className="mb-0.5 flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                    >
                      <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                      Settings & Governance
                    </Link>
                    {isSuperAdminUser(user) && (
                      <Link
                        href="/admin/tenants"
                        onClick={() => setUserMenuOpen(false)}
                        className="my-1 flex w-full items-center gap-2 rounded-md border-t border-border/50 px-2.5 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
                      >
                        <Shield className="h-3.5 w-3.5" />
                        SaaS Platform Admin
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        logout();
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-xs font-medium text-[color:var(--status-danger)] transition-colors hover:bg-[color:var(--status-danger-soft)]"
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
        <main className="min-h-0 flex-1 overflow-y-auto">
          {children}
        </main>

        {/* Hybrid Native Mobile Bottom Navigation Bar (< lg) */}
        <nav
          aria-label="Navigasi Utama Mobile"
          className="shrink-0 border-t border-border bg-card/95 backdrop-blur-xl pb-safe lg:hidden"
        >
          <div className="flex h-14 items-stretch justify-around px-1">
            {bottomTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.key}
                  href={tab.href!}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium transition-colors",
                    tab.active
                      ? "font-semibold text-[var(--brand)]"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.active && (
                    <span className="absolute top-0 h-0.5 w-8 rounded-b-full bg-[var(--brand)]" />
                  )}
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="truncate">{tab.label}</span>
                </Link>
              );
            })}

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className={cn(
                "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium transition-colors",
                isSecondaryRouteActive
                  ? "font-semibold text-[var(--brand)]"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isSecondaryRouteActive && (
                <span className="absolute top-0 h-0.5 w-8 rounded-b-full bg-[var(--brand)]" />
              )}
              <LayoutGrid className="h-5 w-5 shrink-0" />
              <span className="truncate">Menu</span>
            </button>
          </div>
        </nav>
      </div>
      <PrivacyShield />
      <ProductTour />
    </div>
  );
}
