"use client";

import React, { useState, useEffect } from "react";
import { Plus, Activity, Edit, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/apiFetch";
import { useNumberFormat } from "@/lib/hooks/use-number-format";

export default function KpiTargetsPage() {
  const { formatNumber } = useNumberFormat();
  
  const [loading, setLoading] = useState(true);
  const [targets, setTargets] = useState<any[]>([]);
  const [config, setConfig] = useState<any>({});
  const [users, setUsers] = useState<any[]>([]);
  
  // Form state
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<any>({
    target_name: "",
    role_type: "",
    kpi_type: "",
    assigned_user_id: "",
    period_type: "monthly",
    start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end_date: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
    target_value_type: "",
    target_quantity: "",
    target_percentage: "",
    target_score: "",
    target_days: "",
    target_hours: ""
  });

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
      if (tgtRes.ok) setTargets(await tgtRes.json());
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

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const role = e.target.value;
    setFormData({ ...formData, role_type: role, kpi_type: "", target_value_type: "" });
  };

  const handleKpiTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const type = e.target.value;
    const valType = config?.kpi_types_by_role?.[formData.role_type]?.[type]?.value_type || "";
    setFormData({ ...formData, kpi_type: type, target_value_type: valType });
  };

  const handleSave = async () => {
    try {
      const res = await apiFetch("/api/kpi-targets", {
        method: "POST",
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setOpen(false);
        fetchInitData();
      } else {
        const e = await res.json();
        alert(e.message || "Failed to save target");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure?")) return;
    try {
      const res = await apiFetch(`/api/kpi-targets/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchInitData();
      }
    } catch (err) {
      console.error(err);
    }
  }

  const renderValueInput = () => {
    switch (formData.target_value_type) {
      case "quantity":
        return <div className="space-y-2"><label className="text-sm font-medium">Quantity Target</label><Input type="number" value={formData.target_quantity} onChange={e => setFormData({...formData, target_quantity: e.target.value})} /></div>;
      case "percentage":
        return <div className="space-y-2"><label className="text-sm font-medium">Percentage Target (%)</label><Input type="number" value={formData.target_percentage} onChange={e => setFormData({...formData, target_percentage: e.target.value})} /></div>;
      case "score":
        return <div className="space-y-2"><label className="text-sm font-medium">Score Target</label><Input type="number" step="0.1" value={formData.target_score} onChange={e => setFormData({...formData, target_score: e.target.value})} /></div>;
      case "days":
        return <div className="space-y-2"><label className="text-sm font-medium">Days Target</label><Input type="number" value={formData.target_days} onChange={e => setFormData({...formData, target_days: e.target.value})} /></div>;
      case "hours":
        return <div className="space-y-2"><label className="text-sm font-medium">Hours Target</label><Input type="number" step="0.1" value={formData.target_hours} onChange={e => setFormData({...formData, target_hours: e.target.value})} /></div>;
      default:
        return null;
    }
  };

  const formatTargetValue = (target: any) => {
    switch (target.target_value_type) {
      case "quantity": return formatNumber(target.target_quantity);
      case "percentage": return `${target.target_percentage}%`;
      case "score": return target.target_score;
      case "days": return `${target.target_days} days`;
      case "hours": return `${target.target_hours} hours`;
      default: return "-";
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">KPI Targets</h1>
          <p className="text-muted-foreground mt-1">Configure role-specific metrics and KPIs for all user levels.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" /> New Target</Button>
        <Modal open={open} onOpenChange={setOpen} title="Create New KPI Target" size="sm">
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Target Name</label>
              <Input value={formData.target_name} onChange={e => setFormData({...formData, target_name: e.target.value})} placeholder="e.g. Q3 BANTC Completion" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Assigned User</label>
              <Select value={formData.assigned_user_id} onChange={e => setFormData({...formData, assigned_user_id: e.target.value})} placeholder="Select User">
                {users.map(u => <option key={u.id} value={u.id.toString()}>{u.name}</option>)}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Select value={formData.role_type} onChange={handleRoleChange} placeholder="Select Role">
                {config?.roles?.map((r: string) => <option key={r} value={r}>{r.toUpperCase()}</option>)}
              </Select>
            </div>
            {formData.role_type && config?.kpi_types_by_role?.[formData.role_type] && (
              <div className="space-y-2">
                <label className="text-sm font-medium">KPI Type</label>
                <Select value={formData.kpi_type} onChange={handleKpiTypeChange} placeholder="Select KPI Type">
                  {Object.keys(config.kpi_types_by_role[formData.role_type]).map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </Select>
              </div>
            )}
            {formData.kpi_type && renderValueInput()}
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <Input type="date" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <Input type="date" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} />
              </div>
            </div>

            <Button onClick={handleSave} className="w-full">Save Target</Button>
          </div>
        </Modal>
      </div>

      <Card>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Target Name</TableHeaderCell>
              <TableHeaderCell>Role</TableHeaderCell>
              <TableHeaderCell>Assigned To</TableHeaderCell>
              <TableHeaderCell>KPI Type</TableHeaderCell>
              <TableHeaderCell>Period</TableHeaderCell>
              <TableHeaderCell>Target Value</TableHeaderCell>
              <TableHeaderCell className="text-right">Actions</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {targets.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">No targets found.</TableCell></TableRow>
            ) : (
              targets.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.target_name || '-'}</TableCell>
                  <TableCell><Badge variant="outline">{t.role_type}</Badge></TableCell>
                  <TableCell>{t.assigned_user?.name}</TableCell>
                  <TableCell className="capitalize">{t.kpi_type.replace(/_/g, ' ')}</TableCell>
                  <TableCell className="capitalize">{t.period_type}</TableCell>
                  <TableCell>{formatTargetValue(t)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(t.id)}><Trash className="w-4 h-4 text-red-500"/></Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
