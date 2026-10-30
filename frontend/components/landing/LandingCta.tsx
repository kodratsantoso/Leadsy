"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, CheckCircle2, MessageSquare, ShieldCheck } from "lucide-react";

export function LandingCta() {
  return (
    <section className="py-20 md:py-28 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl border border-primary/30 bg-gradient-to-b from-primary/10 via-card to-card/95 p-8 sm:p-12 md:p-16 text-center shadow-2xl overflow-hidden">
          {/* Ambient Glows */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] bg-primary/20 rounded-full blur-[100px] pointer-events-none -z-10" />

          <div className="max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 border border-primary/25 text-xs font-semibold text-primary">
              <Sparkles className="w-3.5 h-3.5" />
              <span>SIAP MEMULAI AKSELERASI REVENUE</span>
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-foreground tracking-tight leading-tight">
              Tinggalkan Spreadsheet Manual. Kualifikasi Prospek B2B dengan Autonomous AI Hari Ini.
            </h2>

            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Tingkatkan kecepatan closing tim sales dan presales Anda dengan pipeline kualifikasi terstandar, integrasi WhatsApp resmi, dan otomasi sinkronisasi data.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-4">
              <Link href="/login" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto h-12 px-8 rounded-xl font-semibold text-base gap-2 shadow-lg shadow-primary/25 bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-150 active:scale-[0.98]"
                >
                  Mulai Akses Platform
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <a
                href="https://wa.me/6281280000000?text=Halo%20Leadsy%20Team%2C%20saya%20tertarik%20konsultasi%20implementasi%20enterprise%20Leadsy."
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto"
              >
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto h-12 px-6 rounded-xl font-medium text-base gap-2 border-border/80 bg-background/60 hover:bg-muted/80 backdrop-blur-sm text-foreground transition-all duration-150 active:scale-[0.98]"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-500" />
                  Konsultasi via WhatsApp
                </Button>
              </a>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 pt-6 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Implementasi On-Premise / Private K3s</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Dukungan WhatsApp BSP &amp; Lark Base</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Persistent Volume SSOT Data Protection</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
