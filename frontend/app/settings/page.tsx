"use client";

import { Globe, Key, Bell, Shield, Database, Users, Bot, Webhook, Target, Tags, GitBranch, Coins, Layers, FileText } from "lucide-react";
import Link from "next/link";

const settingsItems = [
  { icon: Users,     title: "Users & Roles",         desc: "User accounts, role management, permissions",                        href: "/settings/users",         color: "bg-[color:var(--brand)]" },
  { icon: Bot,       title: "AI Defaults",           desc: "Providers, API keys, routing, prompts, health, and fallbacks",      href: "/settings/ai-defaults",   color: "bg-[color:var(--brand)]" },
  { icon: Layers,    title: "Industries",            desc: "Industry and sub-industry master data for lead classification",      href: "/settings/industries",    color: "bg-[color:var(--status-info)]" },
  { icon: Target,    title: "ICP Profiles",          desc: "Ideal Customer Profiles for lead scoring and ICP match evaluation", href: "/settings/icp-profiles",  color: "bg-[color:var(--status-info)]" },
  { icon: FileText,  title: "Audit Logs",            desc: "Governance trail for platform activity and sensitive changes",       href: "/settings/audit-logs",    color: "bg-[color:var(--status-warning)]" },
  { icon: Tags,      title: "Lead Sources",          desc: "Source master data used to classify where leads come from",          href: "/settings/lead-sources",  color: "bg-[color:var(--status-info)]" },
  { icon: GitBranch, title: "Lead Channels",         desc: "Channel types nested under lead sources for deeper classification",  href: "/settings/lead-channels", color: "bg-[color:var(--status-info)]" },
  { icon: GitBranch, title: "Lead Stages",           desc: "Pipeline stage master data used by lead movement and funnels",       href: "/settings/lead-stages",   color: "bg-[color:var(--status-info)]" },
  { icon: Coins,     title: "Currency",              desc: "Currency master data, separators, and decimal display format",       href: "/settings/currency",      color: "bg-[color:var(--status-success)]" },
  { icon: Key,       title: "Integration Setting",    desc: "Social media, ad platform, CRM, SSO, Maps, WhatsApp, and non-AI credentials", href: "/settings/integrations",  color: "bg-[color:var(--status-warning)]" },
  { icon: Webhook,   title: "Webhooks",              desc: "Webhook URL configuration and event management",                     href: "/settings/webhooks",      color: "bg-[color:var(--status-info)]" },
  { icon: Globe,     title: "Environment",           desc: "Runtime environment overview and configuration",                     href: "/settings/environment",   color: "bg-[color:var(--status-info)]" },
  { icon: Bell,      title: "Notifications",         desc: "In-app, email, and integration alert preferences",                  href: "/settings/notifications", color: "bg-[color:var(--brand)]" },
  { icon: Database,  title: "Backup & Recovery",     desc: "Scheduled backups, retention, and restore controls",                href: "/settings/backup",        color: "bg-[color:var(--status-success)]" },
  { icon: Shield,    title: "Security",              desc: "Session timeout, password policy, auth settings",                   href: "/settings/security",      color: "bg-[color:var(--status-danger)]" },
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-tour="settings-master-data">
        {settingsItems.map((item) => (
          <Link
            href={item.href}
            key={item.title}
            className="group flex items-start gap-4 rounded-xl border border-border bg-card p-5 text-left shadow-sm transition-all hover:border-[color:var(--brand)] hover:shadow-md"
          >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${item.color} shadow-lg`}>
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
