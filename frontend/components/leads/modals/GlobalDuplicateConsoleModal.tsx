'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiFetch } from '@/lib/apiFetch';
import {
  GitMerge,
  Layers,
  Globe,
  Building2,
  Phone,
  Users,
  ChevronRight,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { MergeLeadModal } from './MergeLeadModal';

interface DuplicateCluster {
  cluster_key: string;
  match_type: 'website_domain' | 'company_name' | 'phone';
  matched_value: string;
  confidence: number;
  lead_count: number;
  leads: Array<{
    id: number;
    company_name: string;
    website?: string | null;
    phone?: string | null;
    lead_score?: number | null;
    qualification_status?: string | null;
    created_at: string;
    contacts_count?: number;
    activities_count?: number;
  }>;
}

interface GlobalDuplicateConsoleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMergedSuccess?: () => void;
}

export function GlobalDuplicateConsoleModal({
  open,
  onOpenChange,
  onMergedSuccess,
}: GlobalDuplicateConsoleModalProps) {
  const [selectedPrimaryLead, setSelectedPrimaryLead] = React.useState<any>(null);

  const { data, isLoading, isFetching, refetch } = useQuery<{
    success: boolean;
    total_clusters: number;
    data: DuplicateCluster[];
  }>({
    queryKey: ['global-duplicate-clusters'],
    queryFn: async () => {
      const res = await apiFetch('/leads-duplicates/summary');
      if (!res.ok) throw new Error('Gagal memuat konsol duplikasi global.');
      return res.json();
    },
    enabled: open,
  });

  const clusters = data?.data || [];
  const totalLeadsAffected = clusters.reduce((acc, curr) => acc + (curr.lead_count || 0), 0);

  return (
    <>
      <Modal
        open={open}
        onOpenChange={onOpenChange}
        title="RevOps Duplicate Management Console"
        description="Pindai, tinjau, dan konsolidasikan record lead duplikat di seluruh database perusahaan."
        size="5xl"
        footer={
          <div className="flex w-full items-center justify-between">
            <div className="text-xs text-muted-foreground">
              Total {clusters.length} kelompok duplikat ({totalLeadsAffected} leads terkait).
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
                className="gap-1.5"
              >
                <RefreshCw className={isFetching ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
                Refresh Analisis
              </Button>
              <Button variant="default" size="sm" onClick={() => onOpenChange(false)}>
                Selesai
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mb-2" />
              <p className="text-sm text-muted-foreground">Memindai database untuk mendeteksi kesamaan domain & entitas...</p>
            </div>
          ) : clusters.length === 0 ? (
            <div className="py-10 text-center rounded-2xl border border-dashed bg-muted/20">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
              <h4 className="font-semibold text-base">Database Bersih & Optimal</h4>
              <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
                Tidak ditemukan kelompok duplikasi domain atau nama perusahaan yang tumpang tindih dalam database operasional saat ini.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {clusters.map((cluster) => {
                const primaryCandidate = cluster.leads[0];
                return (
                  <div
                    key={cluster.cluster_key}
                    className="p-4 rounded-2xl border border-border bg-card/70 hover:border-border/80 transition-all space-y-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {cluster.match_type === 'website_domain' ? (
                          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            <Globe className="h-4 w-4" />
                          </div>
                        ) : (
                          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                            <Building2 className="h-4 w-4" />
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-sm flex items-center gap-2">
                            {cluster.matched_value}
                            <Badge variant="outline" className="text-[10px]">
                              {cluster.match_type === 'website_domain' ? 'Domain Sama' : 'Nama Sama'}
                            </Badge>
                            <Badge variant="neutral" className="text-[10px]">
                              {cluster.confidence}% Match
                            </Badge>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Terdeteksi {cluster.lead_count} entitas lead saling berhubungan
                          </p>
                        </div>
                      </div>

                      {primaryCandidate && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedPrimaryLead(primaryCandidate)}
                          className="gap-1.5 text-xs border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950"
                        >
                          <GitMerge className="h-3.5 w-3.5" />
                          Tinjau & Merge
                        </Button>
                      )}
                    </div>

                    {/* Leads preview pill list */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                      {cluster.leads.map((ld, idx) => (
                        <div
                          key={ld.id}
                          className="p-2.5 rounded-xl border bg-muted/30 text-xs space-y-1 relative"
                        >
                          <div className="flex items-center justify-between font-medium">
                            <span className="truncate pr-1">#{ld.id} {ld.company_name}</span>
                            {idx === 0 && (
                              <span className="text-[9px] px-1 rounded bg-emerald-500/10 text-emerald-600 font-bold shrink-0">
                                Tertua
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                            <span>Score: {ld.lead_score ?? '—'}</span>
                            <span>{ld.contacts_count ?? 0} kontak</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>

      {/* Embedded Single Lead Merge Modal */}
      {selectedPrimaryLead && (
        <MergeLeadModal
          open={!!selectedPrimaryLead}
          onOpenChange={(op) => {
            if (!op) setSelectedPrimaryLead(null);
          }}
          primaryLead={selectedPrimaryLead}
          onMerged={() => {
            refetch();
            onMergedSuccess?.();
          }}
        />
      )}
    </>
  );
}
