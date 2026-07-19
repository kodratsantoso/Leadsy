"use client";
 
import { useState } from "react";
import { Coins, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
 
import { BackToSettings } from "@/app/settings/_components/back-to-settings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FilterBar, FilterBarSearch } from "@/components/ui/filter-bar";
import { Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableShell,
} from "@/components/ui/table";
import { apiFetch } from "@/lib/apiFetch";
 
type WithholdingTaxCodeType = {
  id: number;
  wht_code: string;
  wht_name: string;
  wht_type: string;
  rate_percentage: string | number;
  description?: string | null;
  country?: string | null;
  is_default: boolean;
  is_active: boolean;
  effective_from?: string | null;
  effective_until?: string | null;
};
 
type FormState = {
  wht_code: string;
  wht_name: string;
  wht_type: string;
  rate_percentage: string;
  description: string;
  country: string;
  is_default: string;
  is_active: string;
  effective_from: string;
  effective_until: string;
};
 
const emptyForm: FormState = {
  wht_code: "",
  wht_name: "",
  wht_type: "income_tax",
  rate_percentage: "0",
  description: "",
  country: "",
  is_default: "false",
  is_active: "true",
  effective_from: "",
  effective_until: "",
};
 
export default function WithholdingTaxCodesSettingsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<WithholdingTaxCodeType | null>(null);
  const [deleteCode, setDeleteCode] = useState<WithholdingTaxCodeType | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [feedback, setFeedback] = useState("");
 
  const { data, isLoading } = useQuery({
    queryKey: ["o2c-withholding-tax-codes"],
    queryFn: async () => {
      const response = await apiFetch("/settings/o2c/withholding-tax-codes");
      return response.json();
    },
  });
 
  const whtCodes: WithholdingTaxCodeType[] = data?.data ?? [];
 
  const filteredCodes = whtCodes.filter((code) => {
    const term = search.toLowerCase();
    const matchesSearch =
      code.wht_code.toLowerCase().includes(term) ||
      code.wht_name.toLowerCase().includes(term) ||
      (code.description ?? "").toLowerCase().includes(term);
 
    if (filterActive === "active") return matchesSearch && code.is_active;
    if (filterActive === "inactive") return matchesSearch && !code.is_active;
    return matchesSearch;
  });
 
  const resetForm = () => {
    setForm(emptyForm);
    setFeedback("");
  };
 
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        wht_code: form.wht_code,
        wht_name: form.wht_name,
        wht_type: form.wht_type,
        rate_percentage: Number(form.rate_percentage || 0),
        description: form.description || null,
        country: form.country || null,
        is_default: form.is_default === "true",
        is_active: form.is_active === "true",
        effective_from: form.effective_from || null,
        effective_until: form.effective_until || null,
      };
 
      const response = await apiFetch(
        editingCode ? `/settings/o2c/withholding-tax-codes/${editingCode.id}` : "/settings/o2c/withholding-tax-codes",
        {
          method: editingCode ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
 
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message ?? "Unable to save withholding tax code.");
      }
 
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["o2c-withholding-tax-codes"] });
      setCreateOpen(false);
      setEditingCode(null);
      resetForm();
      setFeedback("Withholding tax code saved successfully.");
    },
    onError: (error: Error) => setFeedback(error.message),
  });
 
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiFetch(`/settings/o2c/withholding-tax-codes/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message ?? "Unable to delete withholding tax code.");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["o2c-withholding-tax-codes"] });
      setDeleteCode(null);
      setFeedback("Withholding tax code deleted successfully.");
    },
    onError: (error: Error) => setFeedback(error.message),
  });
 
  const openCreate = () => {
    setEditingCode(null);
    resetForm();
    setCreateOpen(true);
  };
 
  const openEdit = (code: WithholdingTaxCodeType) => {
    setEditingCode(code);
    setForm({
      wht_code: code.wht_code,
      wht_name: code.wht_name,
      wht_type: code.wht_type,
      rate_percentage: String(code.rate_percentage ?? 0),
      description: code.description ?? "",
      country: code.country ?? "",
      is_default: code.is_default ? "true" : "false",
      is_active: code.is_active ? "true" : "false",
      effective_from: code.effective_from ? code.effective_from.split("T")[0] : "",
      effective_until: code.effective_until ? code.effective_until.split("T")[0] : "",
    });
    setFeedback("");
    setCreateOpen(true);
  };
 
  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <BackToSettings />
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Withholding Tax (WHT) Codes</CardTitle>
            </div>
            <CardDescription>Manage withholding tax types and rates used to deduct tax at source on line items.</CardDescription>
          </div>
          <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="mr-2 h-4 w-4" /> Add WHT Code
          </Button>
        </CardHeader>
        {feedback ? (
          <CardContent className="pt-0">
            <Badge variant="info">{feedback}</Badge>
          </CardContent>
        ) : null}
      </Card>
 
      <Card>
        <CardContent className="pt-6 space-y-4">
          <FilterBar>
            <div className="flex-1">
              <FilterBarSearch value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by WHT code or name..." />
            </div>
            <Select value={filterActive} onChange={(e) => setFilterActive(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </Select>
          </FilterBar>
 
          {isLoading ? (
            <div className="flex items-center justify-center p-8 text-muted-foreground">
              <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Loading WHT codes...
            </div>
          ) : (
            <TableShell>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>WHT Code</TableHeaderCell>
                    <TableHeaderCell>WHT Name</TableHeaderCell>
                    <TableHeaderCell>Type</TableHeaderCell>
                    <TableHeaderCell>Rate (%)</TableHeaderCell>
                    <TableHeaderCell>Effective Dates</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell className="text-right">Actions</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredCodes.length === 0 ? (
                    <TableEmpty colSpan={7}>No withholding tax codes found.</TableEmpty>
                  ) : (
                    filteredCodes.map((code) => (
                      <TableRow key={code.id}>
                        <TableCell className="font-semibold flex items-center gap-2">
                          {code.wht_code}
                          {code.is_default && <Badge variant="brand">Default</Badge>}
                        </TableCell>
                        <TableCell>{code.wht_name}</TableCell>
                        <TableCell className="capitalize">{code.wht_type.replace("_", " ")}</TableCell>
                        <TableCell className="font-mono">{code.rate_percentage}%</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {code.effective_from ? new Date(code.effective_from).toLocaleDateString() : "Always"} -{" "}
                          {code.effective_until ? new Date(code.effective_until).toLocaleDateString() : "Always"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={code.is_active ? "success" : "neutral"}>
                            {code.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button size="icon" variant="ghost" onClick={() => openEdit(code)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => setDeleteCode(code)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableShell>
          )}
        </CardContent>
      </Card>
 
      {/* Create/Edit Modal */}
      <Modal
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            setEditingCode(null);
            resetForm();
          }
        }}
        title={editingCode ? "Edit Withholding Tax Code" : "Create Withholding Tax Code"}
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
              {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium">WHT Code</label>
              <Input value={form.wht_code} onChange={(e) => setForm((c) => ({ ...c, wht_code: e.target.value }))} placeholder="e.g. WHT_23" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">WHT Name</label>
              <Input value={form.wht_name} onChange={(e) => setForm((c) => ({ ...c, wht_name: e.target.value }))} placeholder="e.g. Service Withholding 2%" />
            </div>
          </div>
 
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium">WHT Type</label>
              <Select value={form.wht_type} onChange={(e) => setForm((c) => ({ ...c, wht_type: e.target.value }))}>
                <option value="income_tax">Income Tax</option>
                <option value="service_withholding">Service Withholding</option>
                <option value="professional_service">Professional Service Withholding</option>
                <option value="other">Other</option>
              </Select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Rate Percentage (%)</label>
              <Input type="number" min="0" max="100" step="0.01" value={form.rate_percentage} onChange={(e) => setForm((c) => ({ ...c, rate_percentage: e.target.value }))} />
            </div>
          </div>
 
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Effective From</label>
              <Input type="date" value={form.effective_from} onChange={(e) => setForm((c) => ({ ...c, effective_from: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Effective Until</label>
              <Input type="date" value={form.effective_until} onChange={(e) => setForm((c) => ({ ...c, effective_until: e.target.value }))} />
            </div>
          </div>
 
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Country (Optional)</label>
              <Input value={form.country} onChange={(e) => setForm((c) => ({ ...c, country: e.target.value }))} placeholder="e.g. ID" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Status / Defaults</label>
              <div className="flex gap-4 pt-2">
                <label className="flex items-center gap-2 text-sm select-none">
                  <input type="checkbox" checked={form.is_active === "true"} onChange={(e) => setForm((c) => ({ ...c, is_active: e.target.checked ? "true" : "false" }))} />
                  Active
                </label>
                <label className="flex items-center gap-2 text-sm select-none">
                  <input type="checkbox" checked={form.is_default === "true"} onChange={(e) => setForm((c) => ({ ...c, is_default: e.target.checked ? "true" : "false" }))} />
                  Default WHT Code
                </label>
              </div>
            </div>
          </div>
 
          <div className="grid gap-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea value={form.description} onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))} rows={3} placeholder="Withholding tax description..." />
          </div>
 
          {feedback && <div className="text-xs text-red-500 font-medium">{feedback}</div>}
        </div>
      </Modal>
 
      {/* Delete/Archive Confirmation Modal */}
      <Modal
        open={!!deleteCode}
        onOpenChange={(open) => {
          if (!open) setDeleteCode(null);
        }}
        title="Delete Withholding Tax Code"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteCode(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteCode && deleteMutation.mutate(deleteCode.id)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm Delete
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete the withholding tax code <span className="font-semibold text-foreground">{deleteCode?.wht_code}</span>?
            This will remove the code from choices for new quotations, but historical documents will remain intact.
          </p>
        </div>
      </Modal>
    </div>
  );
}
