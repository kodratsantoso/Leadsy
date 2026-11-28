'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Newspaper,
  Sparkles,
  RefreshCw,
  Search,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  FileCheck2,
  Target,
  ArrowRight,
  Filter,
  Check,
  X,
  PackageCheck,
  MessageSquareQuote,
  HelpCircle,
  Briefcase
} from 'lucide-react';
import { apiFetch } from '@/lib/apiFetch';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface NewsItem {
  id: number;
  headline: string;
  canonical_url: string;
  publisher_name: string | null;
  publisher_domain: string | null;
  published_at: string | null;
  summary: string | null;
  source_provider: string;
  relevance_score: number;
  reliability_score: number;
  is_relevant: boolean;
  is_excluded: boolean;
}

interface BusinessSignal {
  id?: number;
  title: string;
  description: string;
  signal_type: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  impact_level: 'high' | 'medium' | 'low';
  matched_product_id?: number | null;
  matched_product_name?: string | null;
  actionable_recommendation?: string;
}

interface PitchingRecommendation {
  angle_title: string;
  icebreaker: string;
  value_prop: string;
  target_stakeholder: string;
}

interface DiscoveryQuestion {
  question: string;
  objective: string;
  related_news_topic?: string;
}

interface BantcHypotheses {
  budget?: string;
  authority?: string;
  need?: string;
  timeline?: string;
  competitor?: string;
}

interface NewsAnalysis {
  id: number;
  business_summary: string | null;
  business_outlook: string | null;
  opportunity_signals: BusinessSignal[];
  risk_signals: BusinessSignal[];
  pitching_recommendations: PitchingRecommendation[];
  discovery_questions: DiscoveryQuestion[];
  bantc_hypotheses: BantcHypotheses;
  confidence: number;
  created_at: string;
}

interface Props {
  leadId: string | number;
  leadData: any;
}

