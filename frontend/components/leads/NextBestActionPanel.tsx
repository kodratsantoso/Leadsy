'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiFetch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  Sparkles,
  Zap,
  ArrowRight,
  AlertCircle,
  Clock,
  TrendingUp,
  ShieldCheck,
  RefreshCw,
  Loader2,
  CheckCircle2,
  ChevronRight,
  Flame,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NextBestAction {
  id: string;
  title: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  category: 'qualification' | 'risk_mitigation' | 'deal_velocity' | 'enrichment' | 'strategy';
  reasoning: string;
  impact_score: number;
  action_type: 'navigate_tab' | 'open_modal' | 'trigger_api';
  action_payload: Record<string, any>;
  action_label: string;
}

interface NextBestActionResponse {
  success: boolean;
  data: {
    lead_id: number;
    company_name: string;
    total_recommendations: number;
    generated_at: string;
    actions: NextBestAction[];
  };
}

interface NextBestActionPanelProps {
  leadId: number | string;
  onNavigateTab?: (tab: string) => void;
  onOpenModal?: (modal: string) => void;
  className?: string;
}

export function NextBestActionPanel({
  leadId,
  onNavigateTab,
  onOpenModal,
  className,
}: NextBestActionPanelProps) {
  const { data, isLoading, isFetching, refetch } = useQuery<NextBestActionResponse>({
    queryKey: ['lead-next-best-actions', leadId],
    queryFn: async () => {
      const res = await apiFetch(`/leads/${leadId}/next-best-actions`);
      if (!res.ok) throw new Error('Gagal memuat rekomendasi tindakan.');
      return res.json();
    },
    enabled: !!leadId,
  });

  const actions = data?.data?.actions || [];

  const handleExecuteAction = (action: NextBestAction) => {
    if (action.action_type === 'navigate_tab' && action.action_payload?.tab) {
      onNavigateTab?.(action.action_payload.tab);
    } else if (action.action_type === 'open_modal' && action.action_payload?.modal) {
      onOpenModal?.(action.action_payload.modal);
    }
  };

  const getPriorityBadge = (priority: NextBestAction['priority']) => {
    switch (priority) {
      case 'urgent':
        return (
          <Badge variant="danger" className="text-[10px] font-bold uppercase tracking-wider animate-pulse flex items-center gap-1">
            <Flame className="h-3 w-3" />
            Mendesak
          </Badge>
        );
      case 'high':
        return (
          <Badge variant="warning" className="text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Prioritas Tinggi
          </Badge>
        );
      case 'medium':
        return (
          <Badge variant="brand" className="text-[10px] font-medium flex items-center gap-1">
            <Zap className="h-3 w-3" />
            Rekomendasi
          </Badge>
        );
      default:
        return (
          <Badge variant="neutral" className="text-[10px] flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Opsional
          </Badge>
        );
    }
  };

  const getCategoryLabel = (category: NextBestAction['category']) => {
    switch (category) {
      case 'qualification':
        return 'Kualifikasi BANTC';
      case 'risk_mitigation':
        return 'Mitigasi Risiko Deal';
      case 'deal_velocity':
        return 'Deal Velocity';
      case 'enrichment':
        return 'Data Enrichment';
      case 'strategy':
        return 'Presales & Pitch';
      default:
        return 'Langkah Sales';
    }
  };

  return (
    <Card className={cn("overflow-hidden border-border/80 shadow-xs", className)}>
      <CardHeader className="p-4 pb-3 border-b border-border/60 bg-muted/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold tracking-tight flex items-center gap-2">
                AI Next Best Actions
                {actions.length > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold">
                    {actions.length}
                  </span>
                )}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Preskripsi prioritas berbasis evaluasi BANTC, deal slippage, dan status cadence
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => refetch()}
            disabled={isLoading || isFetching}
            title="Refresh rekomendasi AI"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        {isLoading ? (
          <div className="py-8 flex flex-col items-center justify-center text-center">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mb-2" />
            <p className="text-xs text-muted-foreground">Menganalisis pipeline gaps dan mensintesis Next Best Actions...</p>
          </div>
        ) : actions.length === 0 ? (
          <div className="py-6 flex flex-col items-center justify-center text-center px-4 rounded-xl border border-dashed border-border/60 bg-muted/10">
            <CheckCircle2 className="h-7 w-7 text-emerald-500 mb-2" />
            <p className="text-sm font-medium">Pipeline Terkelola Optimal</p>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-md">
              Tidak ada kesenjangan kualifikasi BANTC, follow-up overdue, atau deal slippage yang terdeteksi untuk lead ini.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {actions.map((act) => (
              <div
                key={act.id}
                className={cn(
                  "p-3.5 rounded-xl border transition-all duration-150 flex flex-col md:flex-row md:items-center justify-between gap-3 group",
                  act.priority === 'urgent'
                    ? "border-red-300/60 dark:border-red-900/40 bg-red-50/30 dark:bg-red-950/10 hover:border-red-400"
                    : act.priority === 'high'
                    ? "border-amber-300/60 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/10 hover:border-amber-400"
                    : "border-border/70 bg-card hover:border-indigo-300 hover:shadow-xs"
                )}
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {getPriorityBadge(act.priority)}
                    <span className="text-[11px] font-medium text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
                      {getCategoryLabel(act.category)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Potensi Dampak: <strong className="text-foreground">{act.impact_score}%</strong>
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-1.5">
                    {act.title}
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {act.reasoning}
                  </p>
                </div>

                <div className="shrink-0 pt-1 md:pt-0">
                  <Button
                    size="sm"
                    variant={act.priority === 'urgent' ? 'default' : 'outline'}
                    onClick={() => handleExecuteAction(act)}
                    className={cn(
                      "w-full md:w-auto text-xs gap-1.5 font-medium transition-transform active:scale-95",
                      act.priority === 'urgent'
                        ? "bg-red-600 hover:bg-red-700 text-white"
                        : "border-border hover:bg-muted"
                    )}
                  >
                    <span>{act.action_label}</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
