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

const NumberInput = ({ value, onChange, className, placeholder }: any) => {
  const displayValue = value ? new Intl.NumberFormat('en-US').format(Number(value)) : "";
  const handleChange = (e: any) => {
    const val = e.target.value.replace(/[,.]/g, ''); // Strip both commas and dots to support IDR pasting
    if (!isNaN(Number(val)) || val === '') {
      onChange(val);
    }
  };
  return <Input type="text" className={className} placeholder={placeholder} value={displayValue} onChange={handleChange} />;
};

export default function RevenueTargetsPage() {
  const { formatNumber, formatCurrency } = useNumberFormat();
  
  const [loading, setLoading] = useState(true);
  const [targets, setTargets] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  
  // Form state
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const defaultForm = {
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
  };
  const [formData, setFormData] = useState<any>(defaultForm);

  const handleOpenCreate = () => {
    setEditId(null);
    setFormData(defaultForm);
    setOpen(true);
  };

  const handleOpenEdit = (t: any) => {
    setEditId(t.id);
    setFormData({
      target_name: t.target_name || "",
      owner_type: t.owner_type || "company",
      role_type: t.role_type || "",
      assigned_user_id: t.assigned_user_id || "",
      revenue_target_type: t.revenue_target_type || "new_business_revenue",
      period_type: t.period_type || "yearly",
      year: t.year || new Date().getFullYear(),
      quarter: t.quarter || "",
      month: t.month || "",
      currency_code: t.currency_code || "IDR",
      currency_symbol: t.currency_symbol || "Rp",
      target_amount: t.target_amount || "",
    });
    setOpen(true);
  };

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

      const method = editId ? "PUT" : "POST";
      const url = editId ? `/api/revenue-targets/${editId}` : "/api/revenue-targets";

      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setOpen(false);
        fetchInitData();
      } else {
        const e = await res.json();
        const details = e.error?.details || e.errors;
        const errorDetails = details ? JSON.stringify(details, null, 2) : "";
        alert((e.message || "Failed to save target") + (errorDetails ? "\n" + errorDetails : ""));
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
        <Button onClick={handleOpenCreate}><Plus className="w-4 h-4 mr-2" /> New Target</Button>
        
        <Modal open={open} onOpenChange={setOpen} title={editId ? "Edit Revenue Target" : "Create Revenue Target"} size="md">
          <div className="space-y-6 mt-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Target Name</label>
              <Input className="h-10" value={formData.target_name} onChange={e => setFormData({...formData, target_name: e.target.value})} placeholder="e.g. 2026 Company Revenue" />
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Owner Type</label>
                <Select className="h-10" value={formData.owner_type} onChange={e => setFormData({...formData, owner_type: e.target.value})}>
                  <option value="company">Company</option>
                  <option value="department">Department</option>
                  <option value="manager">Manager</option>
                  <option value="user">User</option>
                </Select>
              </div>

              {formData.owner_type === "user" && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assigned User</label>
                  <Select className="h-10" value={formData.assigned_user_id} onChange={e => setFormData({...formData, assigned_user_id: e.target.value})} placeholder="Select User">
                    {users.map(u => <option key={u.id} value={u.id.toString()}>{u.name} {u.role ? `(${u.role.name})` : ''}</option>)}
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Period Type</label>
                <Select className="h-10" value={formData.period_type} onChange={e => setFormData({...formData, period_type: e.target.value})}>
                  <option value="yearly">Yearly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="monthly">Monthly</option>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/50">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Year</label>
                <Input type="number" className="h-10" value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})} />
              </div>
              {formData.period_type === "quarterly" && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quarter</label>
                  <Input type="number" min="1" max="4" className="h-10" value={formData.quarter} onChange={e => setFormData({...formData, quarter: e.target.value})} />
                </div>
              )}
              {formData.period_type === "monthly" && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Month</label>
                  <Input type="number" min="1" max="12" className="h-10" value={formData.month} onChange={e => setFormData({...formData, month: e.target.value})} />
                </div>
              )}
            </div>

            <div className="space-y-2 pt-2 border-t border-border/50">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Target Amount</label>
              <div className="flex gap-2">
                <Input type="text" className="w-24 h-10 font-mono text-center bg-muted/30" value={formData.currency_code} onChange={e => setFormData({...formData, currency_code: e.target.value})} placeholder="IDR" />
                <NumberInput className="flex-1 h-10 text-lg font-medium tracking-wide" value={formData.target_amount} onChange={(v: string) => setFormData({...formData, target_amount: v})} />
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <Button onClick={handleSave} className="px-8">Save Target</Button>
            </div>
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
                      {users.map(u => <option key={u.id} value={u.id.toString()}>{u.name} {u.role ? `(${u.role.name})` : ''}</option>)}
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
                      <NumberInput value={item.allocated_amount} onChange={(v: string) => handleCascadeChange(index, 'allocated_amount', v)} />
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

      <Card className="overflow-hidden border-border/50 shadow-sm">
        <Table>
          <TableHead>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHeaderCell className="font-semibold text-foreground/90">Target Name</TableHeaderCell>
              <TableHeaderCell className="font-semibold text-foreground/90">Owner</TableHeaderCell>
              <TableHeaderCell className="font-semibold text-foreground/90">Period</TableHeaderCell>
              <TableHeaderCell className="font-semibold text-foreground/90">Target Amount</TableHeaderCell>
              <TableHeaderCell className="font-semibold text-foreground/90">Parent Target</TableHeaderCell>
              <TableHeaderCell className="text-right font-semibold text-foreground/90">Actions</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {targets.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No targets found.</TableCell></TableRow>
            ) : (
              targets.map(t => (
                <TableRow key={t.id} className="hover:bg-muted/30 transition-colors group">
                  <TableCell className="font-medium">{t.target_name || '-'}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge variant="outline" className="w-max capitalize text-[10px] tracking-wide border-primary/20 text-primary bg-primary/5">{t.owner_type}</Badge>
                      <span className="text-xs font-medium text-muted-foreground">{t.assigned_user?.name || '-'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="capitalize font-medium">{t.period_type}</span>
                    <span className="text-[11px] font-mono text-muted-foreground block mt-0.5">
                      {t.year} {t.quarter ? `Q${t.quarter}` : ''} {t.month ? `M${t.month}` : ''}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {t.currency_symbol} {formatNumber(t.target_amount)}
                    </span>
                    {t.allocation_percentage && (
                      <Badge variant="neutral" className="text-[10px] ml-2 bg-muted/50 text-muted-foreground">
                        {t.allocation_percentage}%
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {t.parent_target ? (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <svg className="w-3 h-3 text-border" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                        <span className="font-medium truncate max-w-[150px]">{t.parent_target.target_name || `Target #${t.parent_target_id}`}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground/50 italic px-2 py-0.5 rounded-md border border-dashed border-border/50">None (Root)</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" onClick={() => openCascadeModal(t)} className="h-8 text-xs hover:bg-primary/10 hover:text-primary">
                        <Layers className="w-3.5 h-3.5 mr-1"/> Cascade
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(t)} className="h-8 w-8 p-0 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                        <Edit className="w-3.5 h-3.5"/>
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(t.id)} className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                        <Trash className="w-3.5 h-3.5"/>
                      </Button>
                    </div>
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
