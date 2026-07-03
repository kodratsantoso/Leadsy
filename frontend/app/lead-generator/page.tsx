"use client";

import Link from "next/link";
import { ArrowRight, Map, Share2, Upload, Webhook, Building2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const generatorModules = [
  {
    title: "Map & Territory",
    description: "Find nearby businesses, evaluate territory coverage, and push qualified discoveries into Leads.",
    href: "/map",
    icon: Map,
    badge: "Live",
  },
  {
    title: "Social & Platform Generator",
    description: "Prepare inbound lead flows from Instagram, TikTok, YouTube, LinkedIn, Google Ads, CRM, automation, and enrichment channels.",
    href: "/lead-generator/platforms",
    icon: Share2,
    badge: "Foundation",
  },
  {
    title: "Webhook & Event Intake",
    description: "Route online and offline lead sources through idempotent webhook and upload foundations.",
    href: "/settings/webhooks",
    icon: Webhook,
    badge: "Settings",
  },
  {
    title: "Bulk Upload",
    description: "Import CSV or Excel leads from events and field teams through the existing Leads import workflow.",
    href: "/leads",
    icon: Upload,
    badge: "Live",
  },
  {
    title: "IDX Public Companies",
    description: "Search and import companies from Bursa Efek Indonesia (IDX) directly into Leads.",
    href: "/lead-generator/idx",
    icon: Building2,
    badge: "New",
  },
];

export default function LeadGeneratorPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leads Generator</h1>
          <p className="text-sm text-muted-foreground">
            Central workspace for generated, discovered, imported, and inbound platform leads.
          </p>
        </div>
        <Link href="/settings/integrations">
          <Button variant="outline">
            Integration Setting
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {generatorModules.map((module) => (
          <Card key={module.title}>
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[color:var(--surface-strong)]">
                  <module.icon className="h-5 w-5 text-[color:var(--brand)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base">{module.title}</CardTitle>
                  <CardDescription>{module.description}</CardDescription>
                </div>
              </div>
              <Badge variant={module.badge === "Live" ? "success" : module.badge === "Settings" ? "info" : "warning"}>
                {module.badge}
              </Badge>
            </CardHeader>
            <CardContent>
              <Link href={module.href}>
                <Button variant="outline">
                  Open
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
