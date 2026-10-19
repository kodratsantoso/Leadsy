"use client";

import {
  MapPin,
  MessageSquare,
  Cpu,
  Database,
  Building2,
  Server,
  Workflow,
  Sparkles,
  Shield,
  Layers
} from "lucide-react";

export function LandingMarquee() {
  const integrations = [
    { name: "Google Maps Platform", label: "Geo-Radar & Geocoding", icon: MapPin },
    { name: "Lark Open Platform", label: "Lark Base 2-Way Sync", icon: Workflow },
    { name: "WhatsApp Business API", label: "Official BSP & Mekari Qontak", icon: MessageSquare },
    { name: "OpenAI GPT-4o", label: "Autonomous Reasoning", icon: Sparkles },
    { name: "Anthropic Claude 3.5", label: "Contract & Synthesis AI", icon: Cpu },
    { name: "DeepSeek R1", label: "Math & Deal Scoping AI", icon: Cpu },
    { name: "IDX Indonesia", label: "Public Companies Discovery", icon: Building2 },
    { name: "PostgreSQL SSOT", label: "Enterprise PV Persistence", icon: Database },
    { name: "Kubernetes K3s", label: "In-Cluster Orchestration", icon: Server },
  ];

  return (
    <section className="py-12 border-y border-border/40 bg-muted/20 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Ditenagai oleh Ekosistem Teknologi &amp; Integrasi Enterprise
        </p>
      </div>

      {/* Infinite Horizontal Carousel */}
      <div className="relative w-full overflow-hidden [mask-image:_linear-gradient(to_right,transparent_0,_black_128px,_black_calc(100%-128px),transparent_100%)]">
        <div className="flex w-max items-center gap-6 animate-marquee py-2">
          {[...integrations, ...integrations].map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-card border border-border/60 shadow-sm hover:border-primary/40 transition-colors"
            >
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <item.icon className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-foreground">{item.name}</div>
                <div className="text-[10px] text-muted-foreground">{item.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
