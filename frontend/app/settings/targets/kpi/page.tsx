"use client";

import React, { useState, useEffect } from "react";
import { Save, Activity, Trash, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell } from "@/components/ui/table";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/apiFetch";

export default function KpiTargetsPage() {
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
        setUsers(d.data || d);
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
        alert("No values to save.");
        setSaving(false);
        return;
      }

      const res = await apiFetch("/api/kpi-targets/bulk", {
        method: "POST",
        body: JSON.stringify({ targets: bulkPayload })
      });

      if (res.ok) {
        alert("KPI Targets saved successfully!");
        fetchInitData();
      } else {
        const e = await res.json();
        const details = e.errors ? JSON.stringify(e.errors) : (e.error?.details || "");
        alert(`${e.message || "Failed to save targets"} \n${details}`);
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
  const filteredUsers = users.filter(u => {
    if (roleFilter === "all") return true;
    return u.role?.name?.toLowerCase() === roleFilter;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">KPI Targets</h1>
          <p className="text-muted-foreground mt-1">Bulk entry grid to configure KPI targets for all users.</p>
        </div>
        <Button onClick={handleSaveAll} disabled={saving}>
          <Save className="w-4 h-4 mr-2" /> 
          {saving ? "Saving..." : "Save All Targets"}
        </Button>
      </div>

      <Card className="overflow-hidden border-border/50 shadow-sm">
        <CardHeader className="pb-4 bg-muted/30 border-b border-border/50">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Filter Role</label>
              <Select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="w-40">
                <option value="all">All Roles</option>
                {roles.map((r: string) => <option key={r} value={r}>{r.toUpperCase()}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Period</label>
              <Select value={periodType} onChange={e => setPeriodType(e.target.value)} className="w-32">
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Start Date</label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">End Date</label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-40" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto relative">
            <Table>
              <TableHead>
                <TableRow className="hover:bg-transparent">
                  <TableHeaderCell className="w-64 min-w-[250px] sticky left-0 bg-background z-10 shadow-[1px_0_0_0_hsl(var(--border))]">User</TableHeaderCell>
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
                  <TableRow><TableCell colSpan={dynamicKpiColumns.length + 2} className="text-center py-10">No users found for this role.</TableCell></TableRow>
                ) : (
                  filteredUsers.map(u => {
                    const uRole = u.role?.name?.toLowerCase() || "";
                    const validKpisForRole = config?.kpi_types_by_role?.[uRole] || {};

                    return (
                      <TableRow key={u.id} className="hover:bg-muted/30 transition-colors group">
                        <TableCell className="font-medium sticky left-0 bg-background group-hover:bg-muted/30 z-10 shadow-[1px_0_0_0_hsl(var(--border))] transition-colors">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
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
                                <div className="relative flex items-center group-focus-within:ring-1 group-focus-within:ring-primary rounded-md transition-all">
                                  <Input 
                                    type="number" 
                                    className="h-9 text-sm bg-transparent border-border/50 hover:border-primary/50 focus-visible:ring-0 focus-visible:border-primary transition-all" 
                                    placeholder={`0`}
                                    value={gridValues[cellKey] || ""}
                                    onChange={(e) => handleGridChange(u.id, col.key, e.target.value)}
                                  />
                                  {col.valueType === "percentage" && <span className="absolute right-3 text-xs text-muted-foreground font-medium pointer-events-none">%</span>}
                                </div>
                              ) : (
                                <span className="text-[11px] text-muted-foreground/70 uppercase tracking-widest pl-2">N/A</span>
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
