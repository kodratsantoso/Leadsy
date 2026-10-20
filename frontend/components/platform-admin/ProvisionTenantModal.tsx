"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/apiFetch";
import { Building2, User, Key, Sparkles, AlertCircle, CheckCircle2, ShieldCheck, Check } from "lucide-react";

interface ProvisionTenantModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ProvisionTenantModal({ open, onOpenChange, onSuccess }: ProvisionTenantModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [legalName, setLegalName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [plan, setPlan] = useState<"starter" | "pro" | "enterprise" | "trial">("pro");
  const [maxUsers, setMaxUsers] = useState("20");
  const [maxLeads, setMaxLeads] = useState("10000");
  const [storageLimitGb, setStorageLimitGb] = useState("50");

  // Feature flags
  const [features, setFeatures] = useState({
    ai_profiling: true,
    whatsapp_crm: true,
    map_territory: true,
    lark_integration: true,
    order_to_cash: true,
  });

  // Admin user
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slug || slug === name.toLowerCase().replace(/[^a-z0-9]/g, "-")) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    }
  };

  const handlePlanSelect = (selectedPlan: "starter" | "pro" | "enterprise" | "trial") => {
    setPlan(selectedPlan);
    if (selectedPlan === "starter") {
      setMaxUsers("5");
      setMaxLeads("1000");
      setStorageLimitGb("10");
    } else if (selectedPlan === "pro") {
      setMaxUsers("20");
      setMaxLeads("10000");
      setStorageLimitGb("50");
    } else if (selectedPlan === "enterprise") {
      setMaxUsers("100");
      setMaxLeads("500000");
      setStorageLimitGb("500");
    } else if (selectedPlan === "trial") {
      setMaxUsers("3");
      setMaxLeads("500");
      setStorageLimitGb("5");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name || !slug || !adminName || !adminEmail || !adminPassword) {
      setError("Please fill in all mandatory fields.");
      return;
    }

    if (adminPassword.length < 8) {
      setError("Admin password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const res = await apiFetch("/api/platform/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          legal_name: legalName || name,
          brand_name: brandName || name,
          plan,
          max_users: parseInt(maxUsers, 10),
          max_leads: parseInt(maxLeads, 10),
          storage_limit_gb: parseInt(storageLimitGb, 10),
          features,
          admin_name: adminName,
          admin_email: adminEmail,
          admin_password: adminPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || "Failed to provision tenant.");
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
      title="Provision New SaaS Tenant"
      description="Create an isolated organization workspace with dedicated quotas and initial workspace administrator."
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Section 1: Tenant Information */}
        <div className="rounded-2xl border border-border/80 bg-accent/20 p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Building2 className="h-4 w-4 text-primary" />
            <span>1. Organization & Workspace Details</span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Company / Organization Name *</label>
              <Input
                placeholder="e.g. Acme Corporation"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Workspace Slug / Subdomain *</label>
              <div className="mt-1 flex items-center rounded-xl border border-input bg-background px-3">
                <span className="text-xs text-muted-foreground font-mono">leadsy.app/</span>
                <input
                  type="text"
                  placeholder="acme"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  required
                  className="w-full bg-transparent py-2 pl-1 text-sm outline-none font-mono"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Legal Entity Name (Optional)</label>
              <Input
                placeholder="PT. Acme Global Indonesia"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Brand Display Name (Optional)</label>
              <Input
                placeholder="Acme Inc."
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Plan Tier & Quotas */}
        <div className="rounded-2xl border border-border/80 bg-accent/20 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>2. Subscription Plan & Resource Limits</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(["starter", "pro", "enterprise", "trial"] as const).map((tier) => (
              <button
                key={tier}
                type="button"
                onClick={() => handlePlanSelect(tier)}
                className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${
                  plan === tier
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-border/60 bg-card hover:border-primary/50"
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                    {tier}
                  </span>
                  {plan === tier && <Check className="h-3.5 w-3.5 text-primary" />}
                </div>
                <span className="mt-1 text-[11px] text-muted-foreground">
                  {tier === "enterprise" ? "Unlimited Scale" : tier === "pro" ? "Growth Team" : tier === "starter" ? "Core CRM" : "14-Day POC"}
                </span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Max User Seats</label>
              <Input
                type="number"
                min="1"
                value={maxUsers}
                onChange={(e) => setMaxUsers(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Max Leads Quota</label>
              <Input
                type="number"
                min="100"
                value={maxLeads}
                onChange={(e) => setMaxLeads(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Storage Limit (GB)</label>
              <Input
                type="number"
                min="1"
                value={storageLimitGb}
                onChange={(e) => setStorageLimitGb(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="text-xs font-medium text-muted-foreground block mb-2">Enabled Enterprise Modules</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 text-xs">
              {Object.entries({
                ai_profiling: "AI Lead Profiling",
                whatsapp_crm: "WhatsApp BSP Sync",
                map_territory: "Map & Radar Engine",
                lark_integration: "Lark Suite Sync",
                order_to_cash: "Order-to-Cash (SO/BOM)",
              }).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={features[key as keyof typeof features]}
                    onChange={(e) => setFeatures({ ...features, [key]: e.target.checked })}
                    className="rounded border-input text-primary focus:ring-primary"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Section 3: Workspace Admin Credentials */}
        <div className="rounded-2xl border border-border/80 bg-accent/20 p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Key className="h-4 w-4 text-primary" />
            <span>3. Initial Tenant Administrator</span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Admin Full Name *</label>
              <Input
                placeholder="John Doe"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                required
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Admin Work Email *</label>
              <Input
                type="email"
                placeholder="admin@acme.com"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                required
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Initial Password * (min 8 chars)</label>
              <Input
                type="password"
                placeholder="••••••••••••"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                required
                minLength={8}
                className="mt-1"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
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
            className="bg-primary text-primary-foreground shadow-lg shadow-primary/20"
          >
            {loading ? "Provisioning..." : "Provision Tenant Workspace"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