export function NewsAndSignalsTab({ leadId, leadData }: Props) {
  const qc = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'high_relevance' | 'opportunities' | 'risks'>('all');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [appliedBriefIndex, setAppliedBriefIndex] = useState<number | null>(null);

  // 1. Query News & Signals
  const { data: newsPayload, isLoading, isRefetching } = useQuery({
    queryKey: ['lead-company-news', leadId],
    queryFn: async () => {
      const res = await apiFetch(`/leads/${leadId}/company-news`);
      if (!res.ok) throw new Error('Failed to load company news');
      return res.json();
    },
  });

  const news: NewsItem[] = newsPayload?.data?.news || [];
  const signals: BusinessSignal[] = newsPayload?.data?.signals || [];
  const analysis: NewsAnalysis | null = newsPayload?.data?.latest_analysis || null;
  const stats = newsPayload?.data?.stats || {
    total_news: 0,
    high_relevance_count: 0,
    opportunity_count: 0,
    risk_count: 0,
  };

  // 2. Discover News Mutation
  const discoverMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch(`/leads/${leadId}/company-news/discover`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Gagal mencari berita');
      return json;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['lead-company-news', leadId] });
      setFeedback({ type: 'success', message: data.message || 'Pencarian berita berhasil diperbarui!' });
    },
    onError: (err: any) => {
      setFeedback({ type: 'error', message: err.message || 'Gagal mencari berita perusahaan.' });
    },
  });

  // 3. Analyze News Mutation
  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch(`/leads/${leadId}/company-news/analyze`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Gagal menganalisis sinyal bisnis');
      return json;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['lead-company-news', leadId] });
      setFeedback({ type: 'success', message: data.message || 'Analisis sinyal bisnis berhasil diperbarui!' });
    },
    onError: (err: any) => {
      setFeedback({ type: 'error', message: err.message || 'Gagal menganalisis sinyal bisnis.' });
    },
  });

  // 4. Update Relevance Mutation
  const toggleRelevanceMutation = useMutation({
    mutationFn: async ({ newsId, is_relevant, is_excluded }: { newsId: number; is_relevant: boolean; is_excluded: boolean }) => {
      const res = await apiFetch(`/leads/${leadId}/company-news/${newsId}/relevance`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_relevant, is_excluded }),
      });
      if (!res.ok) throw new Error('Gagal memperbarui status berita');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lead-company-news', leadId] });
    },
  });

  // 5. Apply to Brief Mutation
  const applyToBriefMutation = useMutation({
    mutationFn: async ({ angle, index }: { angle: PitchingRecommendation; index: number }) => {
      setAppliedBriefIndex(index);
      const res = await apiFetch(`/leads/${leadId}/company-news/apply-to-brief`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ angle }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Gagal menyematkan ke brief');
      return json;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['lead-pre-meeting-brief', leadId] });
      setFeedback({ type: 'success', message: data.message || 'Angle pitching berhasil disematkan ke Pre-Meeting Brief!' });
    },
    onError: (err: any) => {
      setFeedback({ type: 'error', message: err.message || 'Gagal menyematkan ke brief' });
    },
    onSettled: () => {
      setTimeout(() => setAppliedBriefIndex(null), 2500);
    },
  });

  // Filtered news items
  const filteredNews = news.filter((item) => {
    if (item.is_excluded) return false;
    if (filterType === 'high_relevance' && item.relevance_score < 80) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.headline.toLowerCase().includes(term) ||
      (item.publisher_name && item.publisher_name.toLowerCase().includes(term)) ||
      (item.summary && item.summary.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      {/* ── Top Action Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-raised)] p-5 shadow-xs">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2.5">
            <Newspaper className="w-5 h-5 text-[var(--brand)]" />
            Company News & Business Signals Intelligence
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Pantau publikasi media terkini, identifikasi sinyal pertumbuhan & risiko, dan sesuaikan sudut penawaran untuk{' '}
            <strong className="text-[var(--text-primary)] font-semibold">{leadData?.company_name}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => discoverMutation.mutate()}
            disabled={discoverMutation.isPending || isRefetching}
            className="cursor-pointer gap-2"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', (discoverMutation.isPending || isRefetching) && 'animate-spin')} />
            {discoverMutation.isPending ? 'Mencari Berita...' : 'Temukan Berita'}
          </Button>

          <Button
            size="sm"
            onClick={() => analyzeMutation.mutate()}
            disabled={analyzeMutation.isPending || news.length === 0}
            className="cursor-pointer gap-2 bg-[var(--brand)] text-[var(--brand-foreground,#ffffff)] hover:opacity-90"
          >
            <Sparkles className={cn('w-3.5 h-3.5', analyzeMutation.isPending && 'animate-spin')} />
            {analyzeMutation.isPending ? 'Menganalisis...' : 'Analisis Sinyal Bisnis'}
          </Button>
        </div>
      </div>

      {/* ── Feedback Banner ── */}
      {feedback && (
        <div
          className={cn(
            'flex items-center justify-between gap-3 rounded-xl p-3.5 text-xs border transition-all',
            feedback.type === 'success'
              ? 'border-[var(--status-success)]/30 bg-[color-mix(in_oklch,var(--status-success)_10%,transparent)] text-[var(--status-success)]'
              : 'border-[var(--status-danger)]/30 bg-[color-mix(in_oklch,var(--status-danger)_10%,transparent)] text-[var(--status-danger)]'
          )}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
            <span className="font-medium">{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-xs opacity-70 hover:opacity-100 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── KPI Stats Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <Card className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-default)] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-secondary)]">Total Berita Terverifikasi</span>
            <Newspaper className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">{stats.total_news}</span>
            <span className="text-[11px] text-[var(--text-muted)]">artikel</span>
          </div>
        </Card>

        <Card className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-default)] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-secondary)]">Relevansi Tinggi (&ge;80%)</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">{stats.high_relevance_count}</span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">terkurasi</span>
          </div>
        </Card>

        <Card className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-default)] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-secondary)]">Peluang Penjualan (Opportunities)</span>
            <TrendingUp className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">{stats.opportunity_count}</span>
            <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">sinyal positif</span>
          </div>
        </Card>

        <Card className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-default)] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-secondary)]">Faktor Risiko / Tantangan</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">{stats.risk_count}</span>
            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">perlu mitigasi</span>
          </div>
        </Card>
      </div>

      {/* ── Executive Strategic Outlook (AI Generated) ── */}
      {analysis && (
        <Card className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-raised)] shadow-xs overflow-hidden">
          <div className="border-b border-[var(--border-default)] px-6 py-4 bg-muted/10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-[var(--brand)]" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Strategic Corporate Outlook & Trajectory</h3>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[11px] font-mono">
                AI Confidence: {analysis.confidence}%
              </Badge>
              <Badge variant="neutral" className="text-[11px] capitalize">
                {analysis.business_outlook || 'Neutral Momentum'}
              </Badge>
            </div>
          </div>

          <CardContent className="p-6 space-y-4">
            <div className="rounded-xl bg-background border border-[var(--border-default)] p-4">
              <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Executive Summary</p>
              <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                {analysis.business_summary || 'Belum ada ringkasan eksekutif yang tersedia.'}
              </p>
            </div>

            {/* BANTC Hypotheses */}
            {analysis.bantc_hypotheses && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
                <div className="rounded-xl border border-[var(--border-default)] bg-muted/20 p-3 space-y-1">
                  <span className="text-[11px] font-bold text-indigo-500 uppercase">Budget</span>
                  <p className="text-xs text-[var(--text-secondary)] leading-snug">{analysis.bantc_hypotheses.budget || '-'}</p>
                </div>
                <div className="rounded-xl border border-[var(--border-default)] bg-muted/20 p-3 space-y-1">
                  <span className="text-[11px] font-bold text-indigo-500 uppercase">Authority</span>
                  <p className="text-xs text-[var(--text-secondary)] leading-snug">{analysis.bantc_hypotheses.authority || '-'}</p>
                </div>
                <div className="rounded-xl border border-[var(--border-default)] bg-muted/20 p-3 space-y-1">
                  <span className="text-[11px] font-bold text-indigo-500 uppercase">Need</span>
                  <p className="text-xs text-[var(--text-secondary)] leading-snug">{analysis.bantc_hypotheses.need || '-'}</p>
                </div>
                <div className="rounded-xl border border-[var(--border-default)] bg-muted/20 p-3 space-y-1">
                  <span className="text-[11px] font-bold text-indigo-500 uppercase">Timeline</span>
                  <p className="text-xs text-[var(--text-secondary)] leading-snug">{analysis.bantc_hypotheses.timeline || '-'}</p>
                </div>
                <div className="rounded-xl border border-[var(--border-default)] bg-muted/20 p-3 space-y-1">
                  <span className="text-[11px] font-bold text-indigo-500 uppercase">Competitor</span>
                  <p className="text-xs text-[var(--text-secondary)] leading-snug">{analysis.bantc_hypotheses.competitor || '-'}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Business Signals: Opportunities & Risks Grid ── */}
      {analysis && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Opportunities Column */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                Opportunities & Expansion Signals
              </h3>
              <Badge variant="neutral" className="text-xs">
                {(analysis.opportunity_signals || []).length} Identified
              </Badge>
            </div>

            <div className="space-y-3">
              {(analysis.opportunity_signals || []).map((sig, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2.5 transition-all hover:border-emerald-500/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 leading-snug">
                      {sig.title}
                    </span>
                    <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider border-emerald-500/30 text-emerald-600">
                      {sig.impact_level} impact
                    </Badge>
                  </div>

                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{sig.description}</p>

                  {/* Matched Product Master */}
                  {sig.matched_product_name && (
                    <div className="flex items-center gap-1.5 pt-1 text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                      <PackageCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>Product Match: <strong>{sig.matched_product_name}</strong></span>
                    </div>
                  )}

                  {sig.actionable_recommendation && (
                    <div className="mt-2 pt-2 border-t border-emerald-500/10 flex items-start gap-1.5 text-[11px] text-[var(--text-muted)]">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <span><strong>Tindakan:</strong> {sig.actionable_recommendation}</span>
                    </div>
                  )}
                </div>
              ))}
              {(analysis.opportunity_signals || []).length === 0 && (
                <div className="rounded-xl border border-dashed border-[var(--border-default)] p-6 text-center text-xs text-[var(--text-muted)]">
                  Belum ada sinyal peluang yang diekstraksi dari artikel ini.
                </div>
              )}
            </div>
          </div>

          {/* Risks & Roadblocks Column */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Risks & Potential Roadblocks
              </h3>
              <Badge variant="neutral" className="text-xs">
                {(analysis.risk_signals || []).length} Identified
              </Badge>
            </div>

            <div className="space-y-3">
              {(analysis.risk_signals || []).map((sig, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2.5 transition-all hover:border-amber-500/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 leading-snug">
                      {sig.title}
                    </span>
                    <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider border-amber-500/30 text-amber-600">
                      {sig.impact_level} impact
                    </Badge>
                  </div>

                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{sig.description}</p>

                  {sig.actionable_recommendation && (
                    <div className="mt-2 pt-2 border-t border-amber-500/10 flex items-start gap-1.5 text-[11px] text-[var(--text-muted)]">
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                      <span><strong>Mitigasi Penjualan:</strong> {sig.actionable_recommendation}</span>
                    </div>
                  )}
                </div>
              ))}
              {(analysis.risk_signals || []).length === 0 && (
                <div className="rounded-xl border border-dashed border-[var(--border-default)] p-6 text-center text-xs text-[var(--text-muted)]">
                  Tidak terdeteksi risiko signifikan dalam publikasi berita terbaru.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Strategic Pitching Recommendations & Discovery Questions ── */}
      {analysis && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-500" />
              Strategic Pitching Angles & Value Propositions
            </h3>
            <span className="text-xs text-[var(--text-muted)]">Sesuaikan pendekatan sebelum panggilan atau meeting sales</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(analysis.pitching_recommendations || []).map((pitch, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-raised)] p-5 space-y-3.5 shadow-xs flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-bold text-[var(--text-primary)]">{pitch.angle_title}</span>
                    <Badge variant="outline" className="text-[10px] shrink-0 font-medium text-indigo-600 dark:text-indigo-400">
                      Target: {pitch.target_stakeholder}
                    </Badge>
                  </div>

                  <div className="rounded-lg bg-muted/20 p-3 space-y-1 text-xs">
                    <span className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Opening Icebreaker</span>
                    <p className="text-[var(--text-secondary)] italic leading-relaxed">
                      &ldquo;{pitch.icebreaker}&rdquo;
                    </p>
                  </div>

                  <div className="space-y-1 text-xs">
                    <span className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Value Proposition</span>
                    <p className="text-[var(--text-primary)] leading-relaxed">{pitch.value_prop}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => applyToBriefMutation.mutate({ angle: pitch, index: idx })}
                    disabled={appliedBriefIndex === idx}
                    className="w-full text-xs cursor-pointer gap-2 border-[var(--brand)] text-[var(--brand)] hover:bg-[var(--brand)] hover:text-white"
                  >
                    {appliedBriefIndex === idx ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Tersimpan di Pre-Meeting Brief!
                      </>
                    ) : (
                      <>
                        <FileCheck2 className="w-3.5 h-3.5" />
                        Terapkan ke Pre-Meeting Brief
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Strategic Discovery Questions ── */}
      {analysis && (analysis.discovery_questions || []).length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-purple-500" />
            Recommended Discovery Questions for Next Meeting
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {analysis.discovery_questions.map((q, idx) => (
              <div key={idx} className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-default)] p-4 space-y-2">
                <div className="flex items-start gap-2">
                  <MessageSquareQuote className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                  <p className="text-xs font-semibold text-[var(--text-primary)] leading-relaxed">
                    {q.question}
                  </p>
                </div>
                <div className="pl-6 text-[11px] text-[var(--text-muted)]">
                  <strong>Tujuan:</strong> {q.objective}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Verified Company News Feed ── */}
      <div className="space-y-4 pt-4 border-t border-[var(--border-default)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Verified News & Publication Feed</h3>
            <Badge variant="neutral" className="text-xs">{filteredNews.length} of {news.length}</Badge>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative w-48 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <Input
                placeholder="Cari headline atau sumber..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 text-xs h-8"
              />
            </div>

            <div className="flex items-center rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] p-0.5 text-xs">
              <button
                onClick={() => setFilterType('all')}
                className={cn('px-2.5 py-1 rounded-md cursor-pointer transition-colors', filterType === 'all' && 'bg-[var(--brand)] text-white font-medium')}
              >
                Semua
              </button>
              <button
                onClick={() => setFilterType('high_relevance')}
                className={cn('px-2.5 py-1 rounded-md cursor-pointer transition-colors', filterType === 'high_relevance' && 'bg-[var(--brand)] text-white font-medium')}
              >
                Relevansi Tinggi
              </button>
            </div>
          </div>
        </div>

        {/* News Feed Cards */}
        <div className="space-y-3">
          {filteredNews.map((article) => (
            <div
              key={article.id}
              className={cn(
                'rounded-xl border p-4.5 space-y-3 transition-all bg-[var(--surface-raised)]',
                article.is_relevant ? 'border-[var(--border-default)]' : 'border-[var(--border-default)] opacity-60'
              )}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      {article.publisher_name || article.publisher_domain || 'Online Media'}
                    </span>
                    <span className="text-[var(--text-muted)]">&bull;</span>
                    <span className="text-[var(--text-muted)] font-mono">
                      {article.published_at ? new Date(article.published_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Baru saja'}
                    </span>
                    <span className="text-[var(--text-muted)]">&bull;</span>
                    <span className="text-[10px] text-[var(--text-muted)]">{article.source_provider}</span>
                  </div>

                  <a
                    href={article.canonical_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-bold text-[var(--text-primary)] hover:text-[var(--brand)] hover:underline inline-flex items-center gap-1.5 leading-snug group"
                  >
                    <span>{article.headline}</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 shrink-0" />
                  </a>

                  {article.summary && (
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-2">
                      {article.summary}
                    </p>
                  )}
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <Badge variant={article.relevance_score >= 80 ? 'neutral' : 'outline'} className="text-[11px] font-mono">
                      Relevance: {article.relevance_score}%
                    </Badge>
                    <Badge variant="outline" className="text-[11px] font-mono border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                      Reliability: {article.reliability_score}%
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        toggleRelevanceMutation.mutate({
                          newsId: article.id,
                          is_relevant: !article.is_relevant,
                          is_excluded: article.is_relevant,
                        })
                      }
                      title={article.is_relevant ? 'Tandai tidak relevan' : 'Tandai relevan'}
                      className={cn(
                        'text-[11px] px-2 py-1 rounded-md border font-medium cursor-pointer transition-colors',
                        article.is_relevant
                          ? 'border-[var(--border-default)] text-[var(--text-muted)] hover:bg-[var(--surface-subtle)]'
                          : 'border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20'
                      )}
                    >
                      {article.is_relevant ? 'Sembunyikan' : 'Pulihkan'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filteredNews.length === 0 && !isLoading && (
            <div className="rounded-2xl border border-dashed border-[var(--border-default)] p-12 text-center space-y-3">
              <Newspaper className="w-8 h-8 text-[var(--text-muted)] mx-auto opacity-50" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {news.length === 0 ? 'Belum ada berita yang ditemukan' : 'Tidak ada berita yang cocok dengan filter'}
                </p>
                <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
                  {news.length === 0
                    ? 'Klik tombol "Temukan Berita" di atas untuk mencari publikasi media dan siaran pers terbaru seputar perusahaan ini.'
                    : 'Coba ubah kata kunci pencarian atau ganti filter kategori berita.'}
                </p>
              </div>
              {news.length === 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => discoverMutation.mutate()}
                  disabled={discoverMutation.isPending}
                  className="cursor-pointer gap-2 mt-2"
                >
                  <RefreshCw className={cn('w-3.5 h-3.5', discoverMutation.isPending && 'animate-spin')} />
                  Jalankan Temukan Berita
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
