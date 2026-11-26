"use client";

import { useState, useEffect, useMemo } from "react";
import {
  getIncentiveSettings,
  updateIncentiveSettings,
  previewIncentiveCalculation,
  IncentivePolicy,
  RoleIncentiveSetting,
} from "@/lib/api/incentives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { BackToSettings } from "@/app/settings/_components/back-to-settings";
import {
  Coins,
  Save,
  Loader2,
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Calculator,
  Sliders,
  Sparkles,
  ExternalLink,
  Info,
  Clock,
  Eye,
  Building,
  Check,
} from "lucide-react";
import Link from "next/link";

export default function IncentiveSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [policy, setPolicy] = useState<IncentivePolicy | null>(null);
  const [roleSettings, setRoleSettings] = useState<RoleIncentiveSetting[]>([]);
  const [activeTab, setActiveTab] = useState<
    "roles" | "splits" | "revenue" | "effort" | "roster" | "governance"
  >("roles");

  // Simulation State
  const [showSimModal, setShowSimModal] = useState(false);
  const [simGross, setSimGross] = useState<number>(100000000);
  const [simStream, setSimStream] = useState<"saas" | "professional_service">("professional_service");
  const [simRate, setSimRate] = useState<number>(3.0);
  const [simResult, setSimResult] = useState<any>(null);
  const [simLoading, setSimLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await getIncentiveSettings();
      setPolicy(data.policy);
      setRoleSettings(data.role_settings || []);
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal memuat pengaturan");
    } finally {
      setLoading(false);
    }
  };

  const totalAllocation = useMemo(() => {
    if (!policy) return 0;
    const direct = parseFloat(String(policy.direct_allocation_percentage)) || 0;
    const indirect = parseFloat(String(policy.indirect_allocation_percentage)) || 0;
    const shared = parseFloat(String(policy.shared_allocation_percentage)) || 0;
    return Math.round((direct + indirect + shared) * 100) / 100;
  }, [policy]);

  const isAllocationValid = totalAllocation === 100.0;

  const handlePolicyChange = (field: keyof IncentivePolicy, value: any) => {
    if (!policy) return;
    setPolicy({
      ...policy,
      [field]: value,
    });
  };

  const handleRoleSettingChange = (index: number, field: keyof RoleIncentiveSetting, value: any) => {
    const updated = [...roleSettings];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setRoleSettings(updated);
  };

  const handleSave = async () => {
    if (!policy) return;
    if (!isAllocationValid) {
      setErrorMessage(`Total pembagian alokasi pool harus tepat 100.00% (Saat ini: ${totalAllocation}%).`);
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      const payload = {
        ...policy,
        role_settings: roleSettings.map((rs) => ({
          role_id: rs.role_id,
          is_eligible: rs.is_eligible,
          saas_rate: parseFloat(String(rs.saas_rate)) || 0,
          ps_rate: parseFloat(String(rs.ps_rate)) || 0,
          allocation_mode: rs.allocation_mode,
          default_contributor_level: rs.default_contributor_level,
        })),
      };

      const res = await updateIncentiveSettings(payload);
      if (res?.data) {
        setPolicy(res.data.policy);
        setRoleSettings(res.data.role_settings || []);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal menyimpan perubahan");
    } finally {
      setSaving(false);
    }
  };

  const runSimulation = async () => {
    setSimLoading(true);
    try {
      const res = await previewIncentiveCalculation({
        gross_revenue: simGross,
        revenue_stream: simStream,
        pool_rate: simRate,
        direct_allocation_percentage: policy?.direct_allocation_percentage,
        indirect_allocation_percentage: policy?.indirect_allocation_percentage,
        shared_allocation_percentage: policy?.shared_allocation_percentage,
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
            user_name: "Senior PS Consultant",
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
      setSimResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setSimLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="p-6 text-center text-sm text-destructive">
        Gagal memuat kebijakan insentif. Silakan segarkan halaman.
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 w-full max-w-7xl mx-auto">
      {/* Header Bar */}
      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
          <div className="space-y-1">
            <BackToSettings />
            <div className="flex items-center gap-2 pt-1">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Coins className="h-5 w-5" />
              </div>
              <CardTitle className="text-xl font-bold tracking-tight text-foreground">
                Collaborative Incentive Policy & Governance
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Kelola matriks tarif peran (Sales, SA, CSM, PSC), rasio pool (70/20/10), standar effort, alur persetujuan, dan privasi tim.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setShowSimModal(true);
                runSimulation();
              }}
              className="gap-2 text-xs font-semibold"
            >
              <Calculator className="h-4 w-4 text-primary" />
              Simulasi Real-Time
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving || !isAllocationValid}
              size="sm"
              className="gap-2 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Simpan Perubahan
            </Button>
          </div>
        </CardHeader>

        {/* Allocation Balance Indicator */}
        <div className="border-t border-border px-6 py-2.5 bg-muted/30 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">Status Alokasi Pool (70/20/10):</span>
            {isAllocationValid ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Total Alokasi 100.00% (Seimbang)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 font-semibold text-rose-600 dark:text-rose-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                Tidak Seimbang: {totalAllocation}% (Harus tepat 100.00%)
              </span>
            )}
          </div>

          {saveSuccess && (
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 animate-in fade-in">
              <Check className="h-3.5 w-3.5" /> Perubahan berhasil disimpan ke database!
            </span>
          )}

          {errorMessage && (
            <span className="font-semibold text-rose-600 dark:text-rose-400">
              {errorMessage}
            </span>
          )}
        </div>
      </Card>

      {/* Tab Navigation */}
      <div className="flex border-b border-border overflow-x-auto gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("roles")}
          className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "roles"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="h-4 w-4" />
          1. Tarif Peran & Lini Pendapatan
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("splits")}
          className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "splits"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Sliders className="h-4 w-4" />
          2. Komposisi Pool (70/20/10) & Bobot
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("revenue")}
          className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "revenue"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Coins className="h-4 w-4" />
          3. Basis Pendapatan & Pemicu
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("effort")}
          className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "effort"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Clock className="h-4 w-4" />
          4. Standar Pengukuran Effort
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("roster")}
          className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "roster"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Building className="h-4 w-4" />
          5. Roster & Aturan Karyawan
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("governance")}
          className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "governance"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          6. Approval, Payout & Privasi
        </button>
      </div>

      {/* TAB 1: Role Incentive Matrix */}
      {activeTab === "roles" && (
        <Card className="border-border">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-semibold text-foreground">
                  Matriks Tarif Insentif Berdasarkan Master Role
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Role diambil otomatis dari <span className="font-semibold text-foreground">User & Role</span>. Tidak ada data silo—semua peran organisasi terintegrasi utuh.
                </CardDescription>
              </div>
              <Link
                href="/settings/users"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                Kelola Master Role di User & Role <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-y border-border bg-muted/40 font-semibold text-muted-foreground">
                    <th className="py-3 px-4 text-left">Nama Peran (Master Role)</th>
                    <th className="py-3 px-4 text-center">Hak Insentif</th>
                    <th className="py-3 px-4 text-left">Alokasi SaaS Sales (%)</th>
                    <th className="py-3 px-4 text-left">Alokasi PS (%)</th>
                    <th className="py-3 px-4 text-left">Model Penyaluran</th>
                    <th className="py-3 px-4 text-left">Default Level Kontribusi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {roleSettings.map((rs, idx) => (
                    <tr
                      key={rs.id || rs.role_id}
                      className={`transition-colors hover:bg-muted/30 ${
                        !rs.is_eligible ? "opacity-60 bg-muted/10" : ""
                      }`}
                    >
                      <td className="py-3 px-4 font-semibold text-foreground">
                        <div>{rs.role?.display_name || rs.role?.name || `Role #${rs.role_id}`}</div>
                        <div className="text-[10px] text-muted-foreground font-mono font-normal">
                          slug: {rs.role?.name}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={rs.is_eligible}
                            onChange={(e) =>
                              handleRoleSettingChange(idx, "is_eligible", e.target.checked)
                            }
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 w-28">
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            disabled={!rs.is_eligible}
                            value={rs.saas_rate}
                            onChange={(e) =>
                              handleRoleSettingChange(idx, "saas_rate", e.target.value)
                            }
                            className="h-8 text-xs font-mono"
                          />
                          <span className="text-muted-foreground">%</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 w-28">
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            disabled={!rs.is_eligible}
                            value={rs.ps_rate}
                            onChange={(e) =>
                              handleRoleSettingChange(idx, "ps_rate", e.target.value)
                            }
                            className="h-8 text-xs font-mono"
                          />
                          <span className="text-muted-foreground">%</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <select
                          disabled={!rs.is_eligible}
                          value={rs.allocation_mode}
                          onChange={(e) =>
                            handleRoleSettingChange(idx, "allocation_mode", e.target.value)
                          }
                          className="h-8 rounded-md border border-input bg-background px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-40"
                        >
                          <option value="collaborative_pool">Pool Kolaboratif</option>
                          <option value="direct_individual">Komisi Langsung Individu</option>
                        </select>
                      </td>

                      <td className="py-3 px-4">
                        <select
                          disabled={!rs.is_eligible}
                          value={rs.default_contributor_level}
                          onChange={(e) =>
                            handleRoleSettingChange(idx, "default_contributor_level", e.target.value)
                          }
                          className="h-8 rounded-md border border-input bg-background px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-36"
                        >
                          <option value="lead">Project Lead (1.5x)</option>
                          <option value="core">Core Contributor (1.2x)</option>
                          <option value="supporting">Supporting (1.0x)</option>
                          <option value="minor">Minor Contributor (0.5x)</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-muted/20 border-t border-border flex items-start gap-2.5 text-xs text-muted-foreground">
              <Info className="h-4 w-4 shrink-0 text-primary mt-0.5" />
              <div>
                <span className="font-semibold text-foreground">Catatan Arsitektur:</span> Jika memilih{" "}
                <span className="font-medium text-foreground">"Pool Kolaboratif"</span>, nominal insentif
                peran ini digabungkan ke dalam Department Pool dan dibagikan secara meritokratis (70% Direct / 20% Indirect / 10% Shared). Jika memilih{" "}
                <span className="font-medium text-foreground">"Komisi Langsung Individu"</span> (seperti Sales Rep), komisi dibayarkan 100% langsung kepada rep tanpa di-pool.
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB 2: Pool Splits & Weights */}
      {activeTab === "splits" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-foreground">
                Rasio Alokasi Pool Departemen (70 / 20 / 10)
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Atur proporsi pembagian total pool departemen. Total ketiga elemen wajib tepat 100.00%.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span className="text-foreground">1. Kontribusi Langsung (Direct Contribution)</span>
                  <span className="text-primary font-mono">{policy.direct_allocation_percentage}%</span>
                </div>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  value={policy.direct_allocation_percentage}
                  onChange={(e) =>
                    handlePolicyChange("direct_allocation_percentage", parseFloat(e.target.value) || 0)
                  }
                  className="font-mono text-xs"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Untuk tim yang terlibat langsung dalam eksekusi teknis, proposal, demo, atau implementasi primer.
                </p>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span className="text-foreground">2. Kontribusi Tidak Langsung (Indirect Contribution)</span>
                  <span className="text-primary font-mono">{policy.indirect_allocation_percentage}%</span>
                </div>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  value={policy.indirect_allocation_percentage}
                  onChange={(e) =>
                    handlePolicyChange("indirect_allocation_percentage", parseFloat(e.target.value) || 0)
                  }
                  className="font-mono text-xs"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Untuk aktivitas pendukung: bantuan teknis ad-hoc, review arsitektur, asistensi UAT, dan backup resource.
                </p>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span className="text-foreground">3. Pool Bersama Departemen (Shared Department Pool)</span>
                  <span className="text-primary font-mono">{policy.shared_allocation_percentage}%</span>
                </div>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  value={policy.shared_allocation_percentage}
                  onChange={(e) =>
                    handlePolicyChange("shared_allocation_percentage", parseFloat(e.target.value) || 0)
                  }
                  className="font-mono text-xs"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Dibagikan rata kepada seluruh anggota departemen yang sah dalam periode tersebut demi kebersamaan tim.
                </p>
              </div>

              <div className="pt-2 border-t border-border">
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  Logika Pengecualian (Fallback jika Nol Kontributor Tidak Langsung):
                </label>
                <select
                  value={policy.exception_fallback_indirect}
                  onChange={(e) =>
                    handlePolicyChange("exception_fallback_indirect", e.target.value)
                  }
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="redirect_to_direct">
                    Alihkan porsi 20% ke Kontributor Langsung (Direct Pool = 90%)
                  </option>
                  <option value="redirect_to_shared">
                    Alihkan porsi 20% ke Pool Bersama Departemen (Shared Pool = 30%)
                  </option>
                  <option value="halt_review">Tahan Perhitungan & Minta Tinjauan Manajemen</option>
                </select>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-foreground">
                Bobot Tingkat Peran & Pengali Kinerja
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Formula: <span className="font-mono text-foreground">Skor = Bobot Peran × Mandays × Multiplier Kinerja</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-border p-3.5 space-y-3 bg-muted/10">
                <div className="text-xs font-semibold text-foreground">Bobot Tingkat Peran (Role Weights):</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Project Lead:</span>
                    <Input
                      type="number"
                      step="0.05"
                      value={policy.role_weights_json?.lead ?? 1.5}
                      onChange={(e) => {
                        const rw = { ...policy.role_weights_json, lead: parseFloat(e.target.value) || 1.5 };
                        handlePolicyChange("role_weights_json", rw);
                      }}
                      className="h-8 text-xs font-mono mt-1"
                    />
                  </div>
                  <div>
                    <span className="text-muted-foreground">Core Contributor:</span>
                    <Input
                      type="number"
                      step="0.05"
                      value={policy.role_weights_json?.core ?? 1.2}
                      onChange={(e) => {
                        const rw = { ...policy.role_weights_json, core: parseFloat(e.target.value) || 1.2 };
                        handlePolicyChange("role_weights_json", rw);
                      }}
                      className="h-8 text-xs font-mono mt-1"
                    />
                  </div>
                  <div>
                    <span className="text-muted-foreground">Supporting:</span>
                    <Input
                      type="number"
                      step="0.05"
                      value={policy.role_weights_json?.supporting ?? 1.0}
                      onChange={(e) => {
                        const rw = { ...policy.role_weights_json, supporting: parseFloat(e.target.value) || 1.0 };
                        handlePolicyChange("role_weights_json", rw);
                      }}
                      className="h-8 text-xs font-mono mt-1"
                    />
                  </div>
                  <div>
                    <span className="text-muted-foreground">Minor Contributor:</span>
                    <Input
                      type="number"
                      step="0.05"
                      value={policy.role_weights_json?.minor ?? 0.5}
                      onChange={(e) => {
                        const rw = { ...policy.role_weights_json, minor: parseFloat(e.target.value) || 0.5 };
                        handlePolicyChange("role_weights_json", rw);
                      }}
                      className="h-8 text-xs font-mono mt-1"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border p-3.5 space-y-3 bg-muted/10">
                <div className="text-xs font-semibold text-foreground">Pengali Kinerja (Performance Multipliers):</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Below Expectation:</span>
                    <Input
                      type="number"
                      step="0.05"
                      value={policy.performance_multipliers_json?.below ?? 0.8}
                      onChange={(e) => {
                        const pm = { ...policy.performance_multipliers_json, below: parseFloat(e.target.value) || 0.8 };
                        handlePolicyChange("performance_multipliers_json", pm);
                      }}
                      className="h-8 text-xs font-mono mt-1"
                    />
                  </div>
                  <div>
                    <span className="text-muted-foreground">Meets Expectation:</span>
                    <Input
                      type="number"
                      step="0.05"
                      value={policy.performance_multipliers_json?.meets ?? 1.0}
                      onChange={(e) => {
                        const pm = { ...policy.performance_multipliers_json, meets: parseFloat(e.target.value) || 1.0 };
                        handlePolicyChange("performance_multipliers_json", pm);
                      }}
                      className="h-8 text-xs font-mono mt-1"
                    />
                  </div>
                  <div>
                    <span className="text-muted-foreground">Exceeds Expectation:</span>
                    <Input
                      type="number"
                      step="0.05"
                      value={policy.performance_multipliers_json?.exceeds ?? 1.1}
                      onChange={(e) => {
                        const pm = { ...policy.performance_multipliers_json, exceeds: parseFloat(e.target.value) || 1.1 };
                        handlePolicyChange("performance_multipliers_json", pm);
                      }}
                      className="h-8 text-xs font-mono mt-1"
                    />
                  </div>
                  <div>
                    <span className="text-muted-foreground">Outstanding:</span>
                    <Input
                      type="number"
                      step="0.05"
                      value={policy.performance_multipliers_json?.outstanding ?? 1.2}
                      onChange={(e) => {
                        const pm = { ...policy.performance_multipliers_json, outstanding: parseFloat(e.target.value) || 1.2 };
                        handlePolicyChange("performance_multipliers_json", pm);
                      }}
                      className="h-8 text-xs font-mono mt-1"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: Revenue Basis & Triggers */}
      {activeTab === "revenue" && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground">
              Basis Pengakuan Pendapatan & Pengurangan Pajak
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Tentukan kapan pool insentif dihasilkan dan bagaimana komponen pajak/diskon diperlakukan.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-2">
                Pemicu Perhitungan Pendapatan (Revenue Trigger):
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div
                  onClick={() => handlePolicyChange("revenue_trigger", "cash_collection")}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    policy.revenue_trigger === "cash_collection"
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-xs text-foreground">Cash Collection (Kas Masuk)</span>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded font-semibold">
                      Direkomendasikan
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Pool baru dihitung setelah pembayaran dari klien benar-benar masuk dan tercatat di invoice komersial. Paling aman bagi arus kas perusahaan.
                  </p>
                </div>

                <div
                  onClick={() => handlePolicyChange("revenue_trigger", "invoiced_dpp")}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    policy.revenue_trigger === "invoiced_dpp"
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="font-semibold text-xs text-foreground mb-1.5">Invoiced DPP (Faktur Diterbitkan)</div>
                  <p className="text-[11px] text-muted-foreground">
                    Pool dihitung saat Commercial Invoice resmi diterbitkan kepada klien berdasarkan Nilai DPP (sebelum PPN).
                  </p>
                </div>

                <div
                  onClick={() => handlePolicyChange("revenue_trigger", "sales_order_confirmed")}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    policy.revenue_trigger === "sales_order_confirmed"
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="font-semibold text-xs text-foreground mb-1.5">Sales Order Confirmed (Booking)</div>
                  <p className="text-[11px] text-muted-foreground">
                    Pool langsung di-draft saat Sales Order disahkan. Memberikan motivasi penjualan cepat tetapi mengandung risiko jika klien gagal bayar.
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <label className="text-xs font-semibold text-foreground block mb-2">
                Pembersihan Komponen Finansial dari Nilai Bruto:
              </label>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={policy.exclude_vat}
                    onChange={(e) => handlePolicyChange("exclude_vat", e.target.checked)}
                    className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                  />
                  <div>
                    <div className="text-xs font-semibold text-foreground">Keluarkan PPN 11% (Gunakan DPP Murni)</div>
                    <div className="text-[11px] text-muted-foreground">
                      Insentif hanya dihitung dari nilai bersih Dasar Pengenaan Pajak, tidak mengenakan komisi atas uang pajak negara.
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={policy.exclude_discount}
                    onChange={(e) => handlePolicyChange("exclude_discount", e.target.checked)}
                    className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                  />
                  <div>
                    <div className="text-xs font-semibold text-foreground">Potong Diskon & Rabat Terlebih Dahulu</div>
                    <div className="text-[11px] text-muted-foreground">
                      Nilai diskon yang disetujui mengurangi basis eligible revenue sebelum pool dihitung.
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={policy.exclude_pass_through_cost}
                    onChange={(e) => handlePolicyChange("exclude_pass_through_cost", e.target.checked)}
                    className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                  />
                  <div>
                    <div className="text-xs font-semibold text-foreground">Keluarkan Biaya Pihak Ketiga (Pass-Through Costs)</div>
                    <div className="text-[11px] text-muted-foreground">
                      Biaya lisensi pihak ketiga atau sewa server pihak ketiga dikeluarkan dari basis komisi departemen.
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB 4: Effort Measurement Standards */}
      {activeTab === "effort" && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground">
              Standar Pengukuran Effort (Jam Kerja & Mandays)
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Konfigurasi bagaimana jam kerja dihitung dan divalidasi untuk tim PSC, SA, dan CSM.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  Standar Satuan Kerja (1 Manday = X Jam):
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.5"
                    min="1"
                    max="24"
                    value={policy.hours_per_manday}
                    onChange={(e) => handlePolicyChange("hours_per_manday", parseFloat(e.target.value) || 8)}
                    className="font-mono text-xs w-32"
                  />
                  <span className="text-xs text-muted-foreground">Jam Kerja / Hari</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  Sumber Effort Professional Service (PSC):
                </label>
                <select
                  value={policy.ps_effort_source}
                  onChange={(e) => handlePolicyChange("ps_effort_source", e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="ps_work_log">Tersinkronisasi Otomatis dari Timesheet Proyek (PsWorkLog)</option>
                  <option value="timesheet">Input Mandays Manual per Periode</option>
                </select>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <label className="text-xs font-semibold text-foreground block mb-2">
                Bobot Manday Standar Otomatis untuk SA & CSM (Bebas Beban Timesheet Harian):
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="rounded-lg border border-border p-3">
                  <span className="text-muted-foreground font-medium block mb-1">Dokumen Desain Solusi:</span>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      step="0.5"
                      value={policy.milestone_effort_weights_json?.solution_design ?? 2.0}
                      onChange={(e) => {
                        const mew = {
                          ...policy.milestone_effort_weights_json,
                          solution_design: parseFloat(e.target.value) || 2.0,
                        };
                        handlePolicyChange("milestone_effort_weights_json", mew);
                      }}
                      className="h-8 text-xs font-mono"
                    />
                    <span className="text-muted-foreground">MD</span>
                  </div>
                </div>

                <div className="rounded-lg border border-border p-3">
                  <span className="text-muted-foreground font-medium block mb-1">Demo Teknis & Presentasi:</span>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      step="0.1"
                      value={policy.milestone_effort_weights_json?.technical_demo ?? 0.5}
                      onChange={(e) => {
                        const mew = {
                          ...policy.milestone_effort_weights_json,
                          technical_demo: parseFloat(e.target.value) || 0.5,
                        };
                        handlePolicyChange("milestone_effort_weights_json", mew);
                      }}
                      className="h-8 text-xs font-mono"
                    />
                    <span className="text-muted-foreground">MD</span>
                  </div>
                </div>

                <div className="rounded-lg border border-border p-3">
                  <span className="text-muted-foreground font-medium block mb-1">Proof-of-Concept (PoC):</span>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      step="0.5"
                      value={policy.milestone_effort_weights_json?.proof_of_concept ?? 3.0}
                      onChange={(e) => {
                        const mew = {
                          ...policy.milestone_effort_weights_json,
                          proof_of_concept: parseFloat(e.target.value) || 3.0,
                        };
                        handlePolicyChange("milestone_effort_weights_json", mew);
                      }}
                      className="h-8 text-xs font-mono"
                    />
                    <span className="text-muted-foreground">MD</span>
                  </div>
                </div>

                <div className="rounded-lg border border-border p-3">
                  <span className="text-muted-foreground font-medium block mb-1">Penyusunan Proposal & SOW:</span>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      step="0.5"
                      value={policy.milestone_effort_weights_json?.proposal_scope ?? 1.0}
                      onChange={(e) => {
                        const mew = {
                          ...policy.milestone_effort_weights_json,
                          proposal_scope: parseFloat(e.target.value) || 1.0,
                        };
                        handlePolicyChange("milestone_effort_weights_json", mew);
                      }}
                      className="h-8 text-xs font-mono"
                    />
                    <span className="text-muted-foreground">MD</span>
                  </div>
                </div>

                <div className="rounded-lg border border-border p-3">
                  <span className="text-muted-foreground font-medium block mb-1">Closing Kontrak / CSM Renewal:</span>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      step="0.5"
                      value={policy.milestone_effort_weights_json?.csm_renewal ?? 2.0}
                      onChange={(e) => {
                        const mew = {
                          ...policy.milestone_effort_weights_json,
                          csm_renewal: parseFloat(e.target.value) || 2.0,
                        };
                        handlePolicyChange("milestone_effort_weights_json", mew);
                      }}
                      className="h-8 text-xs font-mono"
                    />
                    <span className="text-muted-foreground">MD</span>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={policy.allow_manager_effort_override}
                    onChange={(e) =>
                      handlePolicyChange("allow_manager_effort_override", e.target.checked)
                    }
                    className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                  />
                  <div>
                    <div className="text-xs font-semibold text-foreground">
                      Izinkan Penyesuaian Manual (*Override*) oleh Department Head
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Memberikan wewenang kepada manajer untuk menyesuaikan mandays jika proyek menghadapi tingkat kompleksitas tak terduga.
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB 5: Roster & Joiner/Leaver Policy */}
      {activeTab === "roster" && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground">
              Aturan Pool Bersama 10% & Karyawan Masuk/Keluar (Joiner / Leaver)
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Aturan kelayakan pembagian rata pool bersama 10% kepada seluruh anggota departemen.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-2">
                Metode Perhitungan Hak Karyawan Masuk / Keluar (Joiner & Leaver Policy):
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div
                  onClick={() => handlePolicyChange("joiner_leaver_policy", "prorata_calendar_days")}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    policy.joiner_leaver_policy === "prorata_calendar_days"
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="font-semibold text-foreground mb-1">Prorata Hari Kalender Aktif (Direkomendasikan)</div>
                  <p className="text-[11px] text-muted-foreground">
                    Karyawan yang baru bergabung atau mengundurkan diri menerima bagian yang dihitung proporsional terhadap jumlah hari aktif bekerja dalam bulan/kuartal tersebut.
                  </p>
                </div>

                <div
                  onClick={() => handlePolicyChange("joiner_leaver_policy", "cutoff_date")}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    policy.joiner_leaver_policy === "cutoff_date"
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="font-semibold text-foreground mb-1">Tanggal Cut-Off Akhir Periode</div>
                  <p className="text-[11px] text-muted-foreground">
                    Hanya karyawan yang masih berstatus aktif pada hari kerja terakhir periode perhitungan yang berhak menerima alokasi bersama.
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={policy.exclude_probation}
                  onChange={(e) => handlePolicyChange("exclude_probation", e.target.checked)}
                  className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                />
                <div>
                  <div className="text-xs font-semibold text-foreground">
                    Kecualikan Karyawan Masa Percobaan (Probation)
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Karyawan baru dalam masa probation tidak disertakan dalam pembagian 10% pool bersama hingga lulus menjadi karyawan tetap.
                  </div>
                </div>
              </label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB 6: Governance, Approval & Privacy */}
      {activeTab === "governance" && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground">
              Tata Kelola Approval, Siklus Bayar & Privasi Data
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Aturan hierarki persetujuan, frekuensi pencairan, dan batasan visibilitas gaji antar anggota tim.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-2">
                Siklus Pembayaran Insentif (Payout Frequency):
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div
                  onClick={() => handlePolicyChange("payout_cycle", "monthly")}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    policy.payout_cycle === "monthly"
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="font-semibold text-foreground mb-1">Bulanan (Monthly)</div>
                  <p className="text-[11px] text-muted-foreground">
                    Direkonsiliasi dan dicairkan setiap bulan bersamaan dengan siklus penggajian rutin.
                  </p>
                </div>

                <div
                  onClick={() => handlePolicyChange("payout_cycle", "quarterly")}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    policy.payout_cycle === "quarterly"
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="font-semibold text-foreground mb-1">Kuartalan (Quarterly)</div>
                  <p className="text-[11px] text-muted-foreground">
                    Diakumulasikan per kuartal (Q1, Q2, Q3, Q4) untuk meratakan fluktuasi siklus proyek panjang.
                  </p>
                </div>

                <div
                  onClick={() => handlePolicyChange("payout_cycle", "milestone")}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    policy.payout_cycle === "milestone"
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="font-semibold text-foreground mb-1">Per Milestone / BAST Selesai</div>
                  <p className="text-[11px] text-muted-foreground">
                    Dicairkan segera setiap kali suatu tahapan milestone atau BAST telah disetujui klien.
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <label className="text-xs font-semibold text-foreground block mb-2">
                Tingkat Transparansi Data Karyawan (Data Privacy Level):
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div
                  onClick={() => handlePolicyChange("privacy_mode", "individual_only")}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    policy.privacy_mode === "individual_only"
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-semibold text-foreground mb-1">
                    <Eye className="h-4 w-4 text-primary" />
                    Transparansi Parsial (Direkomendasikan)
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Setiap anggota tim dapat melihat total pool, daftar kontributor, dan rumus perhitungan, tetapi{" "}
                    <span className="font-semibold text-foreground">hanya dapat melihat nominal rupiah miliknya sendiri</span>.
                  </p>
                </div>

                <div
                  onClick={() => handlePolicyChange("privacy_mode", "open_transparent")}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    policy.privacy_mode === "open_transparent"
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-semibold text-foreground mb-1">
                    <Users className="h-4 w-4 text-primary" />
                    Transparansi Terbuka Penuh
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Seluruh anggota tim dapat saling melihat nominal rupiah dan rating kinerja rekan kerja lainnya.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* REAL-TIME SIMULATION MODAL */}
      {showSimModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-3xl rounded-xl border border-border bg-card shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-border p-4 bg-muted/20">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Calculator className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Simulasi Real-Time Kalkulasi Insentif</h3>
                  <p className="text-[11px] text-muted-foreground">Uji coba formula matematis dengan parameter yang Anda ubah.</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSimModal(false)}
                className="h-8 w-8 p-0"
              >
                ✕
              </Button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Nilai Pendapatan Bruto (Rp):</label>
                  <Input
                    type="number"
                    step="1000000"
                    value={simGross}
                    onChange={(e) => setSimGross(parseFloat(e.target.value) || 0)}
                    className="font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Lini Pendapatan:</label>
                  <select
                    value={simStream}
                    onChange={(e: any) => {
                      setSimStream(e.target.value);
                      setSimRate(e.target.value === "saas" ? Number(policy.saas_pool_rate) : Number(policy.ps_pool_rate));
                    }}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground focus:outline-none"
                  >
                    <option value="saas">SaaS Recurring Sales</option>
                    <option value="professional_service">Professional Service</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Tarif Pool (%):</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.1"
                      value={simRate}
                      onChange={(e) => setSimRate(parseFloat(e.target.value) || 0)}
                      className="font-mono text-xs"
                    />
                    <Button size="sm" onClick={runSimulation} disabled={simLoading} className="text-xs">
                      {simLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Hitung"}
                    </Button>
                  </div>
                </div>
              </div>

              {simResult && (
                <div className="space-y-4 pt-3 border-t border-border">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="rounded-lg bg-muted/40 p-3">
                      <div className="text-[10px] text-muted-foreground uppercase font-bold">Total Pool (100%)</div>
                      <div className="text-sm font-bold text-foreground font-mono mt-1">
                        Rp {Number(simResult.total_pool).toLocaleString("id-ID")}
                      </div>
                    </div>
                    <div className="rounded-lg bg-primary/10 p-3">
                      <div className="text-[10px] text-primary uppercase font-bold">Direct Pool ({policy.direct_allocation_percentage}%)</div>
                      <div className="text-sm font-bold text-primary font-mono mt-1">
                        Rp {Number(simResult.direct_pool).toLocaleString("id-ID")}
                      </div>
                    </div>
                    <div className="rounded-lg bg-amber-500/10 p-3">
                      <div className="text-[10px] text-amber-600 uppercase font-bold">Indirect Pool ({policy.indirect_allocation_percentage}%)</div>
                      <div className="text-sm font-bold text-amber-600 font-mono mt-1">
                        Rp {Number(simResult.indirect_pool).toLocaleString("id-ID")}
                      </div>
                    </div>
                    <div className="rounded-lg bg-emerald-500/10 p-3">
                      <div className="text-[10px] text-emerald-600 uppercase font-bold">Shared Pool ({policy.shared_allocation_percentage}%)</div>
                      <div className="text-sm font-bold text-emerald-600 font-mono mt-1">
                        Rp {Number(simResult.shared_pool).toLocaleString("id-ID")}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border overflow-hidden text-xs">
                    <div className="p-2.5 bg-muted/40 font-semibold text-foreground">
                      Simulasi Pembagian ke Kontributor Proyek:
                    </div>
                    <table className="w-full">
                      <thead>
                        <tr className="border-y border-border bg-muted/20 text-muted-foreground text-[11px]">
                          <th className="p-2 text-left">Nama / Peran</th>
                          <th className="p-2 text-left">Tipe</th>
                          <th className="p-2 text-right">Bobot</th>
                          <th className="p-2 text-right">Mandays</th>
                          <th className="p-2 text-right">Multiplier</th>
                          <th className="p-2 text-right">Skor Akhir</th>
                          <th className="p-2 text-right font-bold text-foreground">Alokasi Rupiah</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {simResult.contributors.map((c: any, i: number) => (
                          <tr key={i} className="hover:bg-muted/10">
                            <td className="p-2 font-medium text-foreground">
                              {c.user_name}
                              <span className="block text-[10px] text-muted-foreground">{c.role_title}</span>
                            </td>
                            <td className="p-2 capitalize">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                  c.contribution_type === "direct"
                                    ? "bg-primary/10 text-primary"
                                    : "bg-amber-500/10 text-amber-600"
                                }`}
                              >
                                {c.contribution_type}
                              </span>
                            </td>
                            <td className="p-2 text-right font-mono">{c.role_weight}</td>
                            <td className="p-2 text-right font-mono">{c.effort_units} MD</td>
                            <td className="p-2 text-right font-mono">{c.performance_multiplier}x</td>
                            <td className="p-2 text-right font-mono font-semibold">{c.contribution_score}</td>
                            <td className="p-2 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              Rp {Number(c.allocated_amount).toLocaleString("id-ID")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 bg-muted/30 border-t border-border flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setShowSimModal(false)} className="text-xs">
                Tutup Simulasi
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
