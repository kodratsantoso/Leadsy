"use client";

import { Settings, Globe, Key, Bell, Shield, Database, Users, Bot, Webhook, ShieldCheck, GitBranch } from "lucide-react";
import Link from "next/link";

const settingsItems = [
  { icon: Users, title: "Users & Roles", desc: "User accounts, role management, permissions", href: "/settings/users", color: "from-[var(--brand)] to-[oklch(0.558_0.288_302.321)]" },
  { icon: Bot, title: "AI Defaults", desc: "AI provider management, model routing, defaults", href: "/settings/ai-defaults", color: "from-[var(--brand)] to-[oklch(0.558_0.288_302.321)]" },
  { icon: Key, title: "Integration & API Keys", desc: "Google Maps, AI provider credentials, integrations", href: "/settings/integrations", color: "from-[var(--status-warning)] to-[oklch(0.669_0.195_56)]" },
  { icon: Webhook, title: "Webhooks", desc: "Webhook URL configuration and event management", href: "/settings/webhooks", color: "from-[var(--status-info)] to-[oklch(0.527_0.183_249)]" },
  { icon: Globe, title: "Environment", desc: "Runtime environment overview and configuration", href: "/settings/environment", color: "from-[var(--status-info)] to-[oklch(0.527_0.183_249)]" },
  { icon: Bell, title: "Notifications", desc: "In-app, email, and integration alert preferences", href: "/settings/notifications", color: "from-[var(--brand)] to-[oklch(0.558_0.288_302.321)]" },
  { icon: Database, title: "Backup & Recovery", desc: "Scheduled backups, retention, and restore controls", href: "/settings/backup", color: "from-[var(--status-success)] to-[oklch(0.627_0.194_149)]" },
  { icon: Shield, title: "Security", desc: "Session timeout, password policy, auth settings", href: "/settings/security", color: "from-[var(--status-danger)] to-[oklch(0.558_0.288_302.321)]" },
  { icon: ShieldCheck, title: "Revenue Rules", desc: "Lead scoring rules, block/flag/prioritize actions", href: "/settings/revenue-rules", color: "from-[var(--status-danger)] to-[oklch(0.558_0.288_302.321)]" },
  { icon: GitBranch, title: "Funnel Stages", desc: "Pipeline stage management for lead progression", href: "/settings/funnel-stages", color: "from-[var(--status-success)] to-[oklch(0.627_0.194_149)]" },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Platform configuration & governance controls
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {settingsItems.map((item) => (
          <Link
            href={item.href}
            key={item.title}
            className="group flex items-start gap-4 rounded-xl border border-border bg-card p-5 text-left shadow-sm transition-all hover:shadow-md hover:border-[var(--brand)]/30"
          >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${item.color} shadow-lg`}>
              <item.icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">{item.title}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">{item.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
