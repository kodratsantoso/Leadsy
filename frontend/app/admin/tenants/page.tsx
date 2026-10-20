"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Building2, Plus, Search, Shield, Users, Layers,
  CheckCircle2, AlertTriangle, ExternalLink, SlidersHorizontal,
  Lock, Unlock, ArrowRight, UserCheck, HardDrive, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/apiFetch";
import { useAuthStore } from "@/store/useAuthStore";
import { PlatformAdminHeader } from "@/components/platform-admin/PlatformAdminHeader";
import { ProvisionTenantModal } from "@/components/platform-admin/ProvisionTenantModal";
import { EditTenantModal } from "@/components/platform-admin/EditTenantModal";

interface TenantItem {
  id: number;
  name: string;
  slug: string;
  legal_name: string | null;
  brand_name: string | null;
  status: "active" | "suspended" | "trial" | "cancelled";
  logo_path: string | null;
  plan: "starter" | "pro" | "enterprise" | "trial";
  max_users: number;
  max_leads: number;
  storage_limit_gb: number;
  features: Record<string, boolean>;
  users_count: number;
  leads_count: number;
  admin: {
    id: number;
    name: string;
    email: string;
  } | null;
  created_at: string;
}

export default function PlatformAdminTenantsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");

  // Modals
  const [isProvisionOpen, setIsProvisionOpen] = useState(false);
  const [selectedTenantForEdit, setSelectedTenantForEdit] = useState<TenantItem | null>(null);

  const fetchTenants = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await apiFetch(`/api/platform/tenants?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setTenants(json.data || []);
      }
    } catch (e) {
      console.error("Failed to fetch tenants:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const handleToggleStatus = async (tenant: TenantItem) => {
    if (tenant.id === 1) return;
    try {
      const res = await apiFetch(`/api/platform/tenants/${tenant.id}/toggle-status`, {
        method: "PATCH",
      });
      if (res.ok) {
        fetchTenants();
      }
    } catch (e) {
      console.error("Failed to toggle tenant status:", e);
    }
  };

  const handleImpersonate = async (tenant: TenantItem) => {
    try {
      const res = await apiFetch(`/api/platform/tenants/${tenant.id}/impersonate`, {
        method: "POST",
      });
      const json = await res.json();
      if (res.ok && json.data?.token) {
        // Save original superadmin session so banner can restore it anytime
        const currentToken = useAuthStore.getState().token;
        const currentUser = useAuthStore.getState().user;
        if (currentToken && currentUser) {
          localStorage.setItem(
            "leadsy_impersonation_meta",
            JSON.stringify({
              original_token: currentToken,
              original_user: currentUser,
              tenant_name: tenant.name,
              tenant_id: tenant.id,
              started_at: new Date().toISOString(),
            })
          );
        }

        // Store support impersonation token and switch workspace
        if (json.data.user) {
          useAuthStore.getState().setAuth(json.data.token, json.data.user);
        } else {
          useAuthStore.getState().setUser(json.data.user);
        }
        window.location.href = "/dashboard";
      }
    } catch (e) {
      console.error("Failed to impersonate tenant:", e);
    }
  };

  // Filter client-side by plan if selected
  const filteredTenants = tenants.filter((t) => {
    if (planFilter !== "all" && t.plan !== planFilter) return false;
    return true;
  });

  const totalTenantsCount = tenants.length;
  const activeTenantsCount = tenants.filter((t) => t.status === "active").length;
  const totalLeadsCount = tenants.reduce((acc, t) => acc + (t.leads_count || 0), 0);
  const totalUsersCount = tenants.reduce((acc, t) => acc + (t.users_count || 0), 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* SaaS Admin Header */}
      <PlatformAdminHeader
        onRefresh={() => {
          setRefreshing(true);
          fetchTenants();
        }}
        isRefreshing={refreshing}
      />

      {/* Overview Stat Bento */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Active Workspaces</span>
            <div className="rounded-xl bg-primary/10 p-2 text-primary">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">{activeTenantsCount}</span>
            <span className="text-xs text-muted-foreground">of {totalTenantsCount} total</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-emerald-500 font-medium">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>100% Tenant Data Isolation Active</span>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Platform Total Leads</span>
            <div className="rounded-xl bg-blue-500/10 p-2 text-blue-500">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">{totalLeadsCount.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground">across all tenants</span>
          </div>
          <div className="mt-3 text-[11px] text-muted-foreground">
            Strictly partitioned by Eloquent TenantScope
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total Customer Users</span>
            <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-500">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">{totalUsersCount}</span>
            <span className="text-xs text-muted-foreground">registered seats</span>
          </div>
          <div className="mt-3 text-[11px] text-muted-foreground">
            Scoped RBAC & Role Hierarchy per tenant
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Platform Infrastructure</span>
            <div className="rounded-xl bg-purple-500/10 p-2 text-purple-500">
              <Shield className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-lg font-bold tracking-tight text-foreground">K3s Cluster</span>
            <span className="text-xs text-emerald-500 font-semibold">Healthy</span>
          </div>
          <div className="mt-3 text-[11px] text-muted-foreground">
            PostgreSQL Persistent Volume (PV SSOT)
          </div>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search tenant name or slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-xl border-border bg-card text-sm"
            />
          </div>

          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none shadow-sm"
          >
            <option value="all">All Plans</option>
            <option value="enterprise">Enterprise</option>
            <option value="pro">Professional</option>
            <option value="starter">Starter</option>
            <option value="trial">Trial</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none shadow-sm"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="trial">Trial</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        <Button
          onClick={() => setIsProvisionOpen(true)}
          className="rounded-xl bg-primary text-primary-foreground shadow-md hover:bg-primary/90 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          <span>Provision New Tenant</span>
        </Button>
      </div>

      {/* Tenants Table */}
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-muted-foreground">
            <thead className="border-b border-border bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-6 py-4">Workspace / Tenant</th>
                <th className="px-6 py-4">Subscription Plan</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Resource Utilization</th>
                <th className="px-6 py-4">Primary Admin</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <RefreshCw className="mx-auto h-6 w-6 animate-spin text-primary" />
                    <p className="mt-2 text-xs text-muted-foreground">Loading SaaS tenants...</p>
                  </td>
                </tr>
              ) : filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Building2 className="mx-auto h-8 w-8 text-muted-foreground/50" />
                    <p className="mt-2 text-sm font-medium text-foreground">No tenants found</p>
                    <p className="text-xs text-muted-foreground">Try adjusting your search criteria or provision a new organization.</p>
                  </td>
                </tr>
              ) : (
                filteredTenants.map((tenant) => {
                  const userUsagePercent = Math.min(Math.round(((tenant.users_count || 0) / (tenant.max_users || 1)) * 100), 100);
                  const leadUsagePercent = Math.min(Math.round(((tenant.leads_count || 0) / (tenant.max_leads || 1)) * 100), 100);

                  const isDefaultWorkspace = tenant.id === 1;

                  return (
                    <tr key={tenant.id} className="transition-colors hover:bg-muted/20">
                      {/* Organization Info */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary font-bold text-sm shadow-sm">
                            {tenant.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground">{tenant.name}</span>
                              {isDefaultWorkspace && (
                                <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                                  Default Root
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="font-mono text-[11px] text-muted-foreground/80">#{tenant.id}</span>
                              <span>•</span>
                              <span className="font-mono text-primary/80">{tenant.slug}</span>
                              {tenant.legal_name && tenant.legal_name !== tenant.name && (
                                <>
                                  <span>•</span>
                                  <span className="truncate max-w-[140px]">{tenant.legal_name}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Subscription Plan */}
                      <td className="px-6 py-4">
                        <Badge
                          variant="outline"
                          className={
                            tenant.plan === "enterprise"
                              ? "border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400 font-semibold uppercase text-[10px]"
                              : tenant.plan === "pro"
                              ? "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold uppercase text-[10px]"
                              : tenant.plan === "starter"
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold uppercase text-[10px]"
                              : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold uppercase text-[10px]"
                          }
                        >
                          {tenant.plan}
                        </Badge>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              tenant.status === "active"
                                ? "bg-emerald-500 animate-pulse"
                                : tenant.status === "trial"
                                ? "bg-amber-500"
                                : "bg-destructive"
                            }`}
                          />
                          <span className="capitalize text-xs font-medium text-foreground">
                            {tenant.status}
                          </span>
                        </div>
                      </td>

                      {/* Resource Utilization */}
                      <td className="px-6 py-4">
                        <div className="w-48 space-y-2">
                          <div>
                            <div className="flex justify-between text-[11px]">
                              <span>Seats: {tenant.users_count} / {tenant.max_users}</span>
                              <span className="font-mono text-muted-foreground">{userUsagePercent}%</span>
                            </div>
                            <div className="mt-1 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  userUsagePercent > 90 ? "bg-destructive" : userUsagePercent > 75 ? "bg-amber-500" : "bg-primary"
                                }`}
                                style={{ width: `${userUsagePercent}%` }}
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-[11px]">
                              <span>Leads: {tenant.leads_count.toLocaleString()} / {tenant.max_leads.toLocaleString()}</span>
                              <span className="font-mono text-muted-foreground">{leadUsagePercent}%</span>
                            </div>
                            <div className="mt-1 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  leadUsagePercent > 90 ? "bg-destructive" : leadUsagePercent > 75 ? "bg-amber-500" : "bg-blue-500"
                                }`}
                                style={{ width: `${leadUsagePercent}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Primary Admin */}
                      <td className="px-6 py-4">
                        {tenant.admin ? (
                          <div className="text-xs">
                            <p className="font-medium text-foreground">{tenant.admin.name}</p>
                            <p className="text-muted-foreground font-mono text-[11px]">{tenant.admin.email}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">None assigned</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedTenantForEdit(tenant)}
                            className="h-8 rounded-lg px-2 text-xs hover:bg-muted"
                            title="Edit Tenant Quotas & Parameters"
                          >
                            <SlidersHorizontal className="h-3.5 w-3.5" />
                          </Button>

                          {!isDefaultWorkspace && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleStatus(tenant)}
                              className={`h-8 rounded-lg px-2 text-xs hover:bg-muted ${
                                tenant.status === "active" ? "text-amber-500 hover:text-amber-600" : "text-emerald-500 hover:text-emerald-600"
                              }`}
                              title={tenant.status === "active" ? "Suspend Tenant" : "Activate Tenant"}
                            >
                              {tenant.status === "active" ? (
                                <Lock className="h-3.5 w-3.5" />
                              ) : (
                                <Unlock className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleImpersonate(tenant)}
                            className="h-8 rounded-lg px-2.5 text-xs border-border hover:bg-accent text-primary flex items-center gap-1"
                            title="Impersonate / Assist Workspace as Tenant Admin"
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Assist</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Provisioning Modal */}
      <ProvisionTenantModal
        open={isProvisionOpen}
        onOpenChange={setIsProvisionOpen}
        onSuccess={() => {
          fetchTenants();
        }}
      />

      {/* Edit Tenant Modal */}
      <EditTenantModal
        open={Boolean(selectedTenantForEdit)}
        onOpenChange={(open) => !open && setSelectedTenantForEdit(null)}
        tenant={selectedTenantForEdit}
        onSuccess={() => {
          setSelectedTenantForEdit(null);
          fetchTenants();
        }}
      />
    </div>
  );
}
