"use client";

import { Check, X, ShieldAlert, Sparkles, Zap, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function LandingComparison() {
  const comparisonItems = [
    {
      feature: "Penemuan & Riset Prospek",
      legacy: "Manual searching di Google/LinkedIn, copy-paste satu per satu ke Excel.",
      leadsy: "Autonomous Discovery dengan Google Maps Geo-radar, Emiten IDX, dan Web Crawler.",
    },
    {
      feature: "Kualifikasi Kelayakan Lead",
      legacy: "Hanya berdasarkan asumsi subjektif sales rep, banyak waktu terbuang untuk lead dingin.",
      leadsy: "8-Tahap AI Screening mendalam (Fit, Solvency, Tech Stack, Urgensi) dengan skor BANTC objektif.",
    },
    {
      feature: "Kolaborasi Presales & Solusi",
      legacy: "Presales dihubungi terlambat lewat chat informal tanpa kalkulasi rate-card terstandar.",
      leadsy: "Dedicated Presales Workspace dengan kalkulator estimasi mandiri, rate-card, dan split komisi O2C.",
    },
    {
      feature: "Pemetaan Wilayah (Territory)",
      legacy: "Tidak ada visualisasi spasial; sales kesulitan merencanakan rute kunjungan prospek.",
      leadsy: "Interactive Radar Map dengan filter radius km, deteksi klaster industri, dan navigasi langsung.",
    },
    {
      feature: "Komunikasi WhatsApp",
      legacy: "Tersimpan di nomor pribadi rep; data hilang saat rep resign, tanpa audit trail.",
      leadsy: "Sentralisasi WhatsApp (Mekari Qontak & Local Engine) dengan audit log, template, dan auto-sync.",
    },
    {
      feature: "Sinkronisasi Enterprise",
      legacy: "Data silo terisolasi, export-import CSV berkala yang sering error.",
      leadsy: "Real-time Two-Way Sync ke Lark Base, Webhooks, dan RESTful API berkecepatan tinggi.",
    },
  ];

  return (
    <section id="comparison" className="py-20 md:py-28 relative scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
            <Sparkles className="w-3.5 h-3.5" />
            <span>TRANSFORMASI REVENUE ENTERPRISE</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-foreground tracking-tight">
            Mengapa Tim B2B Beralih dari CRM Konvensional ke Leadsy?
          </h2>
          <p className="text-base text-muted-foreground">
            Bandingkan pendekatan lama yang membebani tim penjualan dengan sistem otomatisasi berbasis AI Leadsy yang berfokus pada kecepatan closing.
          </p>
        </div>

        {/* Comparison Cards / Table */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-5xl mx-auto">
          {/* Legacy CRM / Sheets */}
          <div className="rounded-2xl border border-border/80 bg-muted/20 p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-border/60">
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Cara Konvensional
                </span>
                <h3 className="text-xl font-bold text-foreground mt-0.5">CRM Lama / Spreadsheet</h3>
              </div>
              <div className="w-10 h-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center font-bold">
                <X className="w-5 h-5" />
              </div>
            </div>

            <div className="space-y-5">
              {comparisonItems.map((item, idx) => (
                <div key={idx} className="space-y-1.5 text-xs sm:text-sm">
                  <div className="font-semibold text-foreground/80 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-destructive/60" />
                    {item.feature}
                  </div>
                  <p className="text-muted-foreground pl-3.5 leading-relaxed text-xs">
                    {item.legacy}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Leadsy Intelligent Platform */}
          <div className="relative rounded-2xl border-2 border-primary/40 bg-card p-6 sm:p-8 space-y-6 shadow-xl shadow-primary/5">
            {/* Top Recommended Tag */}
            <div className="absolute -top-3.5 right-6 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider shadow-sm">
              Modern Enterprise Standard
            </div>

            <div className="flex items-center justify-between pb-4 border-b border-border/60">
              <div>
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                  Leadsy Platform
                </span>
                <h3 className="text-xl font-bold text-foreground mt-0.5">Autonomous AI Revenue Engine</h3>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                <Check className="w-5 h-5" />
              </div>
            </div>

            <div className="space-y-5">
              {comparisonItems.map((item, idx) => (
                <div key={idx} className="space-y-1.5 text-xs sm:text-sm">
                  <div className="font-semibold text-foreground flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="text-foreground">{item.feature}</span>
                  </div>
                  <p className="text-muted-foreground pl-5 leading-relaxed text-xs">
                    {item.leadsy}
                  </p>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-border/60">
              <Link href="/login" className="w-full block">
                <Button className="w-full h-11 rounded-xl font-semibold gap-2 shadow-md shadow-primary/25 bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-150 active:scale-[0.98]">
                  Coba Leadsy Sekarang
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
