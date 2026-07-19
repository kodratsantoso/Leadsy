"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Map, Building2, Package,
  MessageSquare, Settings, ClipboardCheck,
  ChevronLeft, ChevronRight, Search, LogOut, ChevronDown, HelpCircle, RadioTower, Share2,
  Globe, Key, Bell, Shield, Database, Users, Bot, Webhook, Target, Tags, GitBranch, Coins, Layers, FileText, Briefcase, Activity
} from "lucide-react";
import { useState, useRef, useEffect, useMemo, type ComponentType, type ReactNode } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useTheme } from "@/lib/theme-context";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { canAccessPath } from "@/lib/permissions";
import { apiFetch } from "@/lib/apiFetch";
import { ProductTour } from "@/components/ProductTour/ProductTour";
import { Button } from "@/components/ui/button";

type NavItem = {
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

function WhatsAppLogoIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12.012 2c-5.506 0-9.988 4.482-9.988 9.988 0 1.758.459 3.473 1.332 4.986l-1.354 4.957 5.075-1.331a9.924 9.924 0 004.933 1.314h.005c5.505 0 9.988-4.482 9.988-9.988 0-2.668-1.039-5.176-2.928-7.065A9.92 9.92 0 0012.012 2zm6.066 14.152c-.27.76-1.572 1.393-2.146 1.488-.513.085-1.186.155-3.32-.727-2.73-1.127-4.49-3.905-4.627-4.087-.136-.182-1.103-1.468-1.103-2.798 0-1.33.696-1.986.945-2.253.25-.267.545-.333.727-.333h.52c.16 0 .376.012.545.419.182.437.625 1.52.68 1.633.056.113.092.245.018.396-.074.15-.16.326-.26.447-.1.121-.21.254-.3.354-.1.108-.204.225-.088.423.117.198.519.854 1.11 1.382.76.678 1.402.888 1.602.987.2.1.316.084.437-.054.12-.138.52-.605.66-.811.14-.207.28-.174.47-.104.192.07 1.213.572 1.423.677.21.104.35.155.4.243.05.088.05.512-.17.962z" />
    </svg>
  );
}

function MekariLogoIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 35 32"
      fill="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M32.3779 14.0522L24.5141 12.5087L27.0954 4.91097C27.5532 3.58796 27.2296 2.25057 26.0672 1.57947C24.9048 0.908378 23.5722 1.3326 22.6686 2.35602L17.3789 8.38868L12.0893 2.35602C11.1617 1.31822 9.84351 0.920361 8.69067 1.57947C7.52584 2.24577 7.20228 3.60234 7.66246 4.91097L10.2414 12.5087L2.37759 14.0546C1.00185 14.3159 0.00240094 15.3009 4.17184e-06 16.6407C-0.00239259 17.9829 1.02822 18.9272 2.36561 19.2029L10.2414 20.7464L7.66246 28.3441C7.20468 29.6671 7.52824 31.0045 8.69067 31.6756C9.8531 32.3467 11.1857 31.9225 12.0893 30.8991L17.3789 24.8664L22.6686 30.8991C23.5961 31.9369 24.9144 32.3347 26.0672 31.6756C27.232 31.0093 27.5556 29.6528 27.0954 28.3441L24.5165 20.7464L32.3923 19.2005C33.7297 18.9248 34.7603 17.9805 34.7579 16.6383C34.7555 15.2961 33.756 14.3135 32.3803 14.0522H32.3779Z" />
    </svg>
  );
}

