"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Loader2, Plus, Building2, Upload, Trash2, Shield, Check, CreditCard, Pencil, ToggleLeft } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { BackToSettings } from "@/app/settings/_components/back-to-settings";

export default function CompanySettingsPage() {
  const qc = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Bank modal state
  const [showBankModal, setShowBankModal] = useState(false);
  const [editingBank, setEditingBank] = useState<any>(null);
  const [bankForm, setBankForm] = useState({
    bank_name: "",
    account_number: "",
    account_name: "",
    currency: "IDR",
    notes: "",
  });

  // Fetch Company Settings (Tenant)
  const { data: companyData, isLoading: loadingCompany } = useQuery({
    queryKey: ["company-settings"],
    queryFn: () => apiFetch("/settings/company").then(r => r.json()),
  });
  const tenant = companyData?.data || {};

  // Fetch Bank Accounts
  const { data: banksData, isLoading: loadingBanks } = useQuery({
    queryKey: ["company-bank-accounts"],
    queryFn: () => apiFetch("/settings/company/bank-accounts").then(r => r.json()),
  });
  const bankAccounts = banksData?.data || [];

  // Update Settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (payload: any) =>
      apiFetch("/settings/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then(async r => {
        if (!r.ok) throw new Error((await r.json()).message || "Failed to update settings");
        return r.json();
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-settings"] });
      setSuccessMessage("Company settings updated successfully.");
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (e: any) => {
      setErrorMessage(e.message);
      setTimeout(() => setErrorMessage(null), 5000);
    },
  });

  // Logo upload mutation
  const uploadLogoMutation = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append("logo", file);
      return apiFetch("/settings/company/logo", {
        method: "POST",
        body: fd,
      }).then(async r => {
        if (!r.ok) throw new Error((await r.json()).message || "Failed to upload logo");
        return r.json();
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-settings"] });
      setSuccessMessage("Company logo uploaded.");
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (e: any) => {
      setErrorMessage(e.message);
      setTimeout(() => setErrorMessage(null), 5000);
    },
  });

  // Remove logo mutation
  const removeLogoMutation = useMutation({
    mutationFn: () =>
      apiFetch("/settings/company/logo", { method: "DELETE" }).then(async r => {
        if (!r.ok) throw new Error("Failed to remove logo");
        return r.json();
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-settings"] });
      setSuccessMessage("Company logo removed.");
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (e: any) => {
      setErrorMessage(e.message);
      setTimeout(() => setErrorMessage(null), 5000);
    },
  });

  // Signatory upload mutation
  const uploadSignatoryMutation = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append("signatory_image", file);
      return apiFetch("/settings/company/signatory", {
        method: "POST",
        body: fd,
      }).then(async r => {
        if (!r.ok) throw new Error((await r.json()).message || "Failed to upload signature");
        return r.json();
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-settings"] });
      setSuccessMessage("Signatory signature uploaded.");
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (e: any) => {
      setErrorMessage(e.message);
      setTimeout(() => setErrorMessage(null), 5000);
    },
  });

  // Bank Account mutations
  const createBankMutation = useMutation({
    mutationFn: (payload: any) =>
      apiFetch("/settings/company/bank-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then(async r => {
        if (!r.ok) throw new Error((await r.json()).message || "Failed to add bank account");
        return r.json();
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-bank-accounts"] });
      setShowBankModal(false);
      setSuccessMessage("Bank account added.");
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (e: any) => {
      setErrorMessage(e.message);
      setTimeout(() => setErrorMessage(null), 5000);
    },
  });

  const updateBankMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) =>
      apiFetch(`/settings/company/bank-accounts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then(async r => {
        if (!r.ok) throw new Error((await r.json()).message || "Failed to update bank account");
        return r.json();
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-bank-accounts"] });
      setShowBankModal(false);
      setSuccessMessage("Bank account updated.");
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (e: any) => {
      setErrorMessage(e.message);
      setTimeout(() => setErrorMessage(null), 5000);
    },
  });

  const deleteBankMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/settings/company/bank-accounts/${id}`, { method: "DELETE" }).then(async r => {
        if (!r.ok) throw new Error("Failed to delete bank account");
        return r.json();
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["company-bank-accounts"] });
      setSuccessMessage(res.message || "Bank account removed.");
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (e: any) => {
      setErrorMessage(e.message);
      setTimeout(() => setErrorMessage(null), 5000);
    },
  });

  const setDefaultBankMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/settings/company/bank-accounts/${id}/set-default`, {
        method: "POST",
      }).then(async r => {
        if (!r.ok) throw new Error("Failed to set default bank account");
        return r.json();
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-bank-accounts"] });
      setSuccessMessage("Default bank account updated.");
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (e: any) => {
      setErrorMessage(e.message);
      setTimeout(() => setErrorMessage(null), 5000);
    },
  });

  const handleSaveSettings = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    updateSettingsMutation.mutate({
      legal_name: fd.get("legal_name"),
      brand_name: fd.get("brand_name"),
      address: fd.get("address"),
      tax_number: fd.get("tax_number"),
      signatory_name: fd.get("signatory_name"),
      signatory_position: fd.get("signatory_position"),
    });
  };

  const handleOpenAddBank = () => {
    setEditingBank(null);
    setBankForm({
      bank_name: "",
      account_number: "",
      account_name: "",
      currency: "IDR",
      notes: "",
    });
    setShowBankModal(true);
  };

  const handleOpenEditBank = (bank: any) => {
    setEditingBank(bank);
    setBankForm({
      bank_name: bank.bank_name,
      account_number: bank.account_number,
      account_name: bank.account_name,
      currency: bank.currency || "IDR",
      notes: bank.notes || "",
    });
    setShowBankModal(true);
  };

  const handleSaveBank = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBank) {
      updateBankMutation.mutate({ id: editingBank.id, payload: bankForm });
    } else {
      createBankMutation.mutate(bankForm);
    }
  };

  const getStorageUrl = (path?: string) => {
    if (!path) return "";
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    return `${baseUrl}/storage/${path}`;
  };

  if (loadingCompany) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <div className="space-y-1">
            <BackToSettings />
            <CardTitle>Company Settings</CardTitle>
            <CardDescription>
              Configure legal entity data, bank information, and branding defaults for documents.
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      {successMessage && (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800 text-sm">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="bg-destructive/10 text-destructive p-3 rounded-lg border border-destructive/20 text-sm">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Brand & Signatory Settings Form */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSaveSettings}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Company Legal Brand
                </CardTitle>
                <CardDescription>
                  Legal entity and physical branding info printed on Quotations and Sales Orders.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Company Legal Name</label>
                    <Input name="legal_name" defaultValue={tenant.legal_name || ""} placeholder="PT. Prasetia Dwidharma" required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Brand Name</label>
                    <Input name="brand_name" defaultValue={tenant.brand_name || ""} placeholder="Prasetia" required />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Tax Identification Number (NPWP)</label>
                  <Input name="tax_number" defaultValue={tenant.tax_number || ""} placeholder="XX.XXX.XXX.X-XXX.XXX" />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Company HQ Address</label>
                  <textarea 
                    name="address" 
                    defaultValue={tenant.address || ""} 
                    placeholder="Enter company billing address..." 
                    rows={3} 
                    required 
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
                  />
                </div>


                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={updateSettingsMutation.isPending}>
                    {updateSettingsMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>

          {/* Bank Accounts Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Company Bank Accounts
                </CardTitle>
                <CardDescription>
                  Manage active bank accounts available for invoice and quotation payment settlement.
                </CardDescription>
              </div>
              <Button onClick={handleOpenAddBank} size="sm">
                <Plus className="h-4 w-4 mr-2" /> Add Bank
              </Button>
            </CardHeader>
            <CardContent>
              {loadingBanks ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : bankAccounts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-lg">
                  No bank accounts added yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {bankAccounts.map((bank: any) => (
                    <div key={bank.id} className={`p-4 border rounded-lg flex flex-col justify-between relative bg-card ${!bank.is_active ? 'opacity-50' : ''}`}>
                      <div className="space-y-1">
                        <div className="flex items-start justify-between">
                          <h4 className="font-bold text-sm text-foreground">{bank.bank_name}</h4>
                          <div className="flex gap-2">
                            {bank.is_default && <Badge variant="success">Default</Badge>}
                            {!bank.is_active && <Badge variant="neutral">Inactive</Badge>}
                          </div>
                        </div>
                        <p className="text-sm font-semibold font-mono tracking-wider">{bank.account_number}</p>
                        <p className="text-xs text-muted-foreground font-semibold">{bank.account_name}</p>
                      </div>
                      
                      <div className="flex justify-end gap-2 border-t border-border pt-3 mt-4">
                        {bank.is_active && !bank.is_default && (
                          <Button variant="outline" size="xs" onClick={() => setDefaultBankMutation.mutate(bank.id)}>
                            Set Default
                          </Button>
                        )}
                        <Button variant="ghost" size="xs" onClick={() => handleOpenEditBank(bank)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="xs" className="text-destructive hover:bg-destructive/10" onClick={() => {
                          if (confirm("Are you sure you want to remove or deactivate this bank account?")) {
                            deleteBankMutation.mutate(bank.id);
                          }
                        }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Logo Uploads Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Company Logo</CardTitle>
              <CardDescription>Brand identity logo displayed in generated commercial files.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center space-y-4">
              <div className="h-28 w-full border border-dashed border-border rounded-lg flex items-center justify-center overflow-hidden bg-slate-50 relative p-4">
                {tenant.logo_path ? (
                  <img src={getStorageUrl(tenant.logo_path)} className="max-h-full max-w-full object-contain" alt="Preview Logo" />
                ) : (
                  <div className="text-center text-xs text-muted-foreground flex flex-col items-center gap-1">
                    <Building2 className="h-8 w-8 text-slate-300" />
                    No Brand Logo Uploaded
                  </div>
                )}
              </div>
              <div className="flex gap-2 w-full">
                <label className="flex-1">
                  <span className="w-full inline-flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/95 h-9 rounded-md text-sm font-medium cursor-pointer">
                    <Upload className="h-4 w-4 mr-2" /> Upload
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/png, image/jpeg, image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadLogoMutation.mutate(file);
                    }}
                  />
                </label>
                {tenant.logo_path && (
                  <Button variant="outline" onClick={() => removeLogoMutation.mutate()} disabled={removeLogoMutation.isPending}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* Add/Edit Bank Modal */}
      <Modal open={showBankModal} onOpenChange={(v) => !v && setShowBankModal(false)} title={editingBank ? "Edit Bank Account" : "Add Bank Account"}>
        <form onSubmit={handleSaveBank} className="space-y-4 pt-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Bank Name</label>
            <Input
              value={bankForm.bank_name}
              onChange={(e) => setBankForm((f) => ({ ...f, bank_name: e.target.value }))}
              placeholder="Maybank Bank"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Account Number</label>
            <Input
              value={bankForm.account_number}
              onChange={(e) => setBankForm((f) => ({ ...f, account_number: e.target.value }))}
              placeholder="2774000946"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Account Name</label>
            <Input
              value={bankForm.account_name}
              onChange={(e) => setBankForm((f) => ({ ...f, account_name: e.target.value }))}
              placeholder="PT. Prasetia Dwidharma"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Currency</label>
            <Input
              value={bankForm.currency}
              onChange={(e) => setBankForm((f) => ({ ...f, currency: e.target.value }))}
              placeholder="IDR"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Notes</label>
            <textarea
              value={bankForm.notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBankForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Optional payment description or routing codes..."
              rows={2}
              className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowBankModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createBankMutation.isPending || updateBankMutation.isPending}>
              Save Bank
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
