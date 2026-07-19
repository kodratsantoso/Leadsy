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
 
type TaxCodeType = {
  id: number;
  tax_code: string;
  tax_name: string;
  tax_type: string;
  rate_percentage: string | number;
  description?: string | null;
  country?: string | null;
  is_default: boolean;
  is_active: boolean;
  effective_from?: string | null;
  effective_until?: string | null;
};
 
type FormState = {
  tax_code: string;
  tax_name: string;
  tax_type: string;
  rate_percentage: string;
  description: string;
  country: string;
  is_default: string;
  is_active: string;
  effective_from: string;
  effective_until: string;
};
 
const emptyForm: FormState = {
  tax_code: "",
  tax_name: "",
  tax_type: "vat",
  rate_percentage: "0",
  description: "",
  country: "",
  is_default: "false",
  is_active: "true",
  effective_from: "",
  effective_until: "",
};
 
export default function TaxCodesSettingsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<TaxCodeType | null>(null);
  const [deleteCode, setDeleteCode] = useState<TaxCodeType | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [feedback, setFeedback] = useState("");
 
  const { data, isLoading } = useQuery({
    queryKey: ["o2c-tax-codes"],
    queryFn: async () => {
      const response = await apiFetch("/settings/o2c/tax-codes");
      return response.json();
    },
  });
 
  const taxCodes: TaxCodeType[] = data?.data ?? [];
 
  const filteredCodes = taxCodes.filter((code) => {
    const term = search.toLowerCase();
    const matchesSearch =
      code.tax_code.toLowerCase().includes(term) ||
      code.tax_name.toLowerCase().includes(term) ||
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
        tax_code: form.tax_code,
        tax_name: form.tax_name,
        tax_type: form.tax_type,
        rate_percentage: Number(form.rate_percentage || 0),
        description: form.description || null,
        country: form.country || null,
        is_default: form.is_default === "true",
        is_active: form.is_active === "true",
        effective_from: form.effective_from || null,
        effective_until: form.effective_until || null,
      };
 
      const response = await apiFetch(
        editingCode ? `/settings/o2c/tax-codes/${editingCode.id}` : "/settings/o2c/tax-codes",
        {
          method: editingCode ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
 
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message ?? "Unable to save tax code.");
      }
 
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["o2c-tax-codes"] });
      setCreateOpen(false);
      setEditingCode(null);
      resetForm();
      setFeedback("Tax code saved successfully.");
    },
    onError: (error: Error) => setFeedback(error.message),
  });
 
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiFetch(`/settings/o2c/tax-codes/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message ?? "Unable to delete tax code.");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["o2c-tax-codes"] });
      setDeleteCode(null);
      setFeedback("Tax code deleted successfully.");
    },
    onError: (error: Error) => setFeedback(error.message),
  });
 
  const openCreate = () => {
    setEditingCode(null);
    resetForm();
    setCreateOpen(true);
  };
 
  const openEdit = (code: TaxCodeType) => {
    setEditingCode(code);
    setForm({
      tax_code: code.tax_code,
      tax_name: code.tax_name,
      tax_type: code.tax_type,
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
              <CardTitle>Tax Codes</CardTitle>
            </div>
            <CardDescription>Manage your VAT, Sales Tax, and other tax types for quotations and orders.</CardDescription>
          </div>
          <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="mr-2 h-4 w-4" /> Add Tax Code
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
              <FilterBarSearch value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by tax code or name..." />
            </div>
            <Select value={filterActive} onChange={(e) => setFilterActive(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </Select>
          </FilterBar>
 
          {isLoading ? (
            <div className="flex items-center justify-center p-8 text-muted-foreground">
              <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Loading tax codes...
            </div>
          ) : (
            <TableShell>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Tax Code</TableHeaderCell>
                    <TableHeaderCell>Tax Name</TableHeaderCell>
                    <TableHeaderCell>Type</TableHeaderCell>
                    <TableHeaderCell>Rate (%)</TableHeaderCell>
                    <TableHeaderCell>Effective Dates</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell className="text-right">Actions</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredCodes.length === 0 ? (
                    <TableEmpty colSpan={7}>No tax codes found.</TableEmpty>
                  ) : (
                    filteredCodes.map((code) => (
                      <TableRow key={code.id}>
                        <TableCell className="font-semibold flex items-center gap-2">
                          {code.tax_code}
                          {code.is_default && <Badge variant="brand">Default</Badge>}
                        </TableCell>
                        <TableCell>{code.tax_name}</TableCell>
                        <TableCell className="capitalize">{code.tax_type.replace("_", " ")}</TableCell>
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
        title={editingCode ? "Edit Tax Code" : "Create Tax Code"}
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
              <label className="text-sm font-medium">Tax Code</label>
              <Input value={form.tax_code} onChange={(e) => setForm((c) => ({ ...c, tax_code: e.target.value }))} placeholder="e.g. VAT_12" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Tax Name</label>
              <Input value={form.tax_name} onChange={(e) => setForm((c) => ({ ...c, tax_name: e.target.value }))} placeholder="e.g. Value Added Tax 12%" />
            </div>
          </div>
 
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Tax Type</label>
              <Select value={form.tax_type} onChange={(e) => setForm((c) => ({ ...c, tax_type: e.target.value }))}>
                <option value="vat">Value Added Tax (VAT)</option>
                <option value="sales_tax">Sales Tax</option>
                <option value="service_tax">Service Tax</option>
                <option value="non_taxable">Non-Taxable</option>
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
                  Default Tax Code
                </label>
              </div>
            </div>
          </div>
 
          <div className="grid gap-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea value={form.description} onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))} rows={3} placeholder="Tax explanation and details..." />
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
        title="Delete Tax Code"
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
            Are you sure you want to delete the tax code <span className="font-semibold text-foreground">{deleteCode?.tax_code}</span>?
            This will remove the tax code from choices for new quotations, but historical documents will remain intact.
          </p>
        </div>
      </Modal>
    </div>
  );
}
