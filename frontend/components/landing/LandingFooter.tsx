"use client";

import Link from "next/link";
import Image from "next/image";
import { useTheme } from "@/lib/theme-context";
import { Sparkles, Shield, Heart } from "lucide-react";

export function LandingFooter() {
  const { resolved } = useTheme();
  const logoSrc = resolved === "dark" ? "/Leadsy_logo_dark.png" : "/Leadsy_logo_light.png";

  return (
    <footer className="border-t border-border/60 bg-muted/30 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-border/60">
          {/* Brand info (Span 2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="inline-block">
              <Image
                src={logoSrc}
                alt="Leadsy Platform"
                width={140}
                height={40}
                className="h-8 w-auto object-contain"
              />
            </Link>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-sm">
              Platform Autonomous AI Sales Intelligence &amp; Order-to-Cash untuk tim B2B Enterprise. Mengintegrasikan pemetaan wilayah Google Maps, evaluasi multi-LLM 8-tahap, standardisasi solusi presales, dan sinkronisasi real-time WhatsApp &amp; Lark Base.
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Production Version: <strong>Leadsy v2.4 Enterprise</strong></span>
            </div>
          </div>

          {/* Col 1: Fitur & Solusi */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Fitur &amp; Solusi
            </h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <a href="#capabilities" className="hover:text-foreground transition-colors">
                  Geo-Radar Territory Map
                </a>
              </li>
              <li>
                <a href="#pipeline" className="hover:text-foreground transition-colors">
                  8-Stage AI Screening
                </a>
              </li>
              <li>
                <a href="#capabilities" className="hover:text-foreground transition-colors">
                  Presales Estimator
                </a>
              </li>
              <li>
                <a href="#capabilities" className="hover:text-foreground transition-colors">
                  Order-to-Cash Split
                </a>
              </li>
              <li>
                <a href="#capabilities" className="hover:text-foreground transition-colors">
                  Customer Success Health
                </a>
              </li>
            </ul>
          </div>

          {/* Col 2: Ekosistem Integrasi */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Ekosistem Integrasi
            </h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <span className="hover:text-foreground transition-colors cursor-default">
                  Google Maps Platform
                </span>
              </li>
              <li>
                <span className="hover:text-foreground transition-colors cursor-default">
                  Lark Base 2-Way Sync
                </span>
              </li>
              <li>
                <span className="hover:text-foreground transition-colors cursor-default">
                  WhatsApp Business API
                </span>
              </li>
              <li>
                <span className="hover:text-foreground transition-colors cursor-default">
                  Bursa Efek Indonesia (IDX)
                </span>
              </li>
              <li>
                <span className="hover:text-foreground transition-colors cursor-default">
                  Multi-LLM Orchestration
                </span>
              </li>
            </ul>
          </div>

          {/* Col 3: Keamanan & Legal */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Keamanan &amp; Akses
            </h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <a href="#security" className="hover:text-foreground transition-colors">
                  In-Cluster K3s Isolation
                </a>
              </li>
              <li>
                <a href="#security" className="hover:text-foreground transition-colors">
                  Persistent Volume SSOT
                </a>
              </li>
              <li>
                <a href="#security" className="hover:text-foreground transition-colors">
                  Role-Based Access Control
                </a>
              </li>
              <li>
                <Link href="/login" className="hover:text-foreground transition-colors">
                  Portal Masuk Tim
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© 2026 Virtuenet. Hak Cipta Dilindungi Undang-Undang. Leadsy Enterprise Platform.</p>
          <div className="flex items-center gap-1">
            <span>Ditenagai oleh</span>
            <span className="font-semibold text-foreground">Virtuenet Enterprise Ecosystem</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