const navItems: NavItem[] = [
  { href: "/",                       icon: LayoutDashboard, label: "Dashboard" },
  {
    href: "/lead-generator",
    icon: RadioTower,
    label: "Leads Generator",
    children: [
      { href: "/map", icon: Map, label: "Map & Territory" },
      { href: "/lead-generator/platforms", icon: Share2, label: "Social & Platform Generator" },
      { href: "/lead-generator/idx", icon: Building2, label: "IDX Public Companies" },
    ],
  },
  { href: "/leads",                  icon: Building2,       label: "Leads" },
  { href: "/qualification/reviews",  icon: ClipboardCheck,  label: "Review Queue" },
  { href: "/products",               icon: Package,         label: "Products" },
  {
    href: "/whatsapp",
    icon: MessageSquare,
    label: "WhatsApp",
    children: [
      { href: "/whatsapp/local", icon: WhatsAppLogoIcon, label: "Local WhatsApp" },
      { href: "/whatsapp/qontak", icon: MekariLogoIcon, label: "Mekari Qontak" },
    ],
  },
  {
    href: "/settings",
    icon: Settings,
    label: "Settings",
    children: [
      { href: "/settings/users",          icon: Users,        label: "Users & Roles", group: "User & Targets" },
      { href: "/settings/targets/revenue", icon: Target,       label: "Target Revenue", group: "User & Targets" },
      { href: "/settings/targets/kpi",     icon: Activity,     label: "Target KPI", group: "User & Targets" },
      { href: "/settings/ai-defaults",    icon: Bot,          label: "AI Defaults", group: "AI Intelligence" },
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
      { href: "/settings/integrations",    icon: Key,          label: "Integration Settings", group: "Integrations" },
      { href: "/settings/webhooks",        icon: Webhook,      label: "Webhooks", group: "Integrations" },
      { href: "/settings/api",             icon: FileText,     label: "API Documentation", group: "Integrations" },
      { href: "/settings/integrations/lark-base", icon: Database, label: "Lark Base Sync", group: "Integrations" },
      { href: "/settings/security",        icon: Shield,       label: "Security", group: "System & Security" },
      { href: "/settings/environment",     icon: Globe,        label: "Environment", group: "System & Security" },
      { href: "/settings/notifications",   icon: Bell,         label: "Notifications", group: "System & Security" },
      { href: "/settings/backup",          icon: Database,     label: "Backup & Recovery", group: "System & Security" },
      { href: "/settings/audit-logs",     icon: FileText,     label: "Audit Logs", group: "System & Security" },
    ],
  },
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
          width={40}
          height={40}
          className="h-10 w-10 object-contain"
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
        width={320}
        height={80}
        className="h-20 w-auto object-contain"
        priority
      />
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const visibleNavItems = useMemo(() => {
    return navItems
      .map((item) => ({
        ...item,
        children: item.children?.filter((child) => canAccessPath(child.href, user)),
      }))
      .filter((item) => canAccessPath(item.href, user) || Boolean(item.children?.length));
  }, [user]);

  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});

  // Auto-expand active sub-menus on pathname changes
  useEffect(() => {
    visibleNavItems.forEach((item) => {
      if (item.children?.length) {
        const isChildActive = item.children.some((child) => pathname.startsWith(child.href));
        if (isChildActive) {
          setExpandedMenus((prev) => ({ ...prev, [item.href]: true }));
        }
      }
    });
  }, [pathname, visibleNavItems]);

  const toggleMenu = (href: string) => {
    if (collapsed) {
      setCollapsed(false);
      setExpandedMenus((prev) => ({
        ...prev,
        [href]: true,
      }));
    } else {
      setExpandedMenus((prev) => ({
        ...prev,
        [href]: !prev[href],
      }));
    }
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

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        data-tour="sidebar"
        className={cn(
          "flex flex-col border-r border-border bg-sidebar transition-all duration-300",
          collapsed ? "w-16" : "w-60",
        )}
      >
        {/* Logo area */}
        <div className="flex h-20 items-center justify-between border-b border-sidebar-border px-3">
          <ThemedLogo collapsed={collapsed} />
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-2" data-tour="sidebar-nav">
          {visibleNavItems.map((item) => {
            const hasChildren = Boolean(item.children?.length);
            const isExpanded = expandedMenus[item.href] ?? false;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href) || Boolean(item.children?.some((child) => pathname.startsWith(child.href)));
            
            const itemContent = (
              <>
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
                {!collapsed && hasChildren && (
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
                    onClick={() => toggleMenu(item.href)}
                    data-tour={`nav-${item.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`}
                    className={cn(
                      "group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors text-left",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    {itemContent}
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    data-tour={`nav-${item.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`}
                    className={cn(
                      "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    {itemContent}
                  </Link>
                )}

                {!collapsed && isExpanded && item.children ? (
                  <div className="ml-4 space-y-1 border-l border-sidebar-border pl-2">
                    {(() => {
                      let lastGroup: string | undefined = undefined;
                      return item.children.map((child, index) => {
                        const showGroupHeader = child.group && child.group !== lastGroup;
                        if (child.group) {
                          lastGroup = child.group;
                        }
                        const childActive = pathname.startsWith(child.href);
                        return (
                          <div key={child.href} className="space-y-0.5">
                            {showGroupHeader && (
                              <div className={cn(
                                "px-2 pb-1 text-[9px] font-bold uppercase tracking-wider text-sidebar-foreground/45",
                                index === 0 ? "pt-1.5" : "pt-4 border-t border-sidebar-border/30 mt-2"
                              )}>
                                {child.group}
                              </div>
                            )}
                            <Link
                              href={child.href}
                              className={cn(
                                "group flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                                childActive
                                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                              )}
                            >
                              <child.icon className="h-3.5 w-3.5 shrink-0" />
                              <span>{child.label}</span>
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

        {/* Version badge */}
        {appVersion && (
          <div className={cn(
            "flex items-center border-t border-sidebar-border px-3 py-2",
            collapsed ? "justify-center" : "justify-between"
          )}>
            {!collapsed && (
              <span className="text-[10px] text-sidebar-foreground/40 font-medium tracking-wide">
                Leadsy
              </span>
            )}
            <span className="rounded-md bg-sidebar-accent/60 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-sidebar-foreground/50">
              v{appVersion}
            </span>
          </div>
        )}

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
                data-tour="global-search"
                type="text"
                placeholder="Search..."
                className="h-9 w-64 rounded-lg border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              data-tour="tour-trigger"
              tooltip="Take a tour"
              onClick={() => window.dispatchEvent(new Event("leadsy:start-tour"))}
            >
              <HelpCircle className="h-4 w-4" />
            </Button>

            {/* Theme toggle */}
            <ThemeToggle />

            {/* User dropdown */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--brand)] text-xs font-bold text-[color:var(--brand-foreground)]">
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
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
      <ProductTour />
    </div>
  );
}
