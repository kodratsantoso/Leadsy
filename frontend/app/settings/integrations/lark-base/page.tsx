"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Save, Loader, Check, Database, Eye, RefreshCw, X, ArrowLeft, Plus, Edit } from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { BackToSettings } from "@/app/settings/_components/back-to-settings";

// --- Types ---
type LarkBaseTable = { table_id: string; name?: string; revision?: number; };
type LarkBaseField = { field_id: string; field_name: string; type?: number; property?: unknown; };
type LarkBaseMapping = {
  id: number;
  app_token: string;
  table_id: string;
  table_name?: string;
  sync_direction: "leadsy_to_lark" | "lark_to_leadsy" | "two_way";
  field_mapping: Record<string, string>;
  is_active: boolean;
  record_mappings_count?: number;
  last_pull_at?: string | null;
  last_push_at?: string | null;
};
type LarkBaseSyncDirection = "push" | "pull";
type LarkBaseSyncResultItem = { status: "success" | "skipped" | "failed"; action: "added" | "updated" | "deleted" | "skipped" | "failed"; lead_id?: number | string | null; record_id?: string | null; lark_record_id?: string | null; company_name?: string | null; reason?: string | null; };
type LarkBaseSyncResult = { success: boolean; synced_count: number; attempted_count: number; skipped_count: number; added_count: number; updated_count: number; deleted_count: number; failed_count: number; error_count: number; errors?: { message?: string; company_name?: string; record_id?: string | null; lead_id?: number | string | null }[]; results?: LarkBaseSyncResultItem[]; };
type LarkBaseSyncDialogState = { open: boolean; status: "running" | "success" | "failed"; direction: LarkBaseSyncDirection; mappingName: string; result?: LarkBaseSyncResult; error?: string; };

const LEADSY_LEAD_FIELDS = [
  { key: "leadsy_id", label: "Leadsy ID" },
  { key: "company_name", label: "Company Name" },
  { key: "website", label: "Website" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "address", label: "Address" },
  { key: "business_category", label: "Business Category" },
  { key: "lead_score", label: "Lead Score" },
  { key: "qualification_status", label: "Qualification Status" },
  { key: "funnel_stage", label: "Funnel Stage" },
  { key: "owner", label: "Owner" },
  { key: "external_place_id", label: "External Place ID" },
  { key: "external_id", label: "External ID" },
] as const;

const DEFAULT_LARK_BASE_FIELD_MAPPING = {
  leadsy_id: "Leadsy ID", company_name: "Company Name", website: "Website", email: "Email", phone: "Phone", address: "Address",
  business_category: "Business Category", lead_score: "Lead Score", qualification_status: "Status", funnel_stage: "Funnel Stage",
  owner: "Owner", external_place_id: "External Place ID", external_id: "External ID",
};

const formatLarkBaseValue = (val: any): string => {
  if (val == null) return "-";
  
  if (typeof val === "number" && val > 1000000000000 && val < 3000000000000) {
    return new Date(val).toLocaleString();
  }

  if (Array.isArray(val)) {
    return val.map((item: any) => {
      if (item && typeof item === "object") {
        if (item.text) return item.text;
        if (item.name) return item.name;
        if (item.full_name) return item.full_name;
        if (item.email) return item.email;
        if (item.link) return item.link;
        return JSON.stringify(item);
      }
      return String(item);
    }).join(", ");
  }
  if (typeof val === "object") {
    if (val.text) return val.text;
    if (val.name) return val.name;
    if (val.full_name) return val.full_name;
    if (val.email) return val.email;
    if (val.link) return val.link;
    return JSON.stringify(val);
  }
  return String(val);
};

