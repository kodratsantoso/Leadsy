"use client";

import React, { useState, useEffect } from "react";
import { Plus, Filter, RefreshCw, BarChart2, Edit, Trash, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/apiFetch";
import { useNumberFormat } from "@/lib/hooks/use-number-format";

interface TargetConfig {
  [role: string]: {
    [targetType: string]: {
      value_type: "amount" | "quantity" | "percentage" | "score" | "days";
      cascade_enabled: boolean;
    };
  };
}

export default function TargetsPage() {
  const { formatCurrency } = useNumberFormat();
  
  const [loading, setLoading] = useState(true);
  const [targets, setTargets] = useState<any[]>([]);
  const [config, setConfig] = useState<TargetConfig>({});
  const [users, setUsers] = useState<any[]>([]);
  
  // Form state
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<any>({
    target_name: "",
    role_type: "",
    target_type: "",
    assigned_user_id: "",
    period_type: "monthly",
    start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end_date: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
    target_value_type: "",
    target_amount: "",
    target_quantity: "",
    target_percentage: "",
    target_score: "",
    target_days: ""
  });

  const fetchInitData = async () => {
    setLoading(true);
    try {
      const [confRes, tgtRes, usersRes] = await Promise.all([
        apiFetch("/api/targets/config"),
        apiFetch("/api/targets"),
        apiFetch("/api/users")
      ]);
      if (confRes.ok) setConfig(await confRes.json());
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
    setFormData({ ...formData, role_type: role, target_type: "", target_value_type: "" });
  };

  const handleTargetTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const type = e.target.value;
    const valType = config[formData.role_type][type].value_type;
    setFormData({ ...formData, target_type: type, target_value_type: valType });
  };

  const handleSave = async () => {
    try {
      const res = await apiFetch("/api/targets", {
        method: "POST",
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setOpen(false);
        fetchInitData();
      } else {
        alert("Failed to save target");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const renderValueInput = () => {
    switch (formData.target_value_type) {
      case "amount":
        return <div className="space-y-2"><label className="text-sm font-medium">Revenue Target Amount</label><Input type="number" value={formData.target_amount} onChange={e => setFormData({...formData, target_amount: e.target.value})} /></div>;
      case "quantity":
        return <div className="space-y-2"><label className="text-sm font-medium">Quantity Target</label><Input type="number" value={formData.target_quantity} onChange={e => setFormData({...formData, target_quantity: e.target.value})} /></div>;
      case "percentage":
        return <div className="space-y-2"><label className="text-sm font-medium">Percentage Target (%)</label><Input type="number" value={formData.target_percentage} onChange={e => setFormData({...formData, target_percentage: e.target.value})} /></div>;
      case "score":
        return <div className="space-y-2"><label className="text-sm font-medium">Score Target</label><Input type="number" value={formData.target_score} onChange={e => setFormData({...formData, target_score: e.target.value})} /></div>;
      case "days":
        return <div className="space-y-2"><label className="text-sm font-medium">Days Target</label><Input type="number" value={formData.target_days} onChange={e => setFormData({...formData, target_days: e.target.value})} /></div>;
      default:
        return null;
    }
  };

  const formatTargetValue = (target: any) => {
    switch (target.target_value_type) {
      case "amount": return formatCurrency(target.target_amount);
      case "quantity": return target.target_quantity;
      case "percentage": return `${target.target_percentage}%`;
      case "score": return target.target_score;
      case "days": return `${target.target_days} days`;
      default: return "-";
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Target KPI</h1>
          <p className="text-muted-foreground mt-1">Configure role-specific metrics and KPIs for all user levels.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" /> New Target</Button>
        <Modal open={open} onOpenChange={setOpen} title="Create New Target" size="sm">
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
                {Object.keys(config).map(r => <option key={r} value={r}>{r.toUpperCase()}</option>)}
              </Select>
            </div>
            {formData.role_type && config[formData.role_type] && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Target Type</label>
                <Select value={formData.target_type} onChange={handleTargetTypeChange} placeholder="Select Target Type">
                  {Object.keys(config[formData.role_type]).map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </Select>
              </div>
            )}
            {formData.target_type && renderValueInput()}
            
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
              <TableHeaderCell>Type</TableHeaderCell>
              <TableHeaderCell>Period</TableHeaderCell>
              <TableHeaderCell>Target Value</TableHeaderCell>
              <TableHeaderCell>Cascade Enabled</TableHeaderCell>
              <TableHeaderCell>Actions</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {targets.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">No targets found.</TableCell></TableRow>
            ) : (
              targets.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.target_name || '-'}</TableCell>
                  <TableCell><Badge variant="outline">{t.role_type}</Badge></TableCell>
                  <TableCell>{t.assigned_user?.name}</TableCell>
                  <TableCell className="capitalize">{t.target_type.replace(/_/g, ' ')}</TableCell>
                  <TableCell className="capitalize">{t.period_type}</TableCell>
                  <TableCell>{formatTargetValue(t)}</TableCell>
                  <TableCell>
                    {config[t.role_type]?.[t.target_type]?.cascade_enabled ? 
                      <Badge className="bg-blue-100 text-blue-800">Yes</Badge> : 
                      <Badge variant="neutral">No</Badge>
                    }
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm"><Activity className="w-4 h-4 mr-1"/> Achievement</Button>
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
