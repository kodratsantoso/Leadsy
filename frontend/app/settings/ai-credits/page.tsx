"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sparkles, Zap, ShieldCheck, ArrowUpRight, CheckCircle2, Loader2, CreditCard, Layers, Bot, Activity, HelpCircle } from "lucide-react";

import { BackToSettings } from "@/app/settings/_components/back-to-settings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/input";
import { apiFetch } from "@/lib/apiFetch";
import { useNumberFormat } from "@/lib/hooks/use-number-format";

type AiCreditResponse = {
  success: boolean;
  data: {
    tenant_name: string;
    plan_name: string;
    credit_balance: number;
    credit_allocated: number;
    credit_used: number;
    usage_percentage: number;
    billing_period: string;
    renewal_date: string;
    breakdown: {
      lead_profiling: number;
      screening_monitor: number;
      sales_copilot: number;
      other_intelligence: number;
    };
    pricing_packages: Array<{
      id: string;
      name: string;
      credits: number;
      price_idr: number;
      popular?: boolean;
      description: string;
    }>;
  };
};

export default function AiCreditsPage() {
  const { formatNumber, formatCurrency } = useNumberFormat();
  const [topUpModalOpen, setTopUpModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string>("pack-20k");
  const [topUpNotes, setTopUpNotes] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const { data: creditsData, isLoading, refetch } = useQuery<AiCreditResponse>({
    queryKey: ["tenant-ai-credits"],
    queryFn: async () => {
      const res = await apiFetch("/api/tenant/ai-credits");
      if (!res.ok) throw new Error("Gagal mengambil data kuota AI");
      return res.json();
    },
  });

  const topUpMutation = useMutation({
    mutationFn: async (payload: { package_id: string; package_name: string; credits_requested: number; notes: string }) => {
      const res = await apiFetch("/api/tenant/ai-credits/top-up-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Gagal mengajukan top-up");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setSuccessMessage(data.message || "Permintaan top-up kuota AI telah diteruskan ke tim billing!");
      setTimeout(() => {
        setTopUpModalOpen(false);
        setSuccessMessage("");
        setTopUpNotes("");
        refetch();
      }, 2500);
    },
  });

  const creditInfo = creditsData?.data ?? {
    tenant_name: "Customer Workspace",
    plan_name: "Enterprise AI Growth",
    credit_balance: 18500,
    credit_allocated: 25000,
    credit_used: 6500,
    usage_percentage: 26.0,
    billing_period: "November 2026",
    renewal_date: "2026-11-30",
    breakdown: {
      lead_profiling: 3200,
      screening_monitor: 1800,
      sales_copilot: 900,
      other_intelligence: 600,
    },
    pricing_packages: [
      {
        id: "pack-5k",
        name: "Starter AI Boost",
        credits: 5000,
        price_idr: 750000,
        description: "Cocok untuk ~50 profiling mendalam dan screening cepat.",
      },
      {
        id: "pack-20k",
        name: "Growth Enterprise Pack",
        credits: 20000,
        price_idr: 2500000,
        popular: true,
        description: "Paling populer untuk tim sales 5-15 personil.",
      },
      {
        id: "pack-50k",
        name: "Scale Pro Volume",
        credits: 50000,
        price_idr: 5500000,
        description: "Kapasitas penuh untuk kampanye prospek masif dan transkrip rapat.",
      },
    ],
  };

  const handleTopUpSubmit = () => {
    const pkg = creditInfo.pricing_packages.find((p) => p.id === selectedPackage);
    if (!pkg) return;
    topUpMutation.mutate({
      package_id: pkg.id,
      package_name: pkg.name,
      credits_requested: pkg.credits,
      notes: topUpNotes,
    });
  };

  return (
    <div className="w-full space-y-6 p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <BackToSettings />
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Zap className="h-6 w-6 text-amber-500" />
            AI Intelligence &amp; Credit Balance
          </h1>
          <p className="text-sm text-muted-foreground">
            Sisa saldo kuota kredit AI untuk workspace Anda. Seluruh model LLM (BytePlus, OpenAI, Claude, Gemini) dikelola terpusat dari SaaS Platform.
          </p>
        </div>

        <Button onClick={() => setTopUpModalOpen(true)} className="gap-2 shadow-sm">
          <Sparkles className="h-4 w-4 text-amber-300" />
          Beli / Top-Up Kuota AI
        </Button>
      </div>

      {/* Main Credit Balance Card */}
      <Card className="overflow-hidden border-border bg-gradient-to-br from-card via-card to-[color:var(--brand-subtle)]/40 shadow-sm">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="brand" className="text-xs px-2.5 py-0.5">
                  {creditInfo.plan_name}
                </Badge>
                <span className="text-xs text-muted-foreground font-mono">
                  Siklus: {creditInfo.billing_period}
                </span>
              </div>

              <div>
                <span className="text-4xl font-extrabold tracking-tight text-foreground">
                  {formatNumber(creditInfo.credit_balance)}
                </span>
                <span className="text-base text-muted-foreground ml-2 font-medium">
                  / {formatNumber(creditInfo.credit_allocated)} Credits Tersisa
                </span>
              </div>

              <p className="text-xs text-muted-foreground">
                Kredit akan diperbarui pada akhir siklus penagihan ({creditInfo.renewal_date}). Kuota digunakan untuk AI Lead Profiling, Screening, dan Sales Copilot.
              </p>
            </div>

            {/* Visual Gauge Bar */}
            <div className="w-full md:w-72 space-y-2 rounded-xl border border-border bg-background/80 p-4 shadow-2xs">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-muted-foreground">Penggunaan Kuota</span>
                <span className="text-foreground font-semibold">{creditInfo.usage_percentage}% Terpakai</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, creditInfo.usage_percentage))}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{formatNumber(creditInfo.credit_used)} dipakai</span>
                <span>{formatNumber(creditInfo.credit_balance)} sisa</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Usage Breakdown */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                AI Lead Profiling
              </CardTitle>
              <div className="rounded-lg bg-blue-500/10 p-1.5 text-blue-500">
                <Layers className="h-4 w-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatNumber(creditInfo.breakdown.lead_profiling)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Riset perusahaan, firma, &amp; firmographics
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                AI Pre-Meeting Screening
              </CardTitle>
              <div className="rounded-lg bg-purple-500/10 p-1.5 text-purple-500">
                <Activity className="h-4 w-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatNumber(creditInfo.breakdown.screening_monitor)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Skrining pra-meeting &amp; rekomendasi produk
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Sales Copilot &amp; Chat
              </CardTitle>
              <div className="rounded-lg bg-emerald-500/10 p-1.5 text-emerald-500">
                <Bot className="h-4 w-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatNumber(creditInfo.breakdown.sales_copilot)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Pertanyaan BANTC, battlecards, &amp; transkrip
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Kecerdasan Dokumen
              </CardTitle>
              <div className="rounded-lg bg-amber-500/10 p-1.5 text-amber-500">
                <Sparkles className="h-4 w-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatNumber(creditInfo.breakdown.other_intelligence)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              ICP scoring &amp; rekomendasi proposal
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Centralized SaaS AI Engine Architecture Notice */}
      <Card className="border-border bg-[color:var(--surface-subtle)]">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-lg bg-[color:var(--brand-subtle)] p-2 text-[color:var(--brand)]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-sm font-semibold text-foreground">
                Infrastruktur AI Dikelola Penuh oleh Leadsy SaaS Engine
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                Workspace tenant Anda tidak perlu mengelola API Key pihak ketiga. Leadsy secara otomatis merutekan tugas kecerdasan buatan ke engine tercepat dan paling efisien (BytePlus ModelArk, OpenAI GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro) dengan jaminan SLA dan keamanan data terisolasi.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 text-xs"
            onClick={() => setTopUpModalOpen(true)}
          >
            Lihat Paket Kuota
          </Button>
        </CardContent>
      </Card>

      {/* Top-Up Kuota AI Modal */}
      <Modal
        open={topUpModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setTopUpModalOpen(false);
            setSuccessMessage("");
          }
        }}
        title="Top-Up Kuota Kredit AI"
        description="Pilih paket penambahan kredit AI untuk workspace Anda. Permintaan akan langsung dikonfirmasi oleh tim billing Leadsy."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setTopUpModalOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={handleTopUpSubmit}
              disabled={topUpMutation.isPending || Boolean(successMessage)}
            >
              {topUpMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Ajukan Permintaan Kuota
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          {successMessage ? (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 p-4 text-sm text-emerald-600 border border-emerald-500/20">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <span>{successMessage}</span>
            </div>
          ) : null}

          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pilih Paket Kuota AI:
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              {creditInfo.pricing_packages.map((pkg) => {
                const isSelected = selectedPackage === pkg.id;
                return (
                  <div
                    key={pkg.id}
                    onClick={() => setSelectedPackage(pkg.id)}
                    className={`relative flex flex-col justify-between rounded-xl border p-4 cursor-pointer transition-all ${
                      isSelected
                        ? "border-[color:var(--brand)] bg-[color:var(--brand-subtle)]/30 ring-2 ring-[color:var(--brand)]/20"
                        : "border-border bg-card hover:border-border/80"
                    }`}
                  >
                    {pkg.popular ? (
                      <span className="absolute -top-2.5 right-3 rounded-full bg-[color:var(--brand)] px-2 py-0.5 text-[10px] font-semibold text-white uppercase tracking-wider">
                        Populer
                      </span>
                    ) : null}

                    <div>
                      <h4 className="text-sm font-semibold text-foreground">{pkg.name}</h4>
                      <p className="text-lg font-bold text-[color:var(--brand)] mt-1">
                        +{formatNumber(pkg.credits)} <span className="text-xs font-normal text-muted-foreground">credits</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                        {pkg.description}
                      </p>
                    </div>

                    <div className="border-t border-border/60 pt-3 mt-4">
                      <span className="text-sm font-bold text-foreground">
                        {formatCurrency(pkg.price_idr)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Catatan / Permintaan Khusus (Opsional):
            </label>
            <Textarea
              rows={2}
              placeholder="Contoh: Butuh aktivasi segera untuk kampanye prospek kuartal 4..."
              value={topUpNotes}
              onChange={(e) => setTopUpNotes(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
