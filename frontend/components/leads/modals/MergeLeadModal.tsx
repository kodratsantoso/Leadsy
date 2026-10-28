'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiFetch } from '@/lib/apiFetch';
import { useToast } from '@/components/ui/toast';
import {
  GitMerge,
  AlertTriangle,
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Check,
  Loader2,
  Users,
  Activity,
  FileText,
  DollarSign,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DuplicateCandidate {
  lead: {
    id: number;
    company_name: string;
    website?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    industry?: string | null;
    lead_score?: number | null;
    qualification_status?: string | null;
    contacts?: Array<{ id: number; name?: string; email?: string; phone?: string; is_primary?: boolean }>;
    activities?: Array<{ id: number; type?: string; description?: string }>;
    quotations?: Array<{ id: number }>;
    sales_orders?: Array<{ id: number }>;
  };
  score: number;
  match_reasons: string[];
}

interface MergeLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  primaryLead: {
    id: number;
    company_name: string;
    website?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    industry?: string | null;
    lead_score?: number | null;
    qualification_status?: string | null;
    contacts?: any[];
    activities?: any[];
  } | null;
  onMerged?: (mergedLead: any) => void;
}

export function MergeLeadModal({
  open,
  onOpenChange,
  primaryLead,
  onMerged,
}: MergeLeadModalProps) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [selectedCandidate, setSelectedCandidate] = React.useState<DuplicateCandidate | null>(null);
  const [fieldOverrides, setFieldOverrides] = React.useState<Record<string, string>>({});
  const [confirmedWarning, setConfirmedWarning] = React.useState(false);

  // Fetch duplicates when modal is open and primaryLead exists
  const { data, isLoading, refetch } = useQuery<{ success: boolean; data: DuplicateCandidate[] }>({
    queryKey: ['lead-duplicates', primaryLead?.id],
    queryFn: async () => {
      if (!primaryLead?.id) return { success: true, data: [] };
      const res = await apiFetch(`/leads/${primaryLead.id}/duplicates`);
      if (!res.ok) throw new Error('Gagal memuat kandidat duplikasi.');
      return res.json();
    },
    enabled: open && !!primaryLead?.id,
  });

  const candidates: DuplicateCandidate[] = data?.data || [];

  // Reset state when modal opens or primaryLead changes
  React.useEffect(() => {
    if (open) {
      setSelectedCandidate(null);
      setFieldOverrides({});
      setConfirmedWarning(false);
    }
  }, [open, primaryLead?.id]);

  // Mutation for merging leads
  const mergeMutation = useMutation({
    mutationFn: async () => {
      if (!primaryLead?.id || !selectedCandidate) {
        throw new Error('Pilih lead duplikat yang akan digabungkan terlebih dahulu.');
      }
      const res = await apiFetch(`/leads/${primaryLead.id}/merge`, {
        method: 'POST',
        body: JSON.stringify({
          secondary_lead_id: selectedCandidate.lead.id,
          field_overrides: fieldOverrides,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.success === false) {
        throw new Error(json.message || json.error?.message || 'Gagal menggabungkan lead.');
      }
      return json;
    },
    onSuccess: (result) => {
      toast.success(
        'Lead Berhasil Digabungkan',
        `Seluruh data dari "${selectedCandidate?.lead.company_name}" telah dialihkan ke "${primaryLead?.company_name}".`
      );
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['lead', primaryLead?.id] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead-duplicates', primaryLead?.id] });

      onMerged?.(result.data?.primary_lead);
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(
        'Gagal Menggabungkan Lead',
        err.message || 'Terjadi kesalahan sistem saat proses merge.'
      );
    },
  });

  const handleToggleOverride = (field: string, value: string) => {
    setFieldOverrides((prev) => {
      const next = { ...prev };
      if (next[field] === value) {
        delete next[field];
      } else {
        next[field] = value;
      }
      return next;
    });
  };

  if (!primaryLead) return null;

  const secondary = selectedCandidate?.lead;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Deduplikasi & Penggabungan Lead (Merge Engine)"
      description={`Tinjau dan gabungkan duplikasi record ke dalam lead utama: "${primaryLead.company_name}"`}
      size="5xl"
      preventClose={mergeMutation.isPending}
      footer={
        <div className="flex w-full items-center justify-between">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0" />
            <span>Tindakan penggabungan memindahkan seluruh relasi dan mengarsipkan lead duplikat secara aman.</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mergeMutation.isPending}
            >
              Batal
            </Button>
            {selectedCandidate && (
              <Button
                variant="default"
                disabled={mergeMutation.isPending || !confirmedWarning}
                onClick={() => mergeMutation.mutate()}
                className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {mergeMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Menggabungkan...
                  </>
                ) : (
                  <>
                    <GitMerge className="h-4 w-4" />
                    Gabungkan ke Lead Ini
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Step 1: Duplicate Detection Results */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-indigo-500" />
              <h3 className="font-semibold text-sm">
                Kandidat Duplikat Terdeteksi ({candidates.length})
              </h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
              className="text-xs text-muted-foreground"
            >
              Refresh Analisis
            </Button>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-2xl bg-muted/30">
              <Loader2 className="h-7 w-7 animate-spin text-indigo-500 mb-2" />
              <p className="text-sm text-muted-foreground">Mencari kecocokan domain, nomor telepon, dan kesamaan nama...</p>
            </div>
          ) : candidates.length === 0 ? (
            <div className="p-6 text-center border rounded-2xl bg-muted/20">
              <Check className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <p className="font-medium text-sm">Tidak Ditemukan Duplikat Serupa</p>
              <p className="text-xs text-muted-foreground mt-1">
                Sistem tidak mendeteksi kemiripan domain, telepon, atau nama perusahaan dengan lead lain dalam database.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-56 overflow-y-auto pr-1">
              {candidates.map((cand) => {
                const isSelected = selectedCandidate?.lead.id === cand.lead.id;
                return (
                  <div
                    key={cand.lead.id}
                    onClick={() => {
                      setSelectedCandidate(cand);
                      setFieldOverrides({});
                      setConfirmedWarning(false);
                    }}
                    className={cn(
                      "p-3.5 rounded-xl border transition cursor-pointer text-left relative",
                      isSelected
                        ? "border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-sm"
                        : "border-border hover:border-border/80 hover:bg-muted/40"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate flex items-center gap-1.5">
                          {cand.lead.company_name}
                          <span className="text-xs text-muted-foreground font-normal">#{cand.lead.id}</span>
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          <Badge variant="outline" className="text-[10px] bg-indigo-100/60 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border-indigo-200">
                            {cand.score}% Match
                          </Badge>
                          {cand.match_reasons.map((reason, idx) => (
                            <Badge key={idx} variant="neutral" className="text-[10px]">
                              {reason}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="shrink-0">
                        {isSelected ? (
                          <div className="h-6 w-6 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                            <Check className="h-3.5 w-3.5" />
                          </div>
                        ) : (
                          <ChevronRight className="h-5 w-5 text-muted-foreground/60" />
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-muted-foreground mt-2.5 pt-2 border-t border-border/60">
                      <div className="truncate flex items-center gap-1">
                        <Globe className="h-3 w-3 shrink-0" />
                        <span className="truncate">{cand.lead.website || 'Tanpa web'}</span>
                      </div>
                      <div className="truncate flex items-center gap-1">
                        <Phone className="h-3 w-3 shrink-0" />
                        <span className="truncate">{cand.lead.phone || 'Tanpa telp'}</span>
                      </div>
                      <div className="truncate flex items-center gap-1">
                        <Users className="h-3 w-3 shrink-0" />
                        <span>{cand.lead.contacts?.length || 0} kontak</span>
                      </div>
                      <div className="truncate flex items-center gap-1">
                        <Activity className="h-3 w-3 shrink-0" />
                        <span>{cand.lead.activities?.length || 0} aktivitas</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Step 2: Side-by-Side Comparison & Field Overrides (when candidate is selected) */}
        {selectedCandidate && secondary && (
          <div className="border rounded-2xl p-4 bg-card/60 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b">
              <div>
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <GitMerge className="h-4 w-4 text-indigo-500" />
                  Pratinjau Konsolidasi & Field Overrides
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Tentukan data field mana yang ingin dipertahankan atau diperbarui dari lead duplikat ke lead utama.
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                {selectedCandidate.score}% Confidence Match
              </Badge>
            </div>

            {/* Comparison Table */}
            <div className="border rounded-xl overflow-hidden text-xs">
              <div className="grid grid-cols-12 bg-muted/60 font-semibold p-2.5 border-b text-muted-foreground">
                <div className="col-span-3">Field / Properti</div>
                <div className="col-span-4 flex items-center gap-1 text-foreground">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                  Lead Utama (Pertahankan)
                </div>
                <div className="col-span-5 flex items-center gap-1 text-foreground">
                  <span className="h-2 w-2 rounded-full bg-indigo-500 shrink-0" />
                  Lead Duplikat (Pilih untuk timpa)
                </div>
              </div>

              <div className="divide-y divide-border">
                {/* Website */}
                <div className="grid grid-cols-12 p-2.5 items-center hover:bg-muted/20">
                  <div className="col-span-3 font-medium flex items-center gap-1.5 text-muted-foreground">
                    <Globe className="h-3.5 w-3.5" /> Website
                  </div>
                  <div className="col-span-4 font-mono truncate pr-2">
                    {primaryLead.website || <span className="text-muted-foreground italic">Kosong</span>}
                  </div>
                  <div className="col-span-5 flex items-center justify-between gap-2">
                    <span className="font-mono truncate">{secondary.website || <span className="text-muted-foreground italic">Kosong</span>}</span>
                    {secondary.website && secondary.website !== primaryLead.website && (
                      <Button
                        size="sm"
                        variant={fieldOverrides['website'] ? 'default' : 'outline'}
                        className="h-6 px-2 text-[10px]"
                        onClick={() => handleToggleOverride('website', secondary.website || '')}
                      >
                        {fieldOverrides['website'] ? 'Dipilih' : 'Gunakan Nilai Ini'}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Phone */}
                <div className="grid grid-cols-12 p-2.5 items-center hover:bg-muted/20">
                  <div className="col-span-3 font-medium flex items-center gap-1.5 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" /> Telepon
                  </div>
                  <div className="col-span-4 font-mono truncate pr-2">
                    {primaryLead.phone || <span className="text-muted-foreground italic">Kosong</span>}
                  </div>
                  <div className="col-span-5 flex items-center justify-between gap-2">
                    <span className="font-mono truncate">{secondary.phone || <span className="text-muted-foreground italic">Kosong</span>}</span>
                    {secondary.phone && secondary.phone !== primaryLead.phone && (
                      <Button
                        size="sm"
                        variant={fieldOverrides['phone'] ? 'default' : 'outline'}
                        className="h-6 px-2 text-[10px]"
                        onClick={() => handleToggleOverride('phone', secondary.phone || '')}
                      >
                        {fieldOverrides['phone'] ? 'Dipilih' : 'Gunakan Nilai Ini'}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div className="grid grid-cols-12 p-2.5 items-center hover:bg-muted/20">
                  <div className="col-span-3 font-medium flex items-center gap-1.5 text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" /> Email
                  </div>
                  <div className="col-span-4 font-mono truncate pr-2">
                    {primaryLead.email || <span className="text-muted-foreground italic">Kosong</span>}
                  </div>
                  <div className="col-span-5 flex items-center justify-between gap-2">
                    <span className="font-mono truncate">{secondary.email || <span className="text-muted-foreground italic">Kosong</span>}</span>
                    {secondary.email && secondary.email !== primaryLead.email && (
                      <Button
                        size="sm"
                        variant={fieldOverrides['email'] ? 'default' : 'outline'}
                        className="h-6 px-2 text-[10px]"
                        onClick={() => handleToggleOverride('email', secondary.email || '')}
                      >
                        {fieldOverrides['email'] ? 'Dipilih' : 'Gunakan Nilai Ini'}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Address */}
                <div className="grid grid-cols-12 p-2.5 items-center hover:bg-muted/20">
                  <div className="col-span-3 font-medium flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" /> Alamat
                  </div>
                  <div className="col-span-4 truncate pr-2">
                    {primaryLead.address || <span className="text-muted-foreground italic">Kosong</span>}
                  </div>
                  <div className="col-span-5 flex items-center justify-between gap-2">
                    <span className="truncate">{secondary.address || <span className="text-muted-foreground italic">Kosong</span>}</span>
                    {secondary.address && secondary.address !== primaryLead.address && (
                      <Button
                        size="sm"
                        variant={fieldOverrides['address'] ? 'default' : 'outline'}
                        className="h-6 px-2 text-[10px]"
                        onClick={() => handleToggleOverride('address', secondary.address || '')}
                      >
                        {fieldOverrides['address'] ? 'Dipilih' : 'Gunakan Nilai Ini'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Relocation Summary Badges */}
            <div className="p-3 bg-muted/40 rounded-xl space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">
                Ringkasan Relasi yang Otomatis Dialihkan ke Lead Utama:
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-background border">
                  <Users className="h-3.5 w-3.5 text-blue-500" />
                  <strong>{secondary.contacts?.length || 0}</strong> Kontak (dijadikan secondary contact)
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-background border">
                  <Activity className="h-3.5 w-3.5 text-emerald-500" />
                  <strong>{secondary.activities?.length || 0}</strong> Riwayat Aktivitas & Catatan
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-background border">
                  <FileText className="h-3.5 w-3.5 text-amber-500" />
                  <strong>{secondary.quotations?.length || 0}</strong> Dokumen Penawaran
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-background border">
                  <DollarSign className="h-3.5 w-3.5 text-indigo-500" />
                  <strong>{secondary.sales_orders?.length || 0}</strong> Sales Orders
                </span>
              </div>
            </div>

            {/* Confirmation Checkbox */}
            <div className="flex items-start gap-2.5 pt-1">
              <input
                type="checkbox"
                id="confirm-merge"
                checked={confirmedWarning}
                onChange={(e) => setConfirmedWarning(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="confirm-merge" className="text-xs text-muted-foreground cursor-pointer select-none">
                Saya mengerti bahwa lead duplikat <strong>"{secondary.company_name}"</strong> akan digabungkan ke lead utama ini dan diarsipkan (soft-deleted dengan status <code>merged</code>).
              </label>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