function normalizeFieldName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export default function LarkBaseSettingsPage() {
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [baseAppToken, setBaseAppToken] = useState("");
  const [selectedBaseTable, setSelectedBaseTable] = useState<LarkBaseTable | null>(null);
  const [baseSyncDirection, setBaseSyncDirection] = useState<"leadsy_to_lark" | "lark_to_leadsy" | "two_way">("two_way");
  const [baseFieldMapping, setBaseFieldMapping] = useState<Record<string, string>>(DEFAULT_LARK_BASE_FIELD_MAPPING);
  const [baseSyncDialog, setBaseSyncDialog] = useState<LarkBaseSyncDialogState>({ open: false, status: "running", direction: "pull", mappingName: "" });

  const { data: baseMappingsData, refetch: refetchBaseMappings } = useQuery({
    queryKey: ['lark-base-mappings'],
    queryFn: async () => {
      const res = await apiFetch('/api/lark/base/mappings');
      return res.json();
    },
  });
  const baseMappings: LarkBaseMapping[] = baseMappingsData?.data || [];

  const listBaseTablesMutation = useMutation({
    mutationFn: async () => {
      let token = baseAppToken.trim();
      try {
        if (token.includes('http')) {
          const url = new URL(token);
          const parts = url.pathname.split('/');
          const baseIndex = parts.indexOf('base');
          if (baseIndex >= 0 && parts.length > baseIndex + 1) {
            token = parts[baseIndex + 1];
          }
        }
      } catch (e) {}

      const res = await apiFetch(`/api/lark/base/tables?app_token=${token}`);
      const json = await res.json();
      if (!res.ok) {
        let msg = json?.message || 'Failed to fetch base tables';
        if (msg.includes('NOTEXIST')) {
          msg = 'Base does not exist or App lacks permissions. Please invite the Lead Management App to your Base via "Add Apps".';
        }
        throw new Error(msg);
      }
      return json;
    },
    onError: (err: any) => { setErrorMsg(err?.message); setTimeout(() => setErrorMsg(""), 5000); }
  });

  const listBaseFieldsMutation = useMutation({
    mutationFn: async ({ appToken, tableId }: { appToken: string; tableId: string }) => {
      let token = appToken.trim();
      try {
        if (token.includes('http')) {
          const url = new URL(token);
          const parts = url.pathname.split('/');
          const baseIndex = parts.indexOf('base');
          if (baseIndex >= 0 && parts.length > baseIndex + 1) {
            token = parts[baseIndex + 1];
          }
        }
      } catch (e) {}

      const res = await apiFetch(`/api/lark/base/fields?app_token=${token}&table_id=${tableId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to fetch base fields');
      return json;
    },
    onError: (err: any) => { setErrorMsg(err?.message); setTimeout(() => setErrorMsg(""), 5000); }
  });

  const previewBaseRecordsMutation = useMutation({
    mutationFn: async () => {
      let token = baseAppToken.trim();
      try {
        if (token.includes('http')) {
          const url = new URL(token);
          const parts = url.pathname.split('/');
          const baseIndex = parts.indexOf('base');
          if (baseIndex >= 0 && parts.length > baseIndex + 1) {
            token = parts[baseIndex + 1];
          }
        }
      } catch (e) {}

      const res = await apiFetch(`/api/lark/base/records/preview?app_token=${encodeURIComponent(token)}&table_id=${encodeURIComponent(selectedBaseTable?.table_id || '')}&page_size=500`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to fetch base records');
      return json;
    },
    onError: (err: any) => { setErrorMsg(err?.message); setTimeout(() => setErrorMsg(""), 5000); }
  });

  const saveBaseMappingMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        app_token: baseAppToken,
        table_id: selectedBaseTable?.table_id,
        table_name: selectedBaseTable?.name,
        sync_direction: baseSyncDirection,
        field_mapping: Object.fromEntries(Object.entries(baseFieldMapping).filter(([k, v]) => Boolean(v))),
        is_active: true,
      };
      const res = await apiFetch('/api/lark/base/mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to save base mapping');
      return json;
    },
    onSuccess: () => {
      refetchBaseMappings();
      setSuccessMsg('Base mapping saved successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
      setBaseAppToken("");
      setSelectedBaseTable(null);
    },
    onError: (err: any) => { setErrorMsg(err?.message); setTimeout(() => setErrorMsg(""), 5000); }
  });

  const deleteBaseMappingMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`/api/lark/base/mappings/${id}`, { method: 'DELETE' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || 'Failed to delete mapping');
      return json;
    },
    onSuccess: () => {
      refetchBaseMappings();
      setSuccessMsg('Mapping removed successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    },
    onError: (err: any) => { setErrorMsg(err?.message); setTimeout(() => setErrorMsg(""), 5000); }
  });

  const syncBaseMappingMutation = useMutation({
    mutationFn: async ({ mappingId, direction }: { mappingId: number; direction: LarkBaseSyncDirection; mappingName: string }) => {
      const res = await apiFetch(`/api/lark/base/mappings/${mappingId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction, limit: 100 }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to sync mapping');
      return json;
    },
    onSuccess: (data: LarkBaseSyncResult, variables) => {
      refetchBaseMappings();
      setBaseSyncDialog({ open: true, status: data.success === false ? "failed" : "success", direction: variables.direction, mappingName: variables.mappingName, result: data });
    },
    onError: (err: any, variables) => {
      setBaseSyncDialog({ open: true, status: "failed", direction: variables.direction, mappingName: variables.mappingName, error: err?.message });
      setErrorMsg(err?.message); setTimeout(() => setErrorMsg(""), 5000);
    }
  });

  const startBaseSync = (mapping: LarkBaseMapping, direction: LarkBaseSyncDirection) => {
    const mappingName = mapping.table_name || mapping.table_id;
    setBaseSyncDialog({ open: true, status: "running", direction, mappingName });
    syncBaseMappingMutation.mutate({ mappingId: mapping.id, direction, mappingName });
  };

  const handleSelectBaseTable = (table: LarkBaseTable) => {
    setSelectedBaseTable(table);
    listBaseFieldsMutation.mutate({ appToken: baseAppToken, tableId: table.table_id });
  };

  const updateBaseFieldMapping = (leadsyField: string, larkField: string) => {
    setBaseFieldMapping((current) => ({
      ...current,
      [leadsyField]: larkField,
    }));
  };

  const applyAutoMapping = (fieldNames: string[]) => {
    let matchCount = 0;

    setBaseFieldMapping((current) => {
      const next = { ...current };
      LEADSY_LEAD_FIELDS.forEach((field) => {
        const preferred = DEFAULT_LARK_BASE_FIELD_MAPPING[field.key as keyof typeof DEFAULT_LARK_BASE_FIELD_MAPPING];
        const matched = fieldNames.find((name) => normalizeFieldName(name) === normalizeFieldName(preferred))
          || fieldNames.find((name) => normalizeFieldName(name) === normalizeFieldName(field.label))
          || fieldNames.find((name) => normalizeFieldName(name) === normalizeFieldName(field.key))
          || fieldNames.find((name) => normalizeFieldName(name).includes(normalizeFieldName(field.key)))
          || fieldNames.find((name) => normalizeFieldName(field.key).includes(normalizeFieldName(name)));
        if (matched) {
          next[field.key] = matched;
          matchCount++;
        }
      });
      return next;
    });

    return matchCount;
  };

  const autoMapBaseFields = async () => {
    let fieldNames = larkBaseFieldNames;

    if (fieldNames.length === 0) {
      if (!baseAppToken || !selectedBaseTable) {
        setErrorMsg('Select a Lark Base table before running Auto Match');
        setTimeout(() => setErrorMsg(''), 5000);
        return;
      }

      try {
        const data = await listBaseFieldsMutation.mutateAsync({
          appToken: baseAppToken,
          tableId: selectedBaseTable.table_id,
        });
        fieldNames = (data?.items || []).map((field: LarkBaseField) => field.field_name);
      } catch {
        return;
      }
    }

    const matchCount = applyAutoMapping(fieldNames);
    if (matchCount > 0) {
      setSuccessMsg(`Auto matched ${matchCount} Leadsy fields`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } else {
      setErrorMsg('No matching Lark Base field names found. Please map the fields manually.');
      setTimeout(() => setErrorMsg(''), 5000);
    }
  };

  const handleEditMapping = (mapping: LarkBaseMapping) => {
    setBaseAppToken(mapping.app_token);
    setSelectedBaseTable({ table_id: mapping.table_id, name: mapping.table_name });
    setBaseSyncDirection(mapping.sync_direction);
    setBaseFieldMapping(mapping.field_mapping || DEFAULT_LARK_BASE_FIELD_MAPPING);
    listBaseFieldsMutation.mutate({ appToken: mapping.app_token, tableId: mapping.table_id });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const larkBaseFieldNames = ["Record ID", ...((listBaseFieldsMutation.data?.items || []) as LarkBaseField[]).map((f) => f.field_name)];
  const savedTokens = Array.from(new Set(baseMappings.map(m => m.app_token))).filter(Boolean);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center gap-4">
        <BackToSettings />
        <h2 className="text-3xl font-bold tracking-tight">Lark Base Sync</h2>
      </div>

      <p className="text-muted-foreground">
        Manage multiple Lark Base mappings for Two-Way sync with your Leads.
      </p>

      {successMsg && <div className="rounded-lg bg-emerald-500/10 p-4 text-emerald-600">{successMsg}</div>}
      {errorMsg && <div className="rounded-lg bg-red-500/10 p-4 text-red-600">{errorMsg}</div>}

      <div className="flex flex-col gap-8 w-full">
        <Card className="p-6 w-full">
          <div className="mb-4 flex items-center gap-2">
            <Database className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Saved Base Mappings</h3>
          </div>
          
          {baseMappings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No Base mappings saved yet. Add one below.</p>
          ) : (
            <div className="space-y-4">
              {baseMappings.map((mapping) => (
                <div key={mapping.id} className="flex flex-col gap-3 rounded-lg border border-border bg-[var(--background)] p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold">{mapping.table_name || mapping.table_id}</p>
                      <p className="text-xs text-muted-foreground font-mono mt-1">App: {mapping.app_token}</p>
                      <div className="mt-2 flex gap-2 text-xs">
                        <Badge variant="outline">{mapping.sync_direction}</Badge>
                        <Badge variant="neutral">{mapping.record_mappings_count || 0} linked records</Badge>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-brand"
                        onClick={() => handleEditMapping(mapping)}
                        title="Edit Mapping"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-red-500"
                        onClick={() => {
                          if (confirm('Are you sure you want to remove this mapping?')) {
                            deleteBaseMappingMutation.mutate(mapping.id);
                          }
                        }}
                        disabled={deleteBaseMappingMutation.isPending}
                        title="Remove Mapping"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => startBaseSync(mapping, 'pull')}
                      disabled={syncBaseMappingMutation.isPending || mapping.sync_direction === 'leadsy_to_lark'}
                    >
                      Pull from Lark
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => startBaseSync(mapping, 'push')}
                      disabled={syncBaseMappingMutation.isPending || mapping.sync_direction === 'lark_to_leadsy'}
                    >
                      Push to Lark
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className={`grid gap-6 ${previewBaseRecordsMutation.data?.items?.length > 0 ? 'xl:grid-cols-[1fr_2fr]' : 'grid-cols-1 max-w-2xl'}`}>
          <Card className="p-6 h-fit min-w-0">
            <div className="mb-4 flex items-center gap-2">
              <Plus className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold">Add New Mapping</h3>
            </div>

            <div className="grid gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Base App Token</label>
                <Input
                  value={baseAppToken}
                  onChange={(e) => { setBaseAppToken(e.target.value); setSelectedBaseTable(null); }}
                  placeholder="Example: appbcbWCzen6D8dezhoCH2RpMAh"
                />
                {savedTokens.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2 items-center">
                    <span className="text-xs text-muted-foreground">Saved Bases:</span>
                    {savedTokens.map(token => (
                      <Badge key={token} variant={baseAppToken === token ? "brand" : "outline"} className="cursor-pointer" onClick={() => { setBaseAppToken(token); setSelectedBaseTable(null); }}>
                        {token.substring(0, 8)}...
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => listBaseTablesMutation.mutate()}
                  disabled={!baseAppToken || listBaseTablesMutation.isPending}
                >
                  {listBaseTablesMutation.isPending ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  Load Tables
                </Button>
              </div>

              {listBaseTablesMutation.data?.items?.length > 0 && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {(listBaseTablesMutation.data.items as LarkBaseTable[]).map((table) => (
                    <button
                      key={table.table_id}
                      type="button"
                      onClick={() => handleSelectBaseTable(table)}
                      className={`flex items-center justify-between rounded-lg border p-3 text-left text-sm transition-colors hover:bg-accent ${selectedBaseTable?.table_id === table.table_id ? 'border-brand bg-brand/5' : 'border-border'}`}
                    >
                      <span className="font-medium truncate">{table.name || table.table_id}</span>
                      {selectedBaseTable?.table_id === table.table_id && <Check className="h-4 w-4 text-brand" />}
                    </button>
                  ))}
                </div>
              )}

              {selectedBaseTable && (
                <div className="space-y-4 pt-4 border-t border-border mt-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Sync Direction</label>
                    <Select
                      value={baseSyncDirection}
                      onChange={(e) => setBaseSyncDirection(e.target.value as any)}
                    >
                      <option value="two_way">Two-Way Sync</option>
                      <option value="leadsy_to_lark">Leadsy -&gt; Lark Only (Push)</option>
                      <option value="lark_to_leadsy">Lark -&gt; Leadsy Only (Pull)</option>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Field Mapping</label>
                      <div className="flex gap-2 flex-wrap justify-end">
                        <Button size="sm" variant="outline" onClick={() => previewBaseRecordsMutation.mutate()} disabled={previewBaseRecordsMutation.isPending}>
                          {previewBaseRecordsMutation.isPending ? <Loader className="mr-2 h-3 w-3 animate-spin" /> : <Eye className="mr-2 h-3 w-3" />}
                          Preview Data
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => listBaseFieldsMutation.mutate({ appToken: baseAppToken, tableId: selectedBaseTable.table_id })} disabled={listBaseFieldsMutation.isPending}>
                          {listBaseFieldsMutation.isPending ? <Loader className="mr-2 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-2 h-3 w-3" />}
                          Refresh Fields
                        </Button>
                        <Button size="sm" variant="outline" onClick={autoMapBaseFields} disabled={listBaseFieldsMutation.isPending}>
                          {listBaseFieldsMutation.isPending ? 'Matching...' : 'Auto Match Fields'}
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-lg border border-border bg-[var(--background)] p-3 max-h-96 overflow-y-auto">
                      <div className="space-y-3">
                        {LEADSY_LEAD_FIELDS.map((field) => (
                          <div key={field.key} className="grid grid-cols-[1fr_1.5fr] items-center gap-2">
                            <div className="text-sm">{field.label}</div>
                            <select
                              value={baseFieldMapping[field.key] || ""}
                              onChange={(e) => updateBaseFieldMapping(field.key, e.target.value)}
                              className="h-8 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm"
                            >
                              <option value="">Do not sync</option>
                              {larkBaseFieldNames.map((name) => (
                                <option key={`${field.key}-${name}`} value={name}>{name}</option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <Button
                    className="w-full mt-4"
                    onClick={() => saveBaseMappingMutation.mutate()}
                    disabled={saveBaseMappingMutation.isPending}
                  >
                    {saveBaseMappingMutation.isPending ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save New Base Mapping
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {previewBaseRecordsMutation.data?.items?.length > 0 && (
            <Card className="p-6 flex flex-col min-w-0 h-full">
              <div className="mb-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-muted-foreground" />
                  <h3 className="text-lg font-semibold">Preview Data</h3>
                </div>
                <Badge variant="outline">{previewBaseRecordsMutation.data.items.length} records retrieved</Badge>
              </div>
              
              {(() => {
                const previewItems = previewBaseRecordsMutation.data.items;
                const allKeys = Array.from(new Set(previewItems.slice(0, 10).flatMap((r: any) => Object.keys(r.fields || {}))));
                return (
                  <div className="overflow-x-auto rounded-lg border border-border flex-1 bg-card flex flex-col">
                    <div className="flex-1 overflow-y-auto relative min-h-[400px] max-h-[800px]">
                      <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead className="sticky top-0 bg-accent z-10 shadow-sm">
                          <tr>
                            <th className="border-b border-border px-3 py-3 font-semibold text-muted-foreground">Record ID</th>
                            {allKeys.map((field) => (
                              <th key={field as string} className="border-b border-border px-3 py-3 font-semibold text-muted-foreground">{field as string}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewItems.slice(0, 50).map((record: any) => (
                            <tr key={record.record_id} className="border-b border-border/60 hover:bg-muted/50 transition-colors">
                              <td className="px-3 py-2 font-mono text-muted-foreground text-[10px]">{record.record_id}</td>
                              {allKeys.map((field) => (
                                <td key={field as string} className="max-w-[200px] truncate px-3 py-2">
                                  {formatLarkBaseValue(record.fields?.[field as string])}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </Card>
          )}
        </div>
      </div>

      <Modal title="Base Sync Progress" open={baseSyncDialog.open} onOpenChange={(open) => !open && setBaseSyncDialog((p) => ({ ...p, open: false }))}>
        <div className="p-6">
          <h2 className="mb-4 text-xl font-semibold">
            {baseSyncDialog.direction === "pull" ? "Pulling from" : "Pushing to"} Lark Base: {baseSyncDialog.mappingName}
          </h2>
          
          {baseSyncDialog.status === "running" && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader className="mb-4 h-8 w-8 animate-spin text-brand" />
              <p className="text-muted-foreground">Sync in progress. This may take a moment...</p>
            </div>
          )}

          {baseSyncDialog.status === "success" && baseSyncDialog.result && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-600">
                <Check className="h-5 w-5" />
                <span className="font-medium">Sync completed successfully</span>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-lg border p-3">
                  <div className="text-2xl font-bold">{baseSyncDialog.result.synced_count}</div>
                  <div className="text-xs text-muted-foreground">Synced</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-2xl font-bold">{baseSyncDialog.result.added_count}</div>
                  <div className="text-xs text-muted-foreground">Added</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-2xl font-bold">{baseSyncDialog.result.updated_count}</div>
                  <div className="text-xs text-muted-foreground">Updated</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-2xl font-bold">{baseSyncDialog.result.skipped_count}</div>
                  <div className="text-xs text-muted-foreground">Skipped</div>
                </div>
              </div>
              {baseSyncDialog.result.failed_count > 0 && (
                <div className="rounded-lg bg-orange-500/10 p-3 text-sm text-orange-600">
                  {baseSyncDialog.result.failed_count} records failed to sync. {baseSyncDialog.result.errors?.[0]?.message}
                </div>
              )}
            </div>
          )}

          {baseSyncDialog.status === "failed" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-red-600">
                <X className="h-5 w-5" />
                <span className="font-medium">Sync failed</span>
              </div>
              <p className="text-sm text-red-600/80">{baseSyncDialog.error}</p>
              
              {baseSyncDialog.result && (
                <div className="mt-4 rounded-lg bg-red-500/10 p-4 text-sm text-red-600">
                  <p className="font-semibold">Errors ({baseSyncDialog.result.error_count}):</p>
                  <ul className="mt-2 list-inside list-disc space-y-1">
                    {baseSyncDialog.result.errors?.slice(0, 5).map((e, i) => (
                      <li key={i}>{e.message} {e.company_name ? `(${e.company_name})` : ''}</li>
                    ))}
                    {baseSyncDialog.result.error_count > 5 && (
                      <li>...and {baseSyncDialog.result.error_count - 5} more errors</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <Button onClick={() => setBaseSyncDialog((p) => ({ ...p, open: false }))} disabled={baseSyncDialog.status === "running"}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
