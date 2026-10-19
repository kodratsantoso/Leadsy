"use client";

import {
  ShieldCheck,
  Lock,
  Database,
  Server,
  KeyRound,
  FileCheck,
  CheckCircle2,
  HardDrive
} from "lucide-react";

export function LandingSecurity() {
  const securityFeatures = [
    {
      icon: Server,
      title: "In-Cluster K3s Architecture",
      desc: "Infrastruktur orkestrasi kontainer on-premise / private cloud tanpa ketergantungan vendor eksternal, menjamin kedaulatan data perusahaan.",
    },
    {
      icon: Database,
      title: "Persistent Volume (PV) SSOT",
      desc: "Penyimpanan data operasional permanen pada persistent storage terisolasi dengan snapshot backup berkala untuk mencegah kehilangan data.",
    },
    {
      icon: ShieldCheck,
      title: "Granular RBAC (40+ Tokens)",
      desc: "Kontrol akses bertingkat membatasi visibilitas data sensitif antara Sales Rep, Presales Solutions, Account Manager, dan Super Admin.",
    },
    {
      icon: KeyRound,
      title: "Enterprise 2FA & TOTP Auth",
      desc: "Keamanan ganda autentikasi menggunakan Two-Factor Authentication berbasis aplikasi Authenticator (TOTP) dan validasi kode OTP.",
    },
    {
      icon: Lock,
      title: "AES-256 Credential Encryption",
      desc: "Kredensial integrasi pihak ketiga (Google Maps, Lark, WhatsApp, AI API) terenkripsi di level database dengan kunci aman terisolasi.",
    },
    {
      icon: FileCheck,
      title: "Tamper-Evident Audit Logging",
      desc: "Seluruh aktivitas perubahan data lead, penghitungan komisi, dan ekspor riwayat tercatat dalam log audit transparan yang tidak dapat dimanipulasi.",
    },
  ];

  return (
    <section id="security" className="py-20 md:py-28 bg-muted/20 border-y border-border/40 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>ENTERPRISE-GRADE SECURITY &amp; COMPLIANCE</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-foreground tracking-tight">
            Keamanan, Kepatuhan, &amp; Ketahanan Data Tingkat Korporasi
          </h2>
          <p className="text-base text-muted-foreground">
            Dibangun dengan standar keamanan industri untuk melindungi aset data prospek, kerahasiaan negosiasi deal, dan kredensial bisnis Anda.
          </p>
        </div>

        {/* 6 Security Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {securityFeatures.map((item, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-border/70 bg-card p-6 space-y-3 hover:border-primary/40 transition-colors shadow-sm"
            >
              <div className="p-3 rounded-xl bg-primary/10 text-primary border border-primary/20 w-fit">
                <item.icon className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">{item.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
