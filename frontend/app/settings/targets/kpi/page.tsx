"use client";

import React, { useState, useEffect } from "react";
import { Save, Activity, Trash, Filter, Info, ShieldCheck, Lock } from "lucide-react";
import { BackToSettings } from "@/app/settings/_components/back-to-settings";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell } from "@/components/ui/table";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/apiFetch";
import { readApiError } from "@/lib/apiError";
import { useToast } from "@/components/ui/toast";
import { useAuthStore } from "@/store/useAuthStore";
import { getUserPermissionNames, isSuperAdminUser } from "@/lib/permissions";

export default function KpiTargetsPage() {
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const canEdit = isSuperAdminUser(user) || getUserPermissionNames(user).some((p) => ["targets.edit", "targets.manage", "users.manage"].includes(p));

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [targets, setTargets] = useState<any[]>([]);
  const [config, setConfig] = useState<any>({});
  const [users, setUsers] = useState<any[]>([]);
  
  // Period filter state
  const [periodType, setPeriodType] = useState("monthly");
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]);
  const [roleFilter, setRoleFilter] = useState("all");

  // Grid state: {[userId_kpiType]: value}
  const [gridValues, setGridValues] = useState<Record<string, string>>({});

  const fetchInitData = async () => {
    setLoading(true);
    try {
      const [confRes, tgtRes, usersRes] = await Promise.all([
        apiFetch("/api/targets/config"),
        apiFetch("/api/kpi-targets"),
        apiFetch("/api/users")
      ]);
      if (confRes.ok) {
        const c = await confRes.json();
        setConfig(c.kpi_target || {});
      }
      if (tgtRes.ok) {
        const d = await tgtRes.json();
        setTargets(d);
        // Pre-fill grid with existing values
        const initialGrid: Record<string, string> = {};
        d.forEach((t: any) => {
          const key = `${t.assigned_user_id}_${t.kpi_type}`;
          initialGrid[key] = t.target_quantity !== null ? t.target_quantity.toString() : 
                             (t.target_percentage !== null ? t.target_percentage.toString() : 
                             (t.target_score !== null ? t.target_score.toString() : ""));
        });
        setGridValues(initialGrid);
      }
      if (usersRes.ok) {
        const d = await usersRes.json();
        setUsers(Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitData();
  }, []);

  const handleGridChange = (userId: number, kpiType: string, value: string) => {
    setGridValues(prev => ({
      ...prev,
      [`${userId}_${kpiType}`]: value
    }));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const bulkPayload: any[] = [];

      users.forEach(u => {
        const role = u.role?.name?.toLowerCase() || "";
        const roleKpis = config?.kpi_types_by_role?.[role];
        if (!roleKpis) return;

        Object.keys(roleKpis).forEach(kpiType => {
          const val = gridValues[`${u.id}_${kpiType}`];
          if (val && val !== "") {
            const valueType = roleKpis[kpiType].value_type;
            const numericVal = Number(val);
            
            bulkPayload.push({
              role_type: role,
              assigned_user_id: u.id,
              kpi_type: kpiType,
              period_type: periodType,
              start_date: startDate,
              end_date: endDate,
              target_value_type: valueType,
              target_quantity: valueType === "quantity" ? numericVal : null,
              target_percentage: valueType === "percentage" ? numericVal : null,
              target_score: valueType === "score" ? numericVal : null,
              target_days: valueType === "days" ? numericVal : null,
              target_hours: valueType === "hours" ? numericVal : null,
            });
          }
        });
      });

      if (bulkPayload.length === 0) {
        toast.info("Nothing to save — no values were entered.");
        setSaving(false);
        return;
      }

      const res = await apiFetch("/api/kpi-targets/bulk", {
        method: "POST",
        body: JSON.stringify({ targets: bulkPayload })
      });

      if (res.ok) {
        toast.success("KPI targets saved.");
        fetchInitData();
      } else {
        // The server now classifies its own failures and names the offending fields,
        // so the raw JSON dump this used to print is no longer the only clue.
        toast.fromError(await readApiError(res, "KPI targets could not be saved."));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const roles = config?.roles || [];
  
  // Get all unique KPI types across selected roles to build dynamic columns
  let dynamicKpiColumns: { key: string, label: string, valueType: string }[] = [];
  
  if (roleFilter === "all") {
    roles.forEach((r: string) => {
      const roleKpis = config?.kpi_types_by_role?.[r] || {};
      Object.keys(roleKpis).forEach(k => {
        if (!dynamicKpiColumns.find(c => c.key === k)) {
          dynamicKpiColumns.push({ key: k, label: k.replace(/_/g, ' '), valueType: roleKpis[k].value_type });
        }
      });
    });
  } else {
    const roleKpis = config?.kpi_types_by_role?.[roleFilter] || {};
    Object.keys(roleKpis).forEach(k => {
      dynamicKpiColumns.push({ key: k, label: k.replace(/_/g, ' '), valueType: roleKpis[k].value_type });
    });
  }

  // Filter users by role
  const filteredUsers = Array.isArray(users)
    ? users.filter((u) => {
        if (roleFilter === "all") return true;
        return u.role?.name?.toLowerCase() === roleFilter;
      })
    : [];

  return (
    <div className="space-y-6 p-6 w-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <BackToSettings />
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Target KPI Kinerja Tim</h1>
            {!canEdit ? (
              <Badge variant="outline" className="gap-1 text-xs text-muted-foreground border-border">
                <Lock className="h-3 w-3" />
                Mode Hanya Lihat (View Only)
              </Badge>
            ) : (
              <Badge variant="success" className="gap-1 text-xs">
                <ShieldCheck className="h-3 w-3" />
                Akses Edit Aktif
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Konfigurasi kuota target metrik kinerja kuantitatif per role pengguna (Sales, Presales, CSM, AM) per periode penagihan.
          </p>
        </div>

        {canEdit ? (
          <Button onClick={handleSaveAll} disabled={saving} className="shadow-sm">
            <Save className="w-4 h-4 mr-2" /> 
            {saving ? "Menyimpan..." : "Simpan Semua Target KPI"}
          </Button>
        ) : null}
      </div>

      {/* Guide Info Banner */}
      <Card className="border-border bg-[color:var(--surface-subtle)]">
        <CardContent className="flex items-start gap-3 p-4">
          <Info className="h-5 w-5 text-[color:var(--brand)] shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">Petunjuk Pengisian:</span> Pilih periode evaluasi (Bulanan, Kuartalan, Tahunan), lalu masukkan angka target pada kolom metrik yang berlaku untuk setiap personil. Kolom bertanda <span className="font-mono text-muted-foreground">N/A</span> menandakan metrik tersebut tidak ditugaskan untuk role terkait. Klik <strong>Simpan Semua Target KPI</strong> untuk memperbarui data secara kolektif.
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-border/50 shadow-sm">
        <CardHeader className="pb-4 bg-muted/30 border-b border-border/50">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Filter Role</label>
              <Select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="w-40">
                <option value="all">Semua Role</option>
                {roles.map((r: string) => <option key={r} value={r}>{r.toUpperCase()}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Periode</label>
              <Select value={periodType} onChange={e => setPeriodType(e.target.value)} className="w-32">
                <option value="monthly">Bulanan</option>
                <option value="quarterly">Kuartalan</option>
                <option value="yearly">Tahunan</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tanggal Mulai</label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tanggal Selesai</label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-40" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto relative">
            <Table>
              <TableHead>
                <TableRow className="hover:bg-transparent">
                  <TableHeaderCell className="w-64 min-w-[250px] sticky left-0 bg-background z-10 shadow-[1px_0_0_0_hsl(var(--border))]">Pengguna (User)</TableHeaderCell>
                  <TableHeaderCell className="w-32">Role</TableHeaderCell>
                  {dynamicKpiColumns.map(col => (
                    <TableHeaderCell key={col.key} className="min-w-[180px] capitalize">
                      <span className="font-semibold text-foreground/90">{col.label}</span>
                      <span className="text-[10px] block text-muted-foreground font-medium uppercase tracking-wider mt-1">{col.valueType}</span>
                    </TableHeaderCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow><TableCell colSpan={dynamicKpiColumns.length + 2} className="text-center py-10 text-muted-foreground">Tidak ada pengguna yang cocok dengan filter role ini.</TableCell></TableRow>
                ) : (
                  filteredUsers.map(u => {
                    const uRole = u.role?.name?.toLowerCase() || "";
                    const validKpisForRole = config?.kpi_types_by_role?.[uRole] || {};

                    return (
                      <TableRow key={u.id} className="hover:bg-muted/30 transition-colors group">
                        <TableCell className="font-medium sticky left-0 bg-background group-hover:bg-muted/30 z-10 shadow-[1px_0_0_0_hsl(var(--border))] transition-colors">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-[color:var(--brand-subtle)] text-[color:var(--brand)] flex items-center justify-center text-xs font-bold shrink-0">
                              {u.name.charAt(0)}
                            </div>
                            <span className="truncate">{u.name}</span>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline" className="capitalize text-xs font-medium tracking-wide">{uRole || 'No Role'}</Badge></TableCell>
                        
                        {dynamicKpiColumns.map(col => {
                          const isApplicable = !!validKpisForRole[col.key];
                          const cellKey = `${u.id}_${col.key}`;
                          
                          return (
                            <TableCell key={col.key} className={!isApplicable ? "bg-muted/10 opacity-50" : ""}>
                              {isApplicable ? (
                                <div className="relative flex items-center group-focus-within:ring-1 group-focus-within:ring-[color:var(--brand)] rounded-md transition-all">
                                  <Input 
                                    type="number" 
                                    disabled={!canEdit}
                                    className="h-9 text-sm bg-transparent border-border/50 hover:border-[color:var(--brand)]/50 focus-visible:ring-0 focus-visible:border-[color:var(--brand)] transition-all disabled:opacity-75 disabled:cursor-not-allowed" 
                                    placeholder={`0`}
                                    value={gridValues[cellKey] || ""}
                                    onChange={(e) => handleGridChange(u.id, col.key, e.target.value)}
                                  />
                                  {col.valueType === "percentage" && <span className="absolute right-3 text-xs text-muted-foreground font-medium pointer-events-none">%</span>}
                                </div>
                              ) : (
                                <span className="text-[11px] text-muted-foreground/70 uppercase tracking-widest pl-2 font-mono">N/A</span>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
