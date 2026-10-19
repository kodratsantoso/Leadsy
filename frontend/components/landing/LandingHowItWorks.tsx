"use client";

import {
  MapPin,
  Bot,
  Briefcase,
  MessageSquare,
  ArrowRight,
  Sparkles,
  Layers,
  CheckCircle2,
  TrendingUp,
  FileText
} from "lucide-react";

export function LandingHowItWorks() {
  const steps = [
    {
      step: "01",
      icon: MapPin,
      title: "Geo-Radar & Market Discovery",
      desc: "Petakan calon prospek bisnis dalam radius terdekat di Google Maps, telusuri 900+ emiten publik Bursa Efek Indonesia (IDX), atau impor kontak dari multi-platform secara instan.",
      highlight: "Radius geofencing & industri targeting",
    },
    {
      step: "02",
      icon: Bot,
      title: "8-Stage Autonomous AI Screening",
      desc: "Multi-LLM pipeline (GPT-4o, Claude, DeepSeek) menganalisis kesesuaian solusi, kesiapan teknologi, kemampuan finansial, hingga tingkat kewenangan decision maker dalam hitungan detik.",
      highlight: "Skor BANTC objektif & bukti faktual",
    },
    {
      step: "03",
      icon: Briefcase,
      title: "Presales Scoping & Deal Sizing",
      desc: "Presales Solution Architect dan Account Owner berkolaborasi merumuskan ruang lingkup proyek, menghitung estimasi biaya berdasarkan rate card terstandar, dan menetapkan komisi O2C.",
      highlight: "Kalkulator estimasi & rate-card roles",
    },
    {
      step: "04",
      icon: MessageSquare,
      title: "Omnichannel Engagement & Closing",
      desc: "Kirim pesan penawaran terpersonalisasi via WhatsApp Business (Mekari Qontak & Local Engine), sinkronisasi otomatis ke Lark Base, dan kawal retensi pelanggan via Customer Success Health Score.",
      highlight: "Two-way WhatsApp & Lark Base Sync",
    },
  ];

  return (
    <section id="pipeline" className="py-20 md:py-28 bg-muted/30 border-y border-border/40 relative scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
            <Sparkles className="w-3.5 h-3.5" />
            <span>ALUR KERJA REVENUE ENTERPRISE</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-foreground tracking-tight">
            4 Langkah Mengubah Wilayah Pasar Menjadi Closing Deal
          </h2>
          <p className="text-base text-muted-foreground">
            Dari pemetaan awal prospek di lapangan hingga pengawalan customer success jangka panjang, semuanya terintegrasi dalam satu platform mulus.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((item, idx) => (
            <div
              key={idx}
              className="relative rounded-2xl border border-border/70 bg-card p-6 flex flex-col justify-between hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-1 group"
            >
              <div>
                {/* Step Number & Icon */}
                <div className="flex items-center justify-between mb-6">
                  <span className="text-2xl font-black font-mono text-muted-foreground/40 group-hover:text-primary transition-colors">
                    {item.step}
                  </span>
                  <div className="p-3 rounded-xl bg-primary/10 text-primary border border-primary/20 group-hover:scale-110 transition-transform">
                    <item.icon className="w-5 h-5" />
                  </div>
                </div>

                <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                  {item.desc}
                </p>
              </div>

              <div className="pt-3 border-t border-border/60 flex items-center gap-1.5 text-[11px] font-semibold text-primary">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>{item.highlight}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
