"use client";

import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Database,
  FileSpreadsheet,
  Globe2,
  Megaphone,
  MessageSquare,
  RefreshCw,
  Share2,
  Video,
  Webhook,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const platformGroups = [
  {
    title: "Existing Channels",
    description: "Native inbound sources requested for the Leadsy ecosystem.",
    platforms: [
      { name: "Instagram Graph API", capability: "Lead forms, DMs, comment triggers", icon: Share2 },
      { name: "TikTok Business API", capability: "Lead Generation Ads webhook intake", icon: Video },
      { name: "YouTube Analytics", capability: "Video lead metric sync", icon: Video },
      { name: "LinkedIn Marketing", capability: "Lead Gen Forms and outbound triggers", icon: Share2 },
      { name: "Google Ads", capability: "Lead Form Extensions intake", icon: Megaphone },
      { name: "Mekari Qontak", capability: "Qualified lead handoff to omnichannel CRM", icon: MessageSquare },
      { name: "Events", capability: "Webhook plus CSV/Excel upload intake", icon: FileSpreadsheet },
    ],
  },
  {
    title: "Expansion Channels",
    description: "CRM, automation, and enrichment channels planned for follow-up phases.",
    platforms: [
      { name: "HubSpot", capability: "Two-way lead sync", icon: Database },
      { name: "Salesforce", capability: "Two-way lead sync", icon: Database },
      { name: "Pipedrive", capability: "Two-way lead sync", icon: Database },
      { name: "Zapier", capability: "Trigger outbound automations", icon: Webhook },
      { name: "Make", capability: "Scenario webhook triggers", icon: Share2 },
      { name: "Hunter.io", capability: "Email verification before routing", icon: BadgeCheck },
    ],
  },
];

export default function LeadPlatformGeneratorPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Social & Platform Generator</h1>
          <p className="text-sm text-muted-foreground">
            Generator channels for social media, ads, CRM, automation, enrichment, and event sources.
          </p>
        </div>
        <Link href="/settings/integrations">
          <Button>
            Configure Credentials
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Inbound Lead Flow Foundation</CardTitle>
            <CardDescription>
              Phase 1 stores connection metadata, encrypted credentials, entity mappings, and idempotent webhook events. OAuth, validation, token refresh, and provider-specific ingestion are planned as separate backend phases.
            </CardDescription>
          </div>
          <Badge variant="warning">Foundation</Badge>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              { label: "Credential Vault", value: "AES-256-GCM", icon: BadgeCheck },
              { label: "Webhook Safety", value: "Idempotency keys", icon: Webhook },
              { label: "Lead Routing", value: "Async-ready mapping", icon: RefreshCw },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-border bg-[color:var(--surface-subtle)] p-4">
                <item.icon className="mb-3 h-5 w-5 text-[color:var(--brand)]" />
                <p className="text-sm font-semibold">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {platformGroups.map((group) => (
          <Card key={group.title}>
            <CardHeader>
              <div>
                <CardTitle>{group.title}</CardTitle>
                <CardDescription>{group.description}</CardDescription>
              </div>
              <Globe2 className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {group.platforms.map((platform) => (
                  <div key={platform.name} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[color:var(--surface-strong)]">
                      <platform.icon className="h-4 w-4 text-[color:var(--brand)]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{platform.name}</p>
                      <p className="text-xs text-muted-foreground">{platform.capability}</p>
                    </div>
                    <Badge variant="neutral">Planned</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>SSO and OAuth Setup</CardTitle>
            <CardDescription>
              Use Settings → Integration Setting to prepare client IDs, secrets, account IDs, pixel IDs, and manual tokens for each platform. Provider login buttons become active after the Phase 2 OAuth routes are wired to official provider documentation.
            </CardDescription>
          </div>
          <Globe2 className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
      </Card>
    </div>
  );
}
