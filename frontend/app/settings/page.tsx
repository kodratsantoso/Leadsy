"use client";

import { Globe, Key, Bell, Shield, Database, Users, Bot, Webhook, Target, Tags, GitBranch, Coins, Layers, FileText, Briefcase, Activity, BookOpen, Mail, Hash, FileCheck, Zap, Receipt } from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { canAccessPath } from "@/lib/permissions";

const categories = [
  {
    name: "User & Targets",
    desc: "Manage team accounts, target revenue allocation, and hierarchy configurations.",
    items: [
      { icon: Users,     title: "Users & Roles",         desc: "User accounts, role management, permissions",                        href: "/settings/users",         color: "bg-[color:var(--brand)]" },
      { icon: Coins,     title: "Collaborative Incentives", desc: "Kebijakan insentif kolaboratif departemen (Sales, SA, CSM, PSC), rasio 70/20/10, dan approval", href: "/settings/incentives", color: "bg-[color:var(--brand)]" },
      { icon: Target,    title: "Target Revenue",        desc: "Configure company revenue targets and cascade to Sales and AMs",      href: "/settings/targets/revenue", color: "bg-[color:var(--brand)]" },
      { icon: Activity,  title: "Target KPI",            desc: "Configure role-specific metrics and KPIs for all user levels",        href: "/settings/targets/kpi",   color: "bg-[color:var(--brand)]" },
      { icon: Shield,    title: "Company Settings",      desc: "Configure company brand, logo, NPWP, signatory details, and bank accounts", href: "/settings/company", color: "bg-[color:var(--brand)]" },
      { icon: Hash,      title: "Document Numbering",    desc: "Format penomoran seri otomatis (Quotation, Sales Order, Invoice, BAST, SOW) per tenant", href: "/settings/document-numbering", color: "bg-[color:var(--brand)]" },
    ]
  },
  {
    name: "CRM Taxonomy",
    desc: "Klasifikasi industri terpusat tingkat SaaS dan struktur pipeline workspace tenant.",
    items: [
      { icon: Layers,    title: "Industries (SaaS Global)", desc: "Master data industri & sub-industri terpusat untuk seluruh tenant", href: "/settings/industries", color: "bg-[color:var(--status-info)]" },
      { icon: Briefcase, title: "Business Categories (SaaS)", desc: "Kategori bisnis global digunakan oleh AI dan firmografi lead", href: "/settings/business-categories", color: "bg-[color:var(--status-info)]" },
      { icon: Tags,      title: "Lead Sources",          desc: "Sumber prospek kustom khusus untuk workspace tenant Anda",          href: "/settings/lead-sources",  color: "bg-[color:var(--status-info)]" },
      { icon: GitBranch, title: "Lead Channels",         desc: "Kanal prospek bertingkat khusus untuk workspace tenant Anda",  href: "/settings/lead-channels", color: "bg-[color:var(--status-info)]" },
      { icon: GitBranch, title: "Lead Stages",           desc: "Tahapan sales pipeline funnel khusus workspace tenant Anda",       href: "/settings/lead-stages",   color: "bg-[color:var(--status-info)]" },
      { icon: Coins,     title: "Default Currency",      desc: "Pilih mata uang utama workspace (IDR/USD) dan format pemisah desimal", href: "/settings/currency", color: "bg-[color:var(--status-success)]" },
    ]
  },
  {
    name: "AI Intelligence",
    desc: "Pemantauan saldo kuota kredit AI dan pengaturan Ideal Customer Profile (ICP).",
    items: [
      { icon: Zap,       title: "AI Credits & Quota",    desc: "Pantau saldo kuota kredit AI workspace, riwayat token, dan top-up kuota", href: "/settings/ai-credits", color: "bg-amber-500" },
      { icon: Target,    title: "ICP Profiles",          desc: "Ideal Customer Profiles workspace untuk scoring dan evaluasi otomatis lead", href: "/settings/icp-profiles",  color: "bg-[color:var(--status-info)]" },
    ]
  },
  {
    name: "Finance & Tax Codes (O2C)",
    desc: "Pengaturan kode pajak, withholding tax, dan aturan item penjualan khusus tenant.",
    items: [
      { icon: Receipt,   title: "Tax Codes (PPN)",       desc: "Kode pajak pertambahan nilai dan tarif persentase per tenant", href: "/settings/o2c/tax-codes", color: "bg-[color:var(--status-success)]" },
      { icon: Receipt,   title: "Withholding Tax (PPh)", desc: "Kode pajak pemotongan (PPh 23, PPh 4(2), jasa teknik) per tenant", href: "/settings/o2c/withholding-tax-codes", color: "bg-[color:var(--status-warning)]" },
      { icon: FileText,  title: "Item Settings",         desc: "Kebijakan diskon item, override harga manual, dan tier paket SaaS", href: "/settings/o2c/item-settings", color: "bg-[color:var(--brand)]" },
    ]
  },
  {
    name: "Integrations",
    desc: "Connect messaging channels, CRM platforms, and configure webhook delivery.",
    items: [
      { icon: Mail,      title: "Email Integration",      desc: "Konfigurasi server SMTP pengiriman dan sinkronisasi IMAP Lark / Custom Email", href: "/settings/integrations?tab=email",        color: "bg-[color:var(--status-info)]" },
      { icon: Key,       title: "Integration Settings",   desc: "Social media, ad platform, CRM, SSO, Maps, WhatsApp, and credentials", href: "/settings/integrations",  color: "bg-[color:var(--status-warning)]" },
      { icon: FileCheck, title: "Mekari Sign & e-Meterai", desc: "Integrasi tanda tangan elektronik tersertifikasi dan pembubuhan e-Meterai resmi Peruri", href: "/settings/integrations?tab=mekari_sign", color: "bg-[color:var(--status-info)]" },
      { icon: Webhook,   title: "Webhooks",              desc: "Webhook URL configuration and event management",                     href: "/settings/integrations?tab=webhooks", color: "bg-[color:var(--status-info)]" },
      { icon: FileText,  title: "API Documentation",     desc: "API reference and Integration Token generation",                     href: "/settings/api",           color: "bg-[color:var(--brand)]" },
    ]
  },
  {
    name: "Professional Services",
    desc: "Configure estimations, service categories, pricing rates, and project governance.",
    items: [
      { icon: Layers,    title: "Service Categories",    desc: "Manage high-level service domains for estimations",                 href: "/settings/professional-services/service-categories", color: "bg-[color:var(--status-info)]" },
      { icon: Users,     title: "Roles & Rate Cards",    desc: "Define service roles and date-effective pricing structures",        href: "/settings/professional-services/roles",              color: "bg-[color:var(--brand)]" },
      { icon: Target,    title: "Complexity Matrix",     desc: "Configure complexity levels and multipliers for estimations",       href: "/settings/professional-services/complexity",         color: "bg-[color:var(--status-warning)]" },
      { icon: FileText,  title: "Estimation Templates",  desc: "Pre-defined task templates linked to service categories",           href: "/settings/professional-services/templates",          color: "bg-[color:var(--status-success)]" },
      { icon: Shield,    title: "Governance Rules",      desc: "Configure approval blockers and locking rules for PS workflows",    href: "/settings/professional-services/governance",         color: "bg-[color:var(--status-danger)]" },
      { icon: Activity,  title: "PSA Settings",          desc: "Global thresholds for PSA Lite execution tracking",                 href: "/settings/professional-services/psa",                color: "bg-[color:var(--status-info)]" },
    ]
  },
  {
    name: "System & Security",
    desc: "Audit trailing, session governance, alerts, and system recovery.",
    items: [
      { icon: BookOpen,  title: "System & AI Playbook",  desc: "Panduan alur operasional Leadsy, direktori 33 kapabilitas AI, workflow & output", href: "/settings/system-playbook", color: "bg-[color:var(--brand)]" },
      { icon: Shield,    title: "Security",              desc: "Session timeout, password policy, auth settings",                   href: "/settings/security",      color: "bg-[color:var(--status-danger)]" },
      { icon: Users,     title: "Active Sessions",       desc: "Sesi pengguna aktif, telemetri perangkat, lokasi, dan opsi logout idle", href: "/settings/sessions", color: "bg-[color:var(--brand)]" },
      { icon: Globe,     title: "Environment",           desc: "Runtime environment overview and configuration",                     href: "/settings/environment",   color: "bg-[color:var(--status-info)]" },
      { icon: Bell,      title: "Notifications",         desc: "In-app, email, and integration alert preferences",                  href: "/settings/notifications", color: "bg-[color:var(--brand)]" },
      { icon: Database,  title: "Backup & Recovery",     desc: "Scheduled backups, retention, and restore controls",                href: "/settings/backup",        color: "bg-[color:var(--status-success)]" },
      { icon: FileText,  title: "Audit Logs",            desc: "Governance trail for platform activity and sensitive changes",       href: "/settings/audit-logs",    color: "bg-[color:var(--status-warning)]" },
    ]
  },
  {
    name: "Automation",
    desc: "Configure outreach cadences, workflow pipelines, and automated rule execution.",
    items: [
      { icon: GitBranch, title: "Sales Cadences",        desc: "Multi-touch outreach sequences and automated lead engagement workflows", href: "/settings/cadences",     color: "bg-[color:var(--brand)]" },
      { icon: Layers,    title: "Custom Workflows",      desc: "Visual workflow builder for custom process approvals",              href: "/settings/workflows",     color: "bg-[color:var(--status-info)]" },
    ]
  }
];

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  
  const visibleCategories = categories.map(cat => ({
    ...cat,
    items: cat.items.filter(item => canAccessPath(item.href, user))
  })).filter(cat => cat.items.length > 0);

  return (
    <div className="space-y-6 p-6 w-full">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Platform configuration & governance controls
        </p>
      </div>

      <div className="space-y-10" data-tour="settings-master-data">
        {visibleCategories.map((category) => (
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
