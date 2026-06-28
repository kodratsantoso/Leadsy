"use client";

import React, { useState, useEffect } from "react";
import { Plus, Edit, Trash, Activity, DollarSign, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/apiFetch";
import { useNumberFormat } from "@/lib/hooks/use-number-format";

export default function RevenueTargetsPage() {
  const { formatNumber, formatCurrency } = useNumberFormat();
  
  const [loading, setLoading] = useState(true);
  const [targets, setTargets] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  
  // Form state
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<any>({
    target_name: "",
    owner_type: "company",
    role_type: "",
    assigned_user_id: "",
    revenue_target_type: "new_business_revenue",
    period_type: "yearly",
    year: new Date().getFullYear(),
    quarter: "",
    month: "",
    currency_code: "IDR",
    currency_symbol: "Rp",
    target_amount: "",
  });

  const fetchInitData = async () => {
    setLoading(true);
    try {
      const [tgtRes, usersRes] = await Promise.all([
        apiFetch("/api/revenue-targets"),
        apiFetch("/api/users")
      ]);
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

  const handleSave = async () => {
    try {
      // Validate inputs
      const payload = {
        ...formData,
        target_amount: Number(formData.target_amount),
        year: Number(formData.year),
        quarter: formData.quarter ? Number(formData.quarter) : null,
        month: formData.month ? Number(formData.month) : null,
      };

      const res = await apiFetch("/api/revenue-targets", {
        method: "POST",
        body: JSON.stringify(payload)
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
      const res = await apiFetch(`/api/revenue-targets/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchInitData();
      }
    } catch (err) {
      console.error(err);
    }
  }

  // --- Cascade Modal State ---
  const [cascadeOpen, setCascadeOpen] = useState(false);
  const [activeParentTarget, setActiveParentTarget] = useState<any>(null);
  const [cascadeItems, setCascadeItems] = useState<any[]>([]);

  const openCascadeModal = (target: any) => {
    setActiveParentTarget(target);
    setCascadeItems([{ assigned_user_id: "", allocation_method: "amount", allocated_amount: "", allocation_percentage: "" }]);
    setCascadeOpen(true);
  };

  const handleAddCascadeItem = () => {
    setCascadeItems([...cascadeItems, { assigned_user_id: "", allocation_method: "amount", allocated_amount: "", allocation_percentage: "" }]);
  };

  const handleCascadeChange = (index: number, field: string, value: string) => {
    const newItems = [...cascadeItems];
    newItems[index][field] = value;
    setCascadeItems(newItems);
  };

  const handleRemoveCascadeItem = (index: number) => {
    const newItems = [...cascadeItems];
    newItems.splice(index, 1);
    setCascadeItems(newItems);
  };

  const handleSaveCascade = async () => {
    try {
      const payload = {
        child_targets: cascadeItems.map(item => ({
          ...item,
          allocated_amount: item.allocated_amount ? Number(item.allocated_amount) : null,
          allocation_percentage: item.allocation_percentage ? Number(item.allocation_percentage) : null,
        }))
      };

      const res = await apiFetch(`/api/revenue-targets/${activeParentTarget.id}/cascade`, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        setCascadeOpen(false);
        fetchInitData();
      } else {
        const e = await res.json();
        alert(e.error || e.message || "Failed to cascade");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Revenue Targets</h1>
          <p className="text-muted-foreground mt-1">Configure company revenue targets and cascade to Sales and AMs.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" /> New Target</Button>
        
        {/* Create/Edit Modal */}
        <Modal open={open} onOpenChange={setOpen} title="Create Revenue Target" size="sm">
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Target Name</label>
              <Input value={formData.target_name} onChange={e => setFormData({...formData, target_name: e.target.value})} placeholder="e.g. 2026 Company Revenue" />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Owner Type</label>
              <Select value={formData.owner_type} onChange={e => setFormData({...formData, owner_type: e.target.value})}>
                <option value="company">Company</option>
                <option value="department">Department</option>
                <option value="manager">Manager</option>
                <option value="user">User</option>
              </Select>
            </div>

            {formData.owner_type === "user" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Assigned User</label>
                <Select value={formData.assigned_user_id} onChange={e => setFormData({...formData, assigned_user_id: e.target.value})} placeholder="Select User">
                  {users.map(u => <option key={u.id} value={u.id.toString()}>{u.name}</option>)}
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Period Type</label>
              <Select value={formData.period_type} onChange={e => setFormData({...formData, period_type: e.target.value})}>
                <option value="yearly">Yearly</option>
                <option value="quarterly">Quarterly</option>
                <option value="monthly">Monthly</option>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Year</label>
                <Input type="number" value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})} />
              </div>
              {formData.period_type === "quarterly" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Quarter</label>
                  <Input type="number" min="1" max="4" value={formData.quarter} onChange={e => setFormData({...formData, quarter: e.target.value})} />
                </div>
              )}
              {formData.period_type === "monthly" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Month</label>
                  <Input type="number" min="1" max="12" value={formData.month} onChange={e => setFormData({...formData, month: e.target.value})} />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Target Amount</label>
              <div className="flex gap-2">
                <Input type="text" className="w-20" value={formData.currency_code} onChange={e => setFormData({...formData, currency_code: e.target.value})} placeholder="IDR" />
                <Input type="number" className="flex-1" value={formData.target_amount} onChange={e => setFormData({...formData, target_amount: e.target.value})} />
              </div>
            </div>

            <Button onClick={handleSave} className="w-full">Save Target</Button>
          </div>
        </Modal>

        {/* Cascade Modal */}
        <Modal open={cascadeOpen} onOpenChange={setCascadeOpen} title="Cascade Revenue Target" size="lg">
          <div className="space-y-4 mt-4">
            <div className="p-4 bg-muted/30 rounded-lg border border-border">
              <h3 className="font-medium text-sm">Parent Target: {activeParentTarget?.target_name || '-'}</h3>
              <p className="text-xs text-muted-foreground mt-1">Total Amount: {formatCurrency(activeParentTarget?.target_amount || 0)}</p>
            </div>

            <div className="space-y-4">
              {cascadeItems.map((item, index) => (
                <div key={index} className="flex gap-3 items-end border-b border-border/50 pb-4">
                  <div className="flex-1 space-y-2">
                    <label className="text-xs font-medium">Assign To User</label>
                    <Select value={item.assigned_user_id} onChange={e => handleCascadeChange(index, 'assigned_user_id', e.target.value)} placeholder="Select User">
                      {users.map(u => <option key={u.id} value={u.id.toString()}>{u.name}</option>)}
                    </Select>
                  </div>
                  <div className="w-32 space-y-2">
                    <label className="text-xs font-medium">Method</label>
                    <Select value={item.allocation_method} onChange={e => handleCascadeChange(index, 'allocation_method', e.target.value)}>
                      <option value="amount">Amount</option>
                      <option value="percentage">Percentage</option>
                    </Select>
                  </div>
                  {item.allocation_method === 'percentage' ? (
                    <div className="w-32 space-y-2">
                      <label className="text-xs font-medium">Percentage (%)</label>
                      <Input type="number" value={item.allocation_percentage} onChange={e => handleCascadeChange(index, 'allocation_percentage', e.target.value)} />
                    </div>
                  ) : (
                    <div className="flex-1 space-y-2">
                      <label className="text-xs font-medium">Amount</label>
                      <Input type="number" value={item.allocated_amount} onChange={e => handleCascadeChange(index, 'allocated_amount', e.target.value)} />
                    </div>
                  )}
                  <Button variant="ghost" className="mb-0.5 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleRemoveCascadeItem(index)}>
                    <Trash className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              
              <Button variant="outline" size="sm" onClick={handleAddCascadeItem}>
                <Plus className="w-4 h-4 mr-2" /> Add Child Target
              </Button>
            </div>

            <div className="pt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCascadeOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveCascade}>Execute Cascade</Button>
            </div>
          </div>
        </Modal>
      </div>

      <Card>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Target Name</TableHeaderCell>
              <TableHeaderCell>Owner</TableHeaderCell>
              <TableHeaderCell>Period</TableHeaderCell>
              <TableHeaderCell>Target Amount</TableHeaderCell>
              <TableHeaderCell>Parent Target</TableHeaderCell>
              <TableHeaderCell className="text-right">Actions</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {targets.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No targets found.</TableCell></TableRow>
            ) : (
              targets.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.target_name || '-'}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <Badge variant="outline" className="w-max mb-1 capitalize">{t.owner_type}</Badge>
                      <span className="text-xs text-muted-foreground">{t.assigned_user?.name || '-'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="capitalize">{t.period_type}</span>
                    <span className="text-xs text-muted-foreground block">
                      {t.year} {t.quarter ? `Q${t.quarter}` : ''} {t.month ? `M${t.month}` : ''}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-[color:var(--brand)]">
                      {t.currency_symbol} {formatNumber(t.target_amount)}
                    </span>
                    {t.allocation_percentage && (
                      <span className="text-xs text-muted-foreground ml-2">({t.allocation_percentage}%)</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {t.parent_target ? (
                      <span className="text-xs text-muted-foreground">{t.parent_target.target_name || `Target #${t.parent_target_id}`}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">None (Root)</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openCascadeModal(t)}>
                      <Layers className="w-4 h-4 mr-1"/> Cascade
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(t.id)}>
                      <Trash className="w-4 h-4 text-red-500"/>
                    </Button>
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
