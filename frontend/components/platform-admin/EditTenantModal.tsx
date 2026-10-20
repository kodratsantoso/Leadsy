"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/apiFetch";
import { Building2, Sparkles, AlertCircle, ShieldAlert } from "lucide-react";

interface EditTenantModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: any;
  onSuccess: () => void;
}

export function EditTenantModal({ open, onOpenChange, tenant, onSuccess }: EditTenantModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [status, setStatus] = useState("active");
  const [plan, setPlan] = useState("pro");
  const [legalName, setLegalName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [address, setAddress] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [maxUsers, setMaxUsers] = useState("20");
  const [maxLeads, setMaxLeads] = useState("10000");
  const [storageLimitGb, setStorageLimitGb] = useState("50");

  useEffect(() => {
    if (tenant) {
      setName(tenant.name || "");
      setStatus(tenant.status || "active");
      setPlan(tenant.plan || "pro");
      setLegalName(tenant.legal_name || "");
      setBrandName(tenant.brand_name || "");
      setAddress(tenant.address || "");
      setTaxNumber(tenant.tax_number || "");
      setMaxUsers(String(tenant.max_users || 20));
      setMaxLeads(String(tenant.max_leads || 10000));
      setStorageLimitGb(String(tenant.storage_limit_gb || 50));
    }
  }, [tenant]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;

    setError(null);
    setLoading(true);

    try {
      const res = await apiFetch(`/api/platform/tenants/${tenant.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          status,
          plan,
          legal_name: legalName,
          brand_name: brandName,
          address,
          tax_number: taxNumber,
          max_users: parseInt(maxUsers, 10),
          max_leads: parseInt(maxLeads, 10),
          storage_limit_gb: parseInt(storageLimitGb, 10),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "Failed to update tenant.");
      }

      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={`Configure Tenant: ${tenant?.name || ""}`}
      description="Adjust subscription tier, operational status, resource allocations, and corporate parameters."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Status & Plan */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Lifecycle Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={tenant?.id === 1}
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none"
            >
              <option value="active">Active (Operational)</option>
              <option value="trial">Trial Mode</option>
              <option value="suspended">Suspended (Locked)</option>
            </select>
            {tenant?.id === 1 && (
              <span className="text-[11px] text-muted-foreground mt-1 block">Default Workspace (#1) status is locked.</span>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Subscription Plan Tier</label>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none"
            >
              <option value="starter">Starter Plan</option>
              <option value="pro">Professional Plan</option>
              <option value="enterprise">Enterprise Plan</option>
              <option value="trial">14-Day POC / Trial</option>
            </select>
          </div>
        </div>

        {/* Organization Info */}
        <div className="space-y-4 rounded-2xl border border-border/80 bg-accent/20 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Building2 className="h-4 w-4 text-primary" />
            <span>Organization Profile</span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Organization Display Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Legal Entity Name</label>
              <Input
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Brand Name</label>
              <Input
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Tax Number / NPWP</label>
              <Input
                value={taxNumber}
                onChange={(e) => setTaxNumber(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Corporate Address</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none resize-none"
            />
          </div>
        </div>

        {/* Quotas */}
        <div className="space-y-4 rounded-2xl border border-border/80 bg-accent/20 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>Resource Quotas</span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">User Seats Quota</label>
              <Input
                type="number"
                min="1"
                value={maxUsers}
                onChange={(e) => setMaxUsers(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Leads Storage Quota</label>
              <Input
                type="number"
                min="100"
                value={maxLeads}
                onChange={(e) => setMaxLeads(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Disk Limit (GB)</label>
              <Input
                type="number"
                min="1"
                value={storageLimitGb}
                onChange={(e) => setStorageLimitGb(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="bg-primary text-primary-foreground shadow-md"
          >
            {loading ? "Saving Changes..." : "Save Configuration"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
