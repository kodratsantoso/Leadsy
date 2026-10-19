import type { Metadata } from "next";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { FutureBackground } from "@/components/landing/FutureBackground";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingMarquee } from "@/components/landing/LandingMarquee";
import { LandingHowItWorks } from "@/components/landing/LandingHowItWorks";
import { LandingBentoFeatures } from "@/components/landing/LandingBentoFeatures";
import { LandingComparison } from "@/components/landing/LandingComparison";
import { LandingSecurity } from "@/components/landing/LandingSecurity";
import { LandingCta } from "@/components/landing/LandingCta";
import { LandingFooter } from "@/components/landing/LandingFooter";

export const metadata: Metadata = {
  title: "Leadsy — Autonomous AI Revenue Intelligence & Deal Discovery",
  description:
    "Platform All-in-One B2B Sales Intelligence & Order-to-Cash. Mengintegrasikan Google Maps Geo-radar, 8-tahap Autonomous AI Screening, Presales Solutions Workspace, dan sinkronisasi resmi WhatsApp & Lark Base.",
  openGraph: {
    title: "Leadsy — Autonomous AI Revenue Intelligence for B2B",
    description:
      "Akselerasi siklus penjualan enterprise dengan pemetaan wilayah geospasial, evaluasi kelayakan BANTC otonom, dan kolaborasi terpadu sales & presales.",
    type: "website",
  },
};

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20 selection:text-primary antialiased overflow-x-hidden">
      {/* Elegant Future Apps Moving Background */}
      <FutureBackground />

      <LandingNavbar />
      <main className="relative z-10 flex-1 flex flex-col">
        <LandingHero />
        <LandingMarquee />
        <LandingHowItWorks />
        <LandingBentoFeatures />
        <LandingComparison />
        <LandingSecurity />
        <LandingCta />
      </main>
      <div className="relative z-10">
        <LandingFooter />
      </div>
    </div>
  );
}
