"use client";

import { Settings, Globe, Key, Bell, Shield, Database, Users, Bot, Webhook, Target, Tags, GitBranch, Coins } from "lucide-react";
import Link from "next/link";

const settingsItems = [
  { icon: Users,    title: "Users & Roles",        desc: "User accounts, role management, permissions",                        href: "/settings/users",        color: "from-indigo-500 to-purple-600" },
  { icon: Bot,      title: "AI Defaults",           desc: "Providers, API keys, routing, prompts, health, and fallbacks",      href: "/settings/ai-defaults",  color: "from-indigo-500 to-purple-600" },
  { icon: Target,   title: "ICP Profiles",          desc: "Ideal Customer Profiles for lead scoring and ICP match evaluation", href: "/settings/icp-profiles", color: "from-violet-500 to-indigo-600" },
  { icon: Tags,     title: "Lead Sources",           desc: "Source master data used to classify where leads come from",         href: "/settings/lead-sources", color: "from-cyan-500 to-blue-600" },
  { icon: GitBranch,title: "Lead Channels",          desc: "Channel types nested under lead sources for deeper classification", href: "/settings/lead-channels", color: "from-blue-500 to-indigo-600" },
  { icon: Coins,    title: "Currency",               desc: "Currency master data, separators, and decimal display format",      href: "/settings/currency",     color: "from-emerald-500 to-teal-600" },
  { icon: Key,      title: "Integration & API Keys",desc: "Google Maps, WhatsApp, Lusha, and other non-AI integrations",       href: "/settings/integrations", color: "from-amber-500 to-orange-600" },
  { icon: Webhook,  title: "Webhooks",              desc: "Webhook URL configuration and event management",                    href: "/settings/webhooks",     color: "from-cyan-500 to-blue-600" },
  { icon: Globe,    title: "Environment",           desc: "Runtime environment overview and configuration",                    href: "/settings/environment",  color: "from-blue-500 to-cyan-600" },
  { icon: Bell,     title: "Notifications",         desc: "In-app, email, and integration alert preferences",                 href: "/settings/notifications",color: "from-purple-500 to-violet-600" },
  { icon: Database, title: "Backup & Recovery",     desc: "Scheduled backups, retention, and restore controls",               href: "/settings/backup",       color: "from-emerald-500 to-green-600" },
  { icon: Shield,   title: "Security",              desc: "Session timeout, password policy, auth settings",                  href: "/settings/security",     color: "from-red-500 to-pink-600" },
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
            className="group flex items-start gap-4 rounded-xl border border-border bg-card p-5 text-left shadow-sm transition-all hover:shadow-md hover:border-indigo-500/30"
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
