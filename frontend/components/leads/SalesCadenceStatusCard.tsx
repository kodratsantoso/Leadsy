'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiFetch';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  GitBranch, Play, Clock, CheckCircle2, AlertCircle, 
  ChevronRight, MessageSquare, Mail, Phone, Calendar 
} from 'lucide-react';

interface SalesCadenceStatusCardProps {
  leadId: number;
  leadName: string;
  onOpenEnrollModal: () => void;
}

const STATUS_BADGES: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'outline' }> = {
  active: { label: 'Aktif', variant: 'success' },
  paused: { label: 'Dijeda', variant: 'warning' },
  completed: { label: 'Selesai', variant: 'outline' },
  stopped: { label: 'Dihentikan', variant: 'danger' },
};

const CHANNEL_ICONS: Record<string, any> = {
  whatsapp: MessageSquare,
  email: Mail,
  call_reminder: Phone,
  internal_task: Clock,
};

export function SalesCadenceStatusCard({
  leadId,
  leadName,
  onOpenEnrollModal,
}: SalesCadenceStatusCardProps) {
  const { data: enrollmentsData, isLoading } = useQuery({
    queryKey: ['lead-cadence-enrollments', leadId],
    queryFn: async () => {
      const res = await apiFetch(`/api/leads/${leadId}/cadence-enrollments`);
      return res.json();
    },
  });

  const enrollments = enrollmentsData?.data || [];
  const activeEnrollment = enrollments.find((e: any) => e.status === 'active') || enrollments[0];

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-2xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-brand/10 text-brand flex items-center justify-center">
            <GitBranch className="h-4 w-4" />
          </div>
          <div>
            <h4 className="font-semibold text-xs text-foreground uppercase tracking-wider">
              Sales Cadence Sequence
            </h4>
            <p className="text-[11px] text-muted-foreground">Otomasi multi-touch follow-up omnichannel</p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onOpenEnrollModal}
          className="h-7 text-xs gap-1 border-brand/30 text-brand hover:bg-brand hover:text-white"
        >
          <Play className="h-3 w-3" />
          {activeEnrollment ? 'Ganti Cadence' : 'Daftarkan Cadence'}
        </Button>
      </div>

      {isLoading ? (
        <div className="py-4 text-center text-xs text-muted-foreground">Memuat data cadence...</div>
      ) : !activeEnrollment ? (
        <div className="rounded-lg border border-dashed border-border p-4 text-center bg-muted/20">
          <p className="text-xs text-muted-foreground">Lead ini belum terdaftar di automated sequence mana pun.</p>
          <button
            type="button"
            onClick={onOpenEnrollModal}
            className="mt-1 text-xs font-semibold text-brand hover:underline inline-flex items-center gap-1"
          >
            Mulai sequence sekarang <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/60">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-foreground">{activeEnrollment.cadence?.name}</span>
                <Badge variant={STATUS_BADGES[activeEnrollment.status]?.variant || 'outline'} className="text-[10px] py-0">
                  {STATUS_BADGES[activeEnrollment.status]?.label || activeEnrollment.status}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1">
                <span>Langkah ke-{activeEnrollment.current_step} dari {activeEnrollment.cadence?.steps?.length || '?'}</span>
                {activeEnrollment.next_execution_at && (
                  <span className="flex items-center gap-1 text-brand font-medium">
                    <Clock className="h-3 w-3" /> Jadwal berikutnya: {new Date(activeEnrollment.next_execution_at).toLocaleDateString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Step Execution Logs */}
          {activeEnrollment.step_logs && activeEnrollment.step_logs.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                RIWAYAT EKSEKUSI TAHAPAN
              </span>
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {activeEnrollment.step_logs.map((log: any) => {
                  const ChannelIcon = CHANNEL_ICONS[log.channel] || Clock;
                  return (
                    <div
                      key={log.id}
                      className="flex items-center justify-between text-xs p-2 rounded-md bg-card border border-border/50 text-[11px]"
                    >
                      <div className="flex items-center gap-2">
                        <ChannelIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium capitalize">{log.channel}</span>
                        <span className="text-muted-foreground truncate max-w-[200px]">
                          {log.executed_content}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] font-semibold ${log.status === 'sent' ? 'text-emerald-500' : 'text-amber-500'}`}>
                          {log.status.toUpperCase()}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(log.created_at).toLocaleDateString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
