'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiFetch';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { 
  GitBranch, Play, Clock, MessageSquare, Phone, Mail, 
  CheckCircle2, AlertCircle, Loader2, Sparkles, ChevronRight, Settings, ExternalLink 
} from 'lucide-react';

interface EnrollCadenceModalProps {
  leadId: number;
  leadName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const CHANNEL_ICONS: Record<string, any> = {
  whatsapp: MessageSquare,
  email: Mail,
  call_reminder: Phone,
  internal_task: Clock,
};

export function EnrollCadenceModal({
  leadId,
  leadName,
  isOpen,
  onClose,
  onSuccess,
}: EnrollCadenceModalProps) {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [selectedCadenceId, setSelectedCadenceId] = useState<number | null>(null);

  // Fetch available active cadences
  const { data: cadencesData, isLoading: isLoadingCadences } = useQuery({
    queryKey: ['sales-cadences'],
    queryFn: async () => {
      const res = await apiFetch('/api/sales-cadences');
      return res.json();
    },
    enabled: isOpen,
  });

  const cadences = cadencesData?.data || [];
  const selectedCadence = cadences.find((c: any) => c.id === selectedCadenceId);

  // Mutation to enroll
  const enrollMutation = useMutation({
    mutationFn: async (cadenceId: number) => {
      const res = await apiFetch(`/api/leads/${leadId}/enroll-cadence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          cadence_id: cadenceId,
          sales_cadence_id: cadenceId,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Gagal mendaftarkan ke cadence sequence.');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success(
        'Berhasil Didaftarkan',
        `${leadName} berhasil didaftarkan ke cadence sequence.`
      );
      queryClient.invalidateQueries({ queryKey: ['lead-cadence-enrollments', leadId] });
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      toast.error(
        'Gagal Mendaftarkan',
        err.message || 'Terjadi kesalahan sistem saat mendaftarkan cadence.'
      );
    },
  });

  const handleNavigateToSetup = () => {
    onClose();
    router.push('/settings/cadences');
  };

  return (
    <Modal
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="Daftarkan ke Sales Cadence Sequence"
      description={`Pilih alur outreach otomatis multi-touch untuk ${leadName}`}
      size="lg"
    >
      <div className="space-y-4 py-2">
        {isLoadingCadences ? (
          <div className="flex items-center justify-center p-8 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-brand" />
            <span className="text-sm">Memuat daftar cadence aktif...</span>
          </div>
        ) : cadences.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-muted-foreground bg-muted/20">
            <GitBranch className="h-8 w-8 mx-auto mb-2 text-brand/70" />
            <p className="text-sm font-semibold text-foreground">Belum ada Sales Cadence yang aktif</p>
            <p className="text-xs mt-1 text-muted-foreground max-w-sm mx-auto">
              Buat dan aktifkan alur sequence outreach multi-channel terlebih dahulu di menu Pengaturan Cadence agar prospek dapat didaftarkan.
            </p>
            <Button
              size="sm"
              onClick={handleNavigateToSetup}
              className="mt-3.5 bg-brand text-white hover:bg-brand/90 gap-1.5 text-xs h-8"
            >
              <Settings className="h-3.5 w-3.5" />
              Setup Sales Cadence Sekarang
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                PILIH CADENCE SEQUENCE
              </label>
              <button
                type="button"
                onClick={handleNavigateToSetup}
                className="text-[11px] text-brand hover:underline flex items-center gap-1 font-medium"
              >
                + Kelola / Buat Cadence Baru &rarr;
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2.5 max-h-60 overflow-y-auto pr-1">
              {cadences.map((cadence: any) => {
                const isSelected = selectedCadenceId === cadence.id;
                return (
                  <div
                    key={cadence.id}
                    onClick={() => setSelectedCadenceId(cadence.id)}
                    className={`cursor-pointer rounded-xl border p-3.5 transition-all flex items-start justify-between gap-3 ${
                      isSelected
                        ? 'border-brand bg-brand/5 shadow-xs ring-1 ring-brand/40'
                        : 'border-border bg-card hover:bg-muted/50'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">{cadence.name}</span>
                        {cadence.trigger_type && (
                          <Badge variant="outline" className="text-[10px] py-0 uppercase">
                            {cadence.trigger_type.replace('_', ' ')}
                          </Badge>
                        )}
                        {cadence.target_audience && (
                          <Badge variant="neutral" className="text-[10px] py-0">
                            {cadence.target_audience}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {cadence.description || 'Tidak ada deskripsi'}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1">
                        <span className="flex items-center gap-1">
                          <GitBranch className="h-3 w-3 text-brand" /> {cadence.steps?.length || 0} Langkah
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Auto Execution Ready
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 mt-1">
                      <div
                        className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                          isSelected ? 'border-brand bg-brand text-white' : 'border-muted-foreground/30'
                        }`}
                      >
                        {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Sequence Steps Preview */}
            {selectedCadence && selectedCadence.steps && selectedCadence.steps.length > 0 && (
              <div className="mt-4 pt-3 border-t border-border space-y-2.5">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  PREVIEW TAHAPAN ({selectedCadence.steps.length} LANGKAH)
                </span>
                <div className="space-y-2 bg-muted/30 rounded-xl p-3 max-h-48 overflow-y-auto">
                  {selectedCadence.steps.map((st: any, idx: number) => {
                    const ChannelIcon = CHANNEL_ICONS[st.channel] || MessageSquare;
                    const stepNum = st.step_number ?? st.step_order ?? (idx + 1);
                    const bodyText = st.template_body ?? st.content_template ?? '';

                    return (
                      <div key={st.id || idx} className="flex items-center gap-3 text-xs bg-card p-2 rounded-lg border border-border/60">
                        <div className="h-6 w-6 rounded-md bg-muted flex items-center justify-center font-bold text-[10px] text-muted-foreground shrink-0">
                          #{stepNum}
                        </div>
                        <div className="h-6 w-6 rounded-md bg-brand/10 text-brand flex items-center justify-center shrink-0">
                          <ChannelIcon className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground truncate">{st.channel.toUpperCase()}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {st.delay_days === 0 && (!st.delay_hours || st.delay_hours === 0) 
                                ? 'Hari ke-0 (Segera)' 
                                : `+${st.delay_days} hari`}
                            </span>
                          </div>
                          {st.template_subject && (
                            <p className="text-[11px] font-medium text-foreground truncate">
                              Subjek: {st.template_subject}
                            </p>
                          )}
                          <p className="text-[11px] text-muted-foreground truncate">{bodyText}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border mt-4">
          <Button variant="outline" size="sm" onClick={onClose} disabled={enrollMutation.isPending}>
            Batal
          </Button>

          {cadences.length === 0 ? (
            <Button
              size="sm"
              className="bg-brand text-white hover:bg-brand/90 gap-1.5"
              onClick={handleNavigateToSetup}
            >
              <Settings className="h-3.5 w-3.5" />
              Buka Setup Cadence &rarr;
            </Button>
          ) : (
            <Button
              size="sm"
              className="bg-brand text-white hover:bg-brand/90 gap-1.5"
              disabled={!selectedCadenceId || enrollMutation.isPending}
              onClick={() => selectedCadenceId && enrollMutation.mutate(selectedCadenceId)}
            >
              {enrollMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5 fill-current" />
              )}
              Mulai Cadence Sekarang
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
