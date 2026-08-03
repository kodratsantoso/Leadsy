"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Loader2, Pencil, Plus, Trash2, ChevronRight, Users, Calendar } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { BackToSettings } from "@/app/settings/_components/back-to-settings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { 
  getPsRoles, 
  createPsRole, 
  updatePsRole, 
  deletePsRole,
  createPsRateCard,
  updatePsRateCard,
  PsRole,
  PsRateCard
} from "@/lib/api/professional-services";
import { apiFetch } from "@/lib/apiFetch";
import { useNumberFormat } from "@/lib/hooks/use-number-format";

export default function PsRolesPage() {
  const pathname = usePathname();
  const qc = useQueryClient();
  const { formatAmountInput, normalizeAmountInput } = useNumberFormat();
  
  const { data: currencyData } = useQuery({
    queryKey: ["currency-settings"],
    queryFn: async () => {
      const response = await apiFetch("/settings/currency");
      return response.json();
    },
  });
  const currencies = currencyData?.data?.currencies ?? [];
  const idrRate = Number(currencies.find((c: any) => c.code === "IDR")?.exchange_rate || 1);
  const usdRate = Number(currencies.find((c: any) => c.code === "USD")?.exchange_rate || 1);

  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editRole, setEditRole] = useState<PsRole | null>(null);
  const [formRole, setFormRole] = useState({ name: "", description: "", is_active: true, rate_per_manday: 0 });
  const [roleCurrency, setRoleCurrency] = useState("IDR");
  const [roleInputString, setRoleInputString] = useState("0");
  const [deleteRoleItem, setDeleteRoleItem] = useState<PsRole | null>(null);

  const [showRateModal, setShowRateModal] = useState<{ roleId: number; rate?: PsRateCard } | null>(null);
  const [formRate, setFormRate] = useState({ rate_per_manday: 0, effective_from: new Date().toISOString().split('T')[0], effective_to: "", is_active: true });
  const [rateCurrency, setRateCurrency] = useState("IDR");
  const [rateInputString, setRateInputString] = useState("0");

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ["ps-roles"],
    queryFn: getPsRoles,
  });

  const saveRoleMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editRole) return updatePsRole(editRole.id, payload);
      return createPsRole(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ps-roles"] });
      setShowRoleModal(false);
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (id: number) => deletePsRole(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ps-roles"] });
      setDeleteRoleItem(null);
    },
  });

  const saveRateMutation = useMutation({
    mutationFn: async ({ roleId, rateCardId, ...payload }: any) => {
      if (rateCardId) {
        return updatePsRateCard(roleId, rateCardId, payload);
      }
      return createPsRateCard(roleId, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ps-roles"] });
      setShowRateModal(null);
    },
    onError: (error: any) => {
      console.error("Failed to save rate card:", error);
    }
  });

  const toggle = (id: number) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openCreateRole = () => {
    setEditRole(null);
    setFormRole({ name: "", description: "", is_active: true, rate_per_manday: 0 });
    setRoleCurrency("IDR");
    setRoleInputString("0");
    setShowRoleModal(true);
  };

  const openEditRole = (role: PsRole) => {
    setEditRole(role);
    setFormRole({ name: role.name, description: role.description || "", is_active: role.is_active, rate_per_manday: 0 });
    setShowRoleModal(true);
  };

  const openCreateRate = (roleId: number) => {
    setFormRate({ rate_per_manday: 0, effective_from: new Date().toISOString().split('T')[0], effective_to: "", is_active: true });
    setRateCurrency("IDR");
    setRateInputString("0");
    setShowRateModal({ roleId });
  };

  const openEditRate = (roleId: number, rate: PsRateCard) => {
    setFormRate({ 
      rate_per_manday: parseFloat(rate.rate_per_manday), 
      effective_from: rate.effective_from, 
      effective_to: rate.effective_to || "", 
      is_active: rate.is_active 
    });
    setRateCurrency("IDR");
    setRateInputString(parseFloat(rate.rate_per_manday).toString());
    setShowRateModal({ roleId, rate });
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            {pathname.startsWith("/settings/") ? <BackToSettings /> : null}
            <CardTitle>Roles & Rate Cards</CardTitle>
            <CardDescription>
              Manage service delivery roles and date-effective pricing.
            </CardDescription>
          </div>
          <Button onClick={openCreateRole}>
            <Plus className="h-4 w-4 mr-2" />
            Add Role
          </Button>
        </CardHeader>
      </Card>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-4">
          {roles.map((role) => {
            const isExpanded = expanded.has(role.id);
            return (
              <Card key={role.id} className="overflow-hidden">
                <div
                  className="flex cursor-pointer items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                  onClick={() => toggle(role.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex items-center justify-center h-8 w-8 bg-muted rounded">
                      <Users className="h-4 w-4 text-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{role.name}</span>
                        {role.is_active ? (
                          <Badge variant="success" className="bg-[color:var(--status-success)] hover:bg-[color:var(--status-success)] text-white">Active</Badge>
                        ) : (
                          <Badge variant="neutral">Inactive</Badge>
                        )}
                      </div>
                      {role.description && <p className="text-sm text-muted-foreground mt-0.5">{role.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button variant="outline" size="sm" onClick={() => openEditRole(role)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => setDeleteRoleItem(role)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-border bg-muted/20 p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <h4 className="text-sm font-semibold">Rate Cards</h4>
                      <Button variant="outline" size="sm" onClick={() => openCreateRate(role.id)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Rate Card
                      </Button>
                    </div>

                    {role.rateCards && role.rateCards.length > 0 ? (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {role.rateCards.map((rate) => (
                          <div key={rate.id} className="flex items-start justify-between rounded-lg border border-border bg-card p-3 shadow-sm hover:border-[color:var(--brand)] transition-colors">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-lg">{parseFloat(rate.rate_per_manday).toLocaleString()}</span>
                                {rate.is_active ? (
                                  <Badge variant="success" className="bg-emerald-500 hover:bg-emerald-600 text-[10px] h-4">Active</Badge>
                                ) : (
                                  <Badge variant="neutral" className="text-[10px] h-4">Inactive</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                <span>{rate.effective_from}</span>
                                <span>→</span>
                                <span>{rate.effective_to || "Indefinite"}</span>
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEditRate(role.id, rate)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                        No rate cards defined for this role.
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
          {roles.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
              No roles defined.
            </div>
          )}
        </div>
      )}

      {/* Role Modal */}
      {showRoleModal && (
        <Modal open={showRoleModal} title={editRole ? "Edit Role" : "New Role"} onOpenChange={(v) => setShowRoleModal(v)}>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input value={formRole.name} onChange={(e) => setFormRole({ ...formRole, name: e.target.value })} placeholder="e.g. Solution Architect" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input value={formRole.description} onChange={(e) => setFormRole({ ...formRole, description: e.target.value })} />
            </div>
            {!editRole && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Initial Rate per ManDay</label>
                <div className="flex gap-2">
                  <Select value={roleCurrency} onChange={(e) => setRoleCurrency(e.target.value)} className="w-[120px]">
                    {currencies.map((c: any) => (
                      <option key={c.code} value={c.code}>{c.code}</option>
                    ))}
                  </Select>
                  <Input 
                    type="text" 
                    inputMode="numeric" 
                    className="flex-1"
                    value={formatAmountInput(roleInputString)} 
                    onChange={(e) => setRoleInputString(normalizeAmountInput(e.target.value))} 
                  />
                </div>
              </div>
            )}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Active Status</label>
              <input type="checkbox" checked={formRole.is_active} onChange={(e) => setFormRole({ ...formRole, is_active: e.target.checked })} className="h-4 w-4" />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowRoleModal(false)}>Cancel</Button>
              <Button onClick={() => {
                const rawVal = Number(normalizeAmountInput(roleInputString));
                const currentRate = Number(currencies.find((c: any) => c.code === roleCurrency)?.exchange_rate || 1);
                const idrVal = Math.round((rawVal / currentRate) * idrRate * 100) / 100;
                saveRoleMutation.mutate({ ...formRole, rate_per_manday: idrVal });
              }} disabled={saveRoleMutation.isPending || !formRole.name.trim()}>
                {saveRoleMutation.isPending ? "Saving..." : "Save Role"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Rate Card Modal */}
      {showRateModal && (
        <Modal open={!!showRateModal} title={showRateModal.rate ? "Edit Rate Card" : "New Rate Card"} onOpenChange={(v) => setShowRateModal(null)}>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Rate per ManDay</label>
              <div className="flex gap-2">
                <Select value={rateCurrency} onChange={(e) => setRateCurrency(e.target.value)} className="w-[120px]">
                  {currencies.map((c: any) => (
                    <option key={c.code} value={c.code}>{c.code}</option>
                  ))}
                </Select>
                <Input 
                  type="text" 
                  inputMode="numeric" 
                  className="flex-1"
                  value={formatAmountInput(rateInputString)} 
                  onChange={(e) => setRateInputString(normalizeAmountInput(e.target.value))} 
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Effective From</label>
                <Input type="date" value={formRate.effective_from} onChange={(e) => setFormRate({ ...formRate, effective_from: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Effective To (Optional)</label>
                <Input type="date" value={formRate.effective_to} onChange={(e) => setFormRate({ ...formRate, effective_to: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Active Status</label>
              <input type="checkbox" checked={formRate.is_active} onChange={(e) => setFormRate({ ...formRate, is_active: e.target.checked })} className="h-4 w-4" />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowRateModal(null)}>Cancel</Button>
              <Button onClick={() => {
                const rawVal = Number(normalizeAmountInput(rateInputString)) || 0;
                const currentRate = Number(currencies.find((c: any) => c.code === rateCurrency)?.exchange_rate) || 1;
                const safeIdrRate = idrRate || 1;
                const idrVal = Math.round((rawVal / currentRate) * safeIdrRate * 100) / 100;
                
                saveRateMutation.mutate({
                  roleId: showRateModal.roleId,
                  rateCardId: showRateModal.rate?.id,
                  ...formRate,
                  rate_per_manday: isNaN(idrVal) ? 0 : idrVal,
                  effective_to: formRate.effective_to || null
                });
              }} disabled={saveRateMutation.isPending}>
                {saveRateMutation.isPending ? "Saving..." : "Save Rate Card"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Role Modal */}
      {deleteRoleItem && (
        <Modal open={!!deleteRoleItem} title="Deactivate Role" onOpenChange={(v) => setDeleteRoleItem(null)}>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Are you sure you want to deactivate <strong>{deleteRoleItem.name}</strong>? It will no longer be available for new estimations.</p>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setDeleteRoleItem(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => deleteRoleMutation.mutate(deleteRoleItem.id)} disabled={deleteRoleMutation.isPending}>
                {deleteRoleMutation.isPending ? "Deactivating..." : "Deactivate"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
