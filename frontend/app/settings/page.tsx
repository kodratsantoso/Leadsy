"use client";

import { Globe, Key, Bell, Shield, Database, Users, Bot, Webhook, Target, Tags, GitBranch, Coins, Layers, FileText } from "lucide-react";
import Link from "next/link";

const categories = [
  {
    name: "User & Targets",
    desc: "Manage team accounts, target revenue allocation, and hierarchy configurations.",
    items: [
      { icon: Users,     title: "Users & Roles",         desc: "User accounts, role management, permissions",                        href: "/settings/users",         color: "bg-[color:var(--brand)]" },
      { icon: Target,    title: "Target Cascades",       desc: "Configure company revenue targets and cascade to user hierarchy",     href: "/settings/targets",       color: "bg-[color:var(--brand)]" },
    ]
  },
  {
    name: "CRM Taxonomy",
    desc: "Define master data, stages, pipelines, and currencies used for lead operations.",
    items: [
      { icon: Layers,    title: "Industries",            desc: "Industry and sub-industry master data for lead classification",      href: "/settings/industries",    color: "bg-[color:var(--status-info)]" },
      { icon: Tags,      title: "Lead Sources",          desc: "Source master data used to classify where leads come from",          href: "/settings/lead-sources",  color: "bg-[color:var(--status-info)]" },
      { icon: GitBranch, title: "Lead Channels",         desc: "Channel types nested under lead sources for deeper classification",  href: "/settings/lead-channels", color: "bg-[color:var(--status-info)]" },
      { icon: GitBranch, title: "Lead Stages",           desc: "Pipeline stage master data used by lead movement and funnels",       href: "/settings/lead-stages",   color: "bg-[color:var(--status-info)]" },
      { icon: Coins,     title: "Currency",              desc: "Currency master data, separators, and decimal display format",       href: "/settings/currency",      color: "bg-[color:var(--status-success)]" },
    ]
  },
  {
    name: "AI Intelligence",
    desc: "Configure LLM providers, Prompts, and Ideal Customer Profiles.",
    items: [
      { icon: Bot,       title: "AI Defaults",           desc: "Providers, API keys, routing, prompts, health, and fallbacks",      href: "/settings/ai-defaults",   color: "bg-[color:var(--brand)]" },
      { icon: Target,    title: "ICP Profiles",          desc: "Ideal Customer Profiles for lead scoring and ICP match evaluation", href: "/settings/icp-profiles",  color: "bg-[color:var(--status-info)]" },
    ]
  },
  {
    name: "Integrations",
    desc: "Connect messaging channels, CRM platforms, and configure webhook delivery.",
    items: [
      { icon: Key,       title: "Integration Settings",   desc: "Social media, ad platform, CRM, SSO, Maps, WhatsApp, and credentials", href: "/settings/integrations",  color: "bg-[color:var(--status-warning)]" },
      { icon: Webhook,   title: "Webhooks",              desc: "Webhook URL configuration and event management",                     href: "/settings/webhooks",      color: "bg-[color:var(--status-info)]" },
    ]
  },
  {
    name: "System & Security",
    desc: "Audit trailing, session governance, alerts, and system recovery.",
    items: [
      { icon: Shield,    title: "Security",              desc: "Session timeout, password policy, auth settings",                   href: "/settings/security",      color: "bg-[color:var(--status-danger)]" },
      { icon: Globe,     title: "Environment",           desc: "Runtime environment overview and configuration",                     href: "/settings/environment",   color: "bg-[color:var(--status-info)]" },
      { icon: Bell,      title: "Notifications",         desc: "In-app, email, and integration alert preferences",                  href: "/settings/notifications", color: "bg-[color:var(--brand)]" },
      { icon: Database,  title: "Backup & Recovery",     desc: "Scheduled backups, retention, and restore controls",                href: "/settings/backup",        color: "bg-[color:var(--status-success)]" },
      { icon: FileText,  title: "Audit Logs",            desc: "Governance trail for platform activity and sensitive changes",       href: "/settings/audit-logs",    color: "bg-[color:var(--status-warning)]" },
    ]
  }
];

export default function SettingsPage() {
  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Platform configuration & governance controls
        </p>
      </div>

      <div className="space-y-10" data-tour="settings-master-data">
        {categories.map((category) => (
          <section key={category.name} className="space-y-4">
            <div className="border-b border-border pb-2">
              <h2 className="text-base font-semibold tracking-tight text-foreground">{category.name}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{category.desc}</p>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {category.items.map((item) => (
                <Link
                  href={item.href}
                  key={item.title}
                  className="group flex items-start gap-4 rounded-xl border border-border bg-card p-5 text-left shadow-sm transition-all hover:border-[color:var(--brand)] hover:shadow-md"
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${item.color} shadow-lg transition-transform group-hover:scale-105`}>
                    <item.icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground group-hover:text-[color:var(--brand)] transition-colors">{item.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
