"use client";

import { useState, useEffect } from "react";
import {
  getMyIncentiveSummary,
  getIncentivePools,
  getIncentivePool,
  recalculateIncentivePool,
  approvePoolDept,
  approvePoolFinance,
  previewIncentiveCalculation,
  IncentivePool,
  IncentiveContributor,
} from "@/lib/api/incentives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useAuthStore } from "@/store/useAuthStore";
import {
  Coins,
  Settings,
  Users,
  CheckCircle2,
  Clock,
  Briefcase,
  Layers,
  ArrowUpRight,
  Calculator,
  RefreshCw,
  Eye,
  ShieldCheck,
  Building,
  Loader2,
  FileText,
  Percent,
} from "lucide-react";
import Link from "next/link";

export default function IncentiveHubPage() {
  const user = useAuthStore((state) => state.user);
  const [activeTab, setActiveTab] = useState<"my_incentives" | "department_pools" | "sandbox">("my_incentives");

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [pools, setPools] = useState<IncentivePool[]>([]);
  const [selectedPool, setSelectedPool] = useState<IncentivePool | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Sandbox state
  const [sbGross, setSbGross] = useState<number>(150000000);
  const [sbStream, setSbStream] = useState<"saas" | "professional_service">("professional_service");
  const [sbRate, setSbRate] = useState<number>(3.0);
  const [sbResult, setSbResult] = useState<any>(null);
  const [sbLoading, setSbLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sumData, poolData] = await Promise.all([
        getMyIncentiveSummary().catch(() => null),
        getIncentivePools().catch(() => ({ data: [] })),
      ]);
      setSummary(sumData);
      setPools(poolData?.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPoolDetail = async (id: number) => {
    setDetailLoading(true);
    try {
      const data = await getIncentivePool(id);
      setSelectedPool(data);
    } catch (e) {
      console.error(e);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleRecalculate = async (id: number) => {
    setActionLoading(true);
    try {
      await recalculateIncentivePool(id);
      await handleOpenPoolDetail(id);
      await loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveDept = async (id: number) => {
    setActionLoading(true);
    try {
      await approvePoolDept(id);
      await handleOpenPoolDetail(id);
      await loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveFinance = async (id: number) => {
    setActionLoading(true);
    try {
      await approvePoolFinance(id);
      await handleOpenPoolDetail(id);
      await loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const runSandbox = async () => {
    setSbLoading(true);
    try {
      const res = await previewIncentiveCalculation({
        gross_revenue: sbGross,
        revenue_stream: sbStream,
        pool_rate: sbRate,
        contributors: [
          {
            user_name: "Solution Architect Lead",
            role_title: "Solution Architect",
            contribution_type: "direct",
            role_weight: 1.5,
            effort_units: 3.0,
            performance_multiplier: 1.1,
          },
          {
            user_name: "Primary PS Consultant",
            role_title: "PS Consultant",
            contribution_type: "direct",
            role_weight: 1.2,
            effort_units: 4.0,
            performance_multiplier: 1.0,
          },
          {
            user_name: "Customer Success Lead",
            role_title: "CSM",
            contribution_type: "indirect",
            role_weight: 1.0,
            effort_units: 2.0,
            performance_multiplier: 1.0,
          },
        ],
      });
      setSbResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setSbLoading(false);
    }
  };

  const isManager =
    user?.role?.name?.includes("admin") ||
    user?.role?.name?.includes("manager") ||
    user?.role?.name?.includes("head");

  return (
    <div className="space-y-6 p-6 w-full max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Coins className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Incentive Hub & Revenue Collaboration
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Transparansi alokasi insentif departemen (Sales, SA, CSM, PSC) berbasis kontribusi nyata dan performa tim.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {isManager && (
            <Link href="/settings/incentives">
              <Button size="sm" variant="outline" className="gap-2 text-xs font-semibold">
                <Settings className="h-3.5 w-3.5" />
                Pengaturan Kebijakan Insentif
              </Button>
            </Link>
          )}
          <Button
            size="sm"
            onClick={loadData}
            variant="ghost"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardContent className="p-4 space-y-1">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center justify-between">
              <span>Insentif Saya (Disetujui)</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-xl font-bold text-foreground font-mono">
              Rp {Number(summary?.approved_amount || 0).toLocaleString("id-ID")}
            </div>
            <div className="text-[10px] text-muted-foreground">Siap dicairkan pada siklus payout berikutnya</div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4 space-y-1">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center justify-between">
              <span>Menunggu Approval</span>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-xl font-bold text-amber-600 dark:text-amber-400 font-mono">
              Rp {Number(summary?.pending_amount || 0).toLocaleString("id-ID")}
            </div>
            <div className="text-[10px] text-muted-foreground">Sedang ditinjau oleh Dept Head / Finance</div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4 space-y-1">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center justify-between">
              <span>Partisipasi Proyek / Deal</span>
              <Briefcase className="h-4 w-4 text-primary" />
            </div>
            <div className="text-xl font-bold text-foreground font-mono">
              {summary?.active_participations_count || 0} Proyek
            </div>
            <div className="text-[10px] text-muted-foreground">Kontribusi langsung & tidak langsung aktif</div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4 space-y-1">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center justify-between">
              <span>Total Pool Departemen</span>
              <Layers className="h-4 w-4 text-primary" />
            </div>
            <div className="text-xl font-bold text-foreground font-mono">
              {pools.length} Pool Aktif
            </div>
            <div className="text-[10px] text-muted-foreground">Tercatat di sistem periode berjalan</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-4">
        <button
          type="button"
          onClick={() => setActiveTab("my_incentives")}
          className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "my_incentives"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Coins className="h-4 w-4" />
          Insentif & Kontribusi Saya
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("department_pools")}
          className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "department_pools"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Building className="h-4 w-4" />
          Manajemen Pool Departemen ({pools.length})
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("sandbox");
            if (!sbResult) runSandbox();
          }}
          className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "sandbox"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Calculator className="h-4 w-4" />
          Kalkulator Simulasi
        </button>
      </div>

      {/* TAB 1: My Incentives */}
      {activeTab === "my_incentives" && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground">
              Daftar Kontribusi & Perolehan Insentif Saya
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Transparansi perhitungan berdasarkan peran, mandays kerja nyata, dan multiplier evaluasi kinerja.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {summary?.contributions?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-y border-border bg-muted/40 font-semibold text-muted-foreground">
                      <th className="py-3 px-4 text-left">Nama Proyek / Deal</th>
                      <th className="py-3 px-4 text-left">Tipe Kontribusi</th>
                      <th className="py-3 px-4 text-left">Level & Bobot</th>
                      <th className="py-3 px-4 text-right">Mandays</th>
                      <th className="py-3 px-4 text-right">Multiplier</th>
                      <th className="py-3 px-4 text-right">Skor Kontribusi</th>
                      <th className="py-3 px-4 text-right">Alokasi Rupiah</th>
                      <th className="py-3 px-4 text-center">Status Pool</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {summary.contributions.map((c: any) => (
                      <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4 font-semibold text-foreground">
                          {c.pool?.lead?.company_name || "Lead Proyek"}
                          <span className="block text-[10px] text-muted-foreground font-mono font-normal">
                            SO: {c.pool?.sales_order?.sales_order_number || c.pool?.sales_order?.order_number || "-"}
                          </span>
                        </td>
                        <td className="py-3 px-4 capitalize">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              c.contribution_type === "direct"
                                ? "bg-primary/10 text-primary"
                                : c.contribution_type === "indirect"
                                ? "bg-amber-500/10 text-amber-600"
                                : "bg-emerald-500/10 text-emerald-600"
                            }`}
                          >
                            {c.contribution_type}
                          </span>
                        </td>
                        <td className="py-3 px-4 capitalize">
                          <span className="font-medium text-foreground">{c.contributor_level}</span>
                          <span className="text-muted-foreground ml-1">({c.role_weight}x)</span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono">{c.effort_units} MD</td>
                        <td className="py-3 px-4 text-right font-mono">{c.performance_multiplier}x</td>
                        <td className="py-3 px-4 text-right font-mono font-semibold">{c.contribution_score}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          Rp {Number(c.allocated_amount).toLocaleString("id-ID")}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold capitalize ${
                              c.pool?.status === "approved_finance" || c.pool?.status === "paid"
                                ? "bg-emerald-500/10 text-emerald-600"
                                : c.pool?.status === "approved_dept"
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {c.pool?.status?.replace("_", " ") || "Draft"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenPoolDetail(c.pool_id)}
                            className="h-7 px-2 text-xs gap-1 text-primary hover:text-primary"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Rincian
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
                <Coins className="h-8 w-8 mx-auto text-muted-foreground/50" />
                <p>Belum ada kontribusi insentif yang tercatat atas nama Anda pada periode ini.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 2: Department Pools */}
      {activeTab === "department_pools" && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground">
              Daftar Pool Insentif Departemen
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Kelola status pengesahan pool, kalkulasi ulang, dan rincian kontributor per kesepakatan penjualan.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {pools.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-y border-border bg-muted/40 font-semibold text-muted-foreground">
                      <th className="py-3 px-4 text-left">Kode Pool</th>
                      <th className="py-3 px-4 text-left">Klien / Sales Order</th>
                      <th className="py-3 px-4 text-left">Lini Pendapatan</th>
                      <th className="py-3 px-4 text-right">Pendapatan Bersih (DPP)</th>
                      <th className="py-3 px-4 text-right">Tarif Pool</th>
                      <th className="py-3 px-4 text-right font-bold text-foreground">Total Dana Pool</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {pools.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4 font-mono font-semibold text-primary">
                          {p.pool_code}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-foreground">{p.lead?.company_name || "Lead Proyek"}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            SO: {p.sales_order?.sales_order_number || p.sales_order?.order_number || "-"}
                          </div>
                        </td>
                        <td className="py-3 px-4 capitalize">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-muted text-foreground">
                            {p.revenue_stream?.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          Rp {Number(p.eligible_revenue).toLocaleString("id-ID")}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold">
                          {p.pool_rate_applied}%
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-foreground">
                          Rp {Number(p.total_pool_amount).toLocaleString("id-ID")}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold capitalize ${
                              p.status === "approved_finance" || p.status === "paid"
                                ? "bg-emerald-500/10 text-emerald-600"
                                : p.status === "approved_dept"
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {p.status?.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenPoolDetail(p.id)}
                            className="h-7 px-2.5 text-xs font-semibold gap-1"
                          >
                            <Eye className="h-3 w-3" />
                            Detail Pool
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
                <Layers className="h-8 w-8 mx-auto text-muted-foreground/50" />
                <p>Belum ada data pool insentif yang dihasilkan.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 3: Sandbox Simulator */}
      {activeTab === "sandbox" && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              Kalkulator Simulasi Alokasi Insentif (Sandbox)
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Eksplorasi pembagian dana insentif secara real-time dengan mengubah nilai pendapatan atau tarif komisi.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">Nilai Pendapatan Bruto (Rp):</label>
                <Input
                  type="number"
                  step="5000000"
                  value={sbGross}
                  onChange={(e) => setSbGross(parseFloat(e.target.value) || 0)}
                  className="font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">Lini Pendapatan:</label>
                <select
                  value={sbStream}
                  onChange={(e: any) => {
                    setSbStream(e.target.value);
                    setSbRate(e.target.value === "saas" ? 2.0 : 3.0);
                  }}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground focus:outline-none"
                >
                  <option value="saas">SaaS Recurring Sales (2.0%)</option>
                  <option value="professional_service">Professional Service (3.0%)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">Tarif Pool (%):</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.1"
                    value={sbRate}
                    onChange={(e) => setSbRate(parseFloat(e.target.value) || 0)}
                    className="font-mono text-xs"
                  />
                  <Button size="sm" onClick={runSandbox} disabled={sbLoading} className="text-xs font-semibold">
                    {sbLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Hitung"}
                  </Button>
                </div>
              </div>
            </div>

            {sbResult && (
              <div className="space-y-4 pt-4 border-t border-border">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="rounded-lg bg-muted/40 p-3.5 border border-border">
                    <div className="text-[10px] text-muted-foreground uppercase font-bold">Total Pool (100%)</div>
                    <div className="text-base font-bold text-foreground font-mono mt-1">
                      Rp {Number(sbResult.total_pool).toLocaleString("id-ID")}
                    </div>
                  </div>
                  <div className="rounded-lg bg-primary/10 p-3.5 border border-primary/20">
                    <div className="text-[10px] text-primary uppercase font-bold">Direct Pool (70%)</div>
                    <div className="text-base font-bold text-primary font-mono mt-1">
                      Rp {Number(sbResult.direct_pool).toLocaleString("id-ID")}
                    </div>
                  </div>
                  <div className="rounded-lg bg-amber-500/10 p-3.5 border border-amber-500/20">
                    <div className="text-[10px] text-amber-600 uppercase font-bold">Indirect Pool (20%)</div>
                    <div className="text-base font-bold text-amber-600 font-mono mt-1">
                      Rp {Number(sbResult.indirect_pool).toLocaleString("id-ID")}
                    </div>
                  </div>
                  <div className="rounded-lg bg-emerald-500/10 p-3.5 border border-emerald-500/20">
                    <div className="text-[10px] text-emerald-600 uppercase font-bold">Shared Pool (10%)</div>
                    <div className="text-base font-bold text-emerald-600 font-mono mt-1">
                      Rp {Number(sbResult.shared_pool).toLocaleString("id-ID")}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border overflow-hidden text-xs">
                  <div className="p-3 bg-muted/40 font-semibold text-foreground">
                    Contoh Alokasi ke Kontributor:
                  </div>
                  <table className="w-full">
                    <thead>
                      <tr className="border-y border-border bg-muted/20 text-muted-foreground text-[11px]">
                        <th className="p-2.5 text-left">Nama / Peran</th>
                        <th className="p-2.5 text-left">Tipe</th>
                        <th className="p-2.5 text-right">Bobot</th>
                        <th className="p-2.5 text-right">Mandays</th>
                        <th className="p-2.5 text-right">Multiplier</th>
                        <th className="p-2.5 text-right font-semibold">Skor Akhir</th>
                        <th className="p-2.5 text-right font-bold text-foreground">Alokasi Rupiah</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {sbResult.contributors.map((c: any, i: number) => (
                        <tr key={i} className="hover:bg-muted/10">
                          <td className="p-2.5 font-medium text-foreground">
                            {c.user_name}
                            <span className="block text-[10px] text-muted-foreground">{c.role_title}</span>
                          </td>
                          <td className="p-2.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold capitalize ${
                                c.contribution_type === "direct"
                                  ? "bg-primary/10 text-primary"
                                  : "bg-amber-500/10 text-amber-600"
                              }`}
                            >
                              {c.contribution_type}
                            </span>
                          </td>
                          <td className="p-2.5 text-right font-mono">{c.role_weight}</td>
                          <td className="p-2.5 text-right font-mono">{c.effort_units} MD</td>
                          <td className="p-2.5 text-right font-mono">{c.performance_multiplier}x</td>
                          <td className="p-2.5 text-right font-mono font-semibold">{c.contribution_score}</td>
                          <td className="p-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            Rp {Number(c.allocated_amount).toLocaleString("id-ID")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* POOL DETAIL MODAL / DRAWER */}
      {selectedPool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-4xl rounded-xl border border-border bg-card shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-border p-4 bg-muted/30">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-foreground">Rincian Pool: {selectedPool.pool_code}</h3>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                      selectedPool.status === "approved_finance" || selectedPool.status === "paid"
                        ? "bg-emerald-500/10 text-emerald-600"
                        : selectedPool.status === "approved_dept"
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {selectedPool.status?.replace("_", " ")}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Lead: {selectedPool.lead?.company_name} | Sales Order: {selectedPool.sales_order?.sales_order_number || selectedPool.sales_order?.order_number || "-"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRecalculate(selectedPool.id)}
                  disabled={actionLoading}
                  className="gap-1 text-xs"
                >
                  <RefreshCw className={`h-3 w-3 ${actionLoading ? "animate-spin" : ""}`} />
                  Kalkulasi Ulang
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedPool(null)}
                  className="h-8 w-8 p-0"
                >
                  ✕
                </Button>
              </div>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
              {/* Financial Snapshot */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-lg bg-muted/40 p-3 border border-border">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Pendapatan Bersih (DPP)</span>
                  <div className="text-sm font-bold text-foreground font-mono mt-1">
                    Rp {Number(selectedPool.eligible_revenue).toLocaleString("id-ID")}
                  </div>
                </div>
                <div className="rounded-lg bg-primary/10 p-3 border border-primary/20">
                  <span className="text-[10px] text-primary uppercase font-bold">Total Pool ({selectedPool.pool_rate_applied}%)</span>
                  <div className="text-sm font-bold text-primary font-mono mt-1">
                    Rp {Number(selectedPool.total_pool_amount).toLocaleString("id-ID")}
                  </div>
                </div>
                <div className="rounded-lg bg-muted/40 p-3 border border-border">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Direct Pool</span>
                  <div className="text-sm font-bold text-foreground font-mono mt-1">
                    Rp {Number(selectedPool.direct_pool_amount).toLocaleString("id-ID")}
                  </div>
                </div>
                <div className="rounded-lg bg-muted/40 p-3 border border-border">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Indirect + Shared</span>
                  <div className="text-sm font-bold text-foreground font-mono mt-1">
                    Rp {(Number(selectedPool.indirect_pool_amount) + Number(selectedPool.shared_pool_amount)).toLocaleString("id-ID")}
                  </div>
                </div>
              </div>

              {/* Contributors Table */}
              <div>
                <h4 className="font-semibold text-foreground mb-2 flex items-center justify-between">
                  <span>Daftar Kontributor & Alokasi Pembagian:</span>
                  <span className="text-[11px] text-muted-foreground font-normal">
                    {selectedPool.contributors?.length || 0} orang kontributor
                  </span>
                </h4>

                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/30 text-muted-foreground text-[11px]">
                        <th className="p-2.5 text-left">Nama Kontributor</th>
                        <th className="p-2.5 text-left">Peran & Tipe</th>
                        <th className="p-2.5 text-right">Bobot</th>
                        <th className="p-2.5 text-right">Mandays</th>
                        <th className="p-2.5 text-right">Multiplier</th>
                        <th className="p-2.5 text-right font-semibold">Skor</th>
                        <th className="p-2.5 text-right font-bold text-foreground">Alokasi Rupiah</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {selectedPool.contributors?.map((c) => (
                        <tr key={c.id} className="hover:bg-muted/10">
                          <td className="p-2.5 font-medium text-foreground">
                            {c.user?.name || `User #${c.user_id}`}
                            <span className="block text-[10px] text-muted-foreground">{c.user?.email}</span>
                          </td>
                          <td className="p-2.5">
                            <span className="font-medium text-foreground block capitalize">{c.contributor_level}</span>
                            <span
                              className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase ${
                                c.contribution_type === "direct"
                                  ? "bg-primary/10 text-primary"
                                  : c.contribution_type === "indirect"
                                  ? "bg-amber-500/10 text-amber-600"
                                  : "bg-emerald-500/10 text-emerald-600"
                              }`}
                            >
                              {c.contribution_type}
                            </span>
                          </td>
                          <td className="p-2.5 text-right font-mono">{c.role_weight}</td>
                          <td className="p-2.5 text-right font-mono">{c.effort_units} MD</td>
                          <td className="p-2.5 text-right font-mono">{c.performance_multiplier}x</td>
                          <td className="p-2.5 text-right font-mono font-semibold">{c.contribution_score}</td>
                          <td className="p-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            Rp {Number(c.allocated_amount).toLocaleString("id-ID")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Approval Buttons */}
              <div className="border-t border-border pt-4 flex flex-wrap items-center justify-between gap-3 bg-muted/20 p-4 rounded-xl">
                <div className="space-y-0.5">
                  <div className="font-semibold text-foreground">Status Persetujuan Berjenjang:</div>
                  <div className="text-muted-foreground text-[11px]">
                    Dept Head Approval: {selectedPool.dept_approver ? `Disetujui oleh ${selectedPool.dept_approver.name}` : "Menunggu"} | Finance Approval: {selectedPool.finance_approver ? `Disahkan oleh ${selectedPool.finance_approver.name}` : "Menunggu"}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {selectedPool.status === "draft" && (
                    <Button
                      size="sm"
                      onClick={() => handleApproveDept(selectedPool.id)}
                      disabled={actionLoading}
                      className="text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Setujui (Dept Head)
                    </Button>
                  )}

                  {selectedPool.status === "approved_dept" && (
                    <Button
                      size="sm"
                      onClick={() => handleApproveFinance(selectedPool.id)}
                      disabled={actionLoading}
                      className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Sahkan Pencairan (Finance)
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
