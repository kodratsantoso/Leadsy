'use client';

import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiFetch';
import { useState, useEffect } from 'react';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  ArrowLeft, Plus, Zap, TrendingUp, MessageSquare, Calendar,
  AlertCircle, CheckCircle, Clock, User, FileText, Loader2,
  Phone, Mail, MapPin, Star, StarOff, Pencil, Trash2, X, Shield, ChevronDown,
  Target, DollarSign, BrainCircuit, ShieldCheck, ThumbsUp, ThumbsDown,
  Building2, ClipboardList, Sparkles, CornerDownRight, ChevronRight,
  Activity, Info, Search, ExternalLink, Printer,
} from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import Link from 'next/link';
import { cn, safeJsonArray } from '@/lib/utils';
import { useNumberFormat } from '@/lib/hooks/use-number-format';
import { LeadBantcQuestionGuide } from '@/components/leads/LeadBantcQuestionGuide';

/* ── Source badge ──────────────────────────────────────────────────── */

const SOURCE_STYLES: Record<string, string> = {
  LUSHA:   'bg-[color-mix(in_oklch,var(--brand)_15%,transparent)] text-[var(--brand)] border-[var(--brand)]/30',
  GOOGLE_SEARCH: 'bg-[color-mix(in_oklch,var(--status-info)_15%,transparent)] text-[var(--status-info)] border-[var(--status-info)]/30',
  LINKEDIN: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  manual:  'bg-[color-mix(in_oklch,var(--status-success)_15%,transparent)] text-[var(--status-success)] border-[var(--status-success)]/30',
  website: 'bg-[color-mix(in_oklch,var(--status-info)_15%,transparent)] text-[var(--status-info)] border-[var(--status-info)]/30',
  other:   'bg-muted text-muted-foreground border-border',
};

function SourceBadge({ source }: { source?: string | null }) {
  const label = source === 'GOOGLE_SEARCH' ? 'GOOGLE' : source?.toUpperCase() ?? 'OTHER';
  const style = SOURCE_STYLES[source ?? 'other'] ?? SOURCE_STYLES.other;
  return (
    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide ${style}`}>
      {label}
    </span>
  );
}

function ConfidenceDot({ score }: { score?: number | null }) {
  const pct = score ?? 0;
  const color = pct >= 80 ? 'bg-[var(--status-success)]' : pct >= 50 ? 'bg-[var(--status-warning)]' : 'bg-[var(--status-danger)]';
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-medium tabular-nums text-muted-foreground">{pct}%</span>
    </div>
  );
}

/* ── Revenue Analysis Panel ────────────────────────────────────────── */

const INTENT_CFG = {
  high:   { cls: 'bg-[color-mix(in_oklch,var(--status-success)_15%,transparent)] text-[var(--status-success)] border-[var(--status-success)]/40', label: 'HIGH' },
  medium: { cls: 'bg-[color-mix(in_oklch,var(--status-warning)_15%,transparent)] text-[var(--status-warning)] border-[var(--status-warning)]/40', label: 'MEDIUM' },
  low:    { cls: 'bg-muted text-muted-foreground border-border', label: 'LOW' },
};

function IntentBadge({ level }: { level?: string | null }) {
  const cfg = INTENT_CFG[level as keyof typeof INTENT_CFG] ?? INTENT_CFG.low;
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${cfg.cls}`}>{cfg.label}</span>
  );
}

function ConfidenceBar({ value }: { value?: number | null }) {
  const pct = ((value ?? 0) * 100);
  const color = pct >= 70 ? 'var(--status-success)' : pct >= 40 ? 'var(--status-warning)' : 'var(--status-danger)';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-muted/50 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="w-10 text-right text-xs font-medium tabular-nums text-muted-foreground">{pct.toFixed(0)}%</span>
    </div>
  );
}

type LushaCandidate = {
  id: number;
  name: string | null;
  title: string | null;
  company_name: string | null;
  company_domain: string | null;
  has_email: boolean;
  has_phone: boolean;
  reveal_phone_credits: number;
  status: string;
};

type GoogleContactCandidate = {
  id: number;
  name: string | null;
  title: string | null;
  company_name: string | null;
  company_domain: string | null;
  linkedin_url?: string | null;
  linkedin_id?: string | null;
  confidence_score?: number | null;
  relevance_reason?: string | null;
  evidence?: string | null;
  status: string;
};

function gradeVariant(grade?: string | null) {
  const normalized = grade?.toLowerCase();
  if (normalized === 'hot') return 'success';
  if (normalized === 'warm') return 'warning';
  return 'neutral';
}

function qualificationLabel(value?: string | null) {
  if (!value) return 'Unknown';
  return value.replace(/_/g, ' ');
}

function icpVariant(status?: string | null) {
  if (status === 'strong_match') return 'success';
  if (status === 'partial_match') return 'warning';
  if (status === 'weak_match') return 'neutral';
  return 'outline';
}

function icpLabel(status?: string | null) {
  if (status === 'strong_match') return 'Strong match';
  if (status === 'partial_match') return 'Partial match';
  if (status === 'weak_match') return 'Weak match';
  return 'Not evaluated';
}

function clampPercent(value?: number | null) {
  return Math.max(0, Math.min(100, value ?? 0));
}

function pipelineGateWarnings(params: {
  score?: number | null;
  qualificationStatus?: string | null;
  reviewBlocked?: boolean;
}) {
  const warnings: string[] = [];

  if (params.score == null) {
    warnings.push('Lead score must be calculated before pipeline entry.');
  } else if (params.score < 60) {
    warnings.push('Lead score is below the minimum pipeline threshold of 60.');
  }

  if (!['eligible', 'potential'].includes(params.qualificationStatus ?? '')) {
    warnings.push('Qualification must be eligible or potential before entering the pipeline.');
  }

  if (params.reviewBlocked) {
    warnings.push('Human review approval is required before this lead can be pushed into the pipeline.');
  }

  return warnings;
}

function RevenueAnalysisPanel({ analysis }: { analysis: any }) {
  const { formatNumber, formatCurrency } = useNumberFormat();
  const date = analysis.created_at ? new Date(analysis.created_at).toLocaleString() : '';
  const model = analysis.ai_model ? analysis.ai_model.split('-').slice(0, 3).join('-') : 'AI';

  return (
    <div className="rounded-xl border border-[var(--brand)]/25 bg-gradient-to-br from-[color-mix(in_oklch,var(--brand)_8%,transparent)] to-card p-5 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-[var(--brand)]" />
            <h3 className="font-semibold text-sm">Revenue Intelligence Analysis</h3>
            {analysis.status === 'failed' && (
              <span className="rounded-full bg-[color-mix(in_oklch,var(--status-danger)_15%,transparent)] px-2 py-0.5 text-[10px] font-semibold text-[var(--status-danger)]">FAILED</span>
            )}
            {analysis.status === 'partial' && (
              <span className="rounded-full bg-[color-mix(in_oklch,var(--status-warning)_15%,transparent)] px-2 py-0.5 text-[10px] font-semibold text-[var(--status-warning)]">PARTIAL</span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">{model} · {date}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold tabular-nums">{formatNumber(analysis.probability_to_close, { decimals: 0 })}<span className="text-xs font-normal text-muted-foreground">%</span></p>
          <p className="text-[10px] text-muted-foreground">prob. to close</p>
        </div>
      </div>

      {/* Intent + Urgency badges */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Intent</span>
          <IntentBadge level={analysis.intent_level} />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Urgency</span>
          <IntentBadge level={analysis.urgency} />
        </div>
        <div className="flex-1 min-w-[120px]">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1">Confidence</p>
          <ConfidenceBar value={analysis.confidence} />
        </div>
      </div>

      {/* Business type + use case */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Business Type</p>
          <p className="text-sm font-medium">{analysis.business_type ?? '—'}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Use Case</p>
          <p className="text-sm">{analysis.use_case ?? '—'}</p>
        </div>
      </div>

      {/* Buying signals + Objections */}
      <div className="grid grid-cols-2 gap-4">
        {safeJsonArray(analysis.buying_signals).length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--status-success)] mb-2">Buying Signals</p>
            <ul className="space-y-1">
              {safeJsonArray(analysis.buying_signals).map((s: string, i: number) => (
                <li key={i} className="flex items-start gap-1.5 text-xs">
                  <CheckCircle className="h-3 w-3 flex-shrink-0 mt-0.5 text-[var(--status-success)]" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}
        {safeJsonArray(analysis.objections).length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--status-danger)] mb-2">Objections</p>
            <ul className="space-y-1">
              {safeJsonArray(analysis.objections).map((o: string, i: number) => (
                <li key={i} className="flex items-start gap-1.5 text-xs">
                  <AlertCircle className="h-3 w-3 flex-shrink-0 mt-0.5 text-[var(--status-danger)]" />
                  {o}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Recommended action */}
      {analysis.recommended_action && (
        <div className="rounded-lg border border-[var(--brand)]/20 bg-[color-mix(in_oklch,var(--brand)_10%,transparent)] p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--brand)] mb-1">Recommended Action</p>
          <p className="text-sm font-medium">{analysis.recommended_action}</p>
        </div>
      )}

      {/* Recommended approach */}
      {analysis.recommended_approach && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Recommended Approach</p>
          <p className="text-sm text-muted-foreground">{analysis.recommended_approach}</p>
        </div>
      )}

      {/* Reasoning */}
      {safeJsonArray(analysis.reasoning).length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Reasoning</p>
          <ol className="space-y-1 list-none">
            {safeJsonArray(analysis.reasoning).map((r: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="flex-shrink-0 w-4 h-4 rounded-full bg-muted/50 flex items-center justify-center text-[9px] font-bold">{i + 1}</span>
                {r}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Token usage footer */}
      {(analysis.prompt_tokens || analysis.cost_usd) && (
        <div className="flex items-center gap-4 text-[10px] text-muted-foreground border-t border-border/50 pt-3">
          {analysis.prompt_tokens && <span>{formatNumber(analysis.prompt_tokens + (analysis.completion_tokens ?? 0), { decimals: 0 })} tokens</span>}
          {analysis.cost_usd && <span>{formatCurrency(analysis.cost_usd, { decimals: 4 })}</span>}
        </div>
      )}
    </div>
  );
}

/* ── Contact form modal ────────────────────────────────────────────── */

type ContactFormData = { name: string; title: string; email: string; phone: string; linkedin_url?: string };
const EMPTY_FORM: ContactFormData = { name: '', title: '', email: '', phone: '', linkedin_url: '' };
const EMPTY_BANTC = { budget: '', authority: '', needs: '', timeline: '', competitor: '' };

function toDateTimeLocalValue(value?: string | null) {
  if (!value) return '';

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    return value;
  }

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(value)) {
    return value.slice(0, 16).replace(' ', 'T');
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  const tzOffsetMs = parsed.getTimezoneOffset() * 60_000;
  return new Date(parsed.getTime() - tzOffsetMs).toISOString().slice(0, 16);
}

function toApiDateTime(value?: string | null) {
  if (!value) return '';

  const trimmed = value.trim();

  const localMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:,\s*|\s+)(\d{1,2}):(\d{2})$/);
  if (localMatch) {
    const [, day, month, year, hour, minute] = localMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')} ${hour.padStart(2, '0')}:${minute}`;
  }

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})/);
  if (isoMatch) {
    const [, year, month, day, hour, minute] = isoMatch;
    return `${year}-${month}-${day} ${hour}:${minute}`;
  }

  const normalized = toDateTimeLocalValue(trimmed);
  return normalized ? normalized.replace('T', ' ') : '';
}

function firstErrorMessage(payload: any, fallback: string) {
  if (typeof payload?.message === 'string') return payload.message;
  if (typeof payload?.error === 'string') return payload.error;

  const firstError = payload?.errors && Object.values(payload.errors)[0];
  if (Array.isArray(firstError) && typeof firstError[0] === 'string') {
    return firstError[0];
  }

  return fallback;
}

function ContactFormModal({
  title,
  initial,
  saving,
  onClose,
  onSave,
}: {
  title: string;
  initial: ContactFormData;
  saving: boolean;
  onClose: () => void;
  onSave: (data: ContactFormData) => void;
}) {
  const [form, setForm] = useState<ContactFormData>(initial);
  const set = (k: keyof ContactFormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Name *</label>
            <input value={form.name} onChange={set('name')} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Job Title / Role</label>
            <input value={form.title} onChange={set('title')} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Email</label>
            <input type="email" value={form.email} onChange={set('email')} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Phone</label>
            <input type="tel" value={form.phone} onChange={set('phone')} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">LinkedIn URL / Username</label>
            <input value={form.linkedin_url || ''} onChange={set('linkedin_url')} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="e.g. https://www.linkedin.com/in/username or username" />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground">
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={saving || !form.name}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--brand)] px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
          >
            {saving && <Loader2 className="h-3 w-3 animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function AddContactModal({
  mode,
  setMode,
  candidates,
  feedback,
  searching,
  adding,
  saving,
  onSearch,
  onAddCandidate,
  onClose,
  onSaveManual,
}: {
  mode: 'manual' | 'google' | 'linkedin';
  setMode: (mode: 'manual' | 'google' | 'linkedin') => void;
  candidates: GoogleContactCandidate[];
  feedback: { type: 'success' | 'error'; msg: string } | null;
  searching: boolean;
  adding: boolean;
  saving: boolean;
  onSearch: () => void;
  onAddCandidate: (candidateId: number) => void;
  onClose: () => void;
  onSaveManual: (data: ContactFormData) => void;
}) {
  const [form, setForm] = useState<ContactFormData>(EMPTY_FORM);
  const set = (k: keyof ContactFormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Modal
      open
      onOpenChange={(open) => { if (!open) onClose(); }}
      title="Add Contact"
      description="Choose manual entry, Google Search, or LinkedIn Search to find PIC candidates."
      size="lg"
      footer={
        mode === 'manual' ? (
          <>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => onSaveManual(form)} disabled={saving || !form.name.trim()}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save Contact
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={onClose}>Close</Button>
            <Button onClick={onSearch} disabled={searching}>
              {searching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
              {mode === 'google' ? 'Search by Google' : 'LinkedIn Search'}
            </Button>
          </>
        )
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Add Method</label>
          <Select value={mode} onChange={(e) => setMode(e.target.value as 'manual' | 'google' | 'linkedin')}>
            <option value="manual">Manual Add</option>
            <option value="google">Search by Google</option>
            <option value="linkedin">LinkedIn Search</option>
          </Select>
        </div>

        {mode === 'manual' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Name *</label>
              <Input value={form.name} onChange={set('name')} />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Job Title / Role</label>
              <Input value={form.title} onChange={set('title')} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Email</label>
              <Input type="email" value={form.email} onChange={set('email')} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Phone</label>
              <Input type="tel" value={form.phone} onChange={set('phone')} />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">LinkedIn URL / Username</label>
              <Input value={form.linkedin_url || ''} onChange={set('linkedin_url')} placeholder="e.g. https://www.linkedin.com/in/username or username" />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-xl border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
              {mode === 'google' ? (
                <>Google Search uses the keyword template in Settings &gt; AI Default &gt; Prompt Templates under <strong>Lead Contact Google Search Keyword</strong>.</>
              ) : (
                <>LinkedIn search discovers matching public profiles scoped under the LINKEDIN provider using Google search engine scoped to site:linkedin.com/in.</>
              )}
            </div>

            {feedback ? (
              <div className={cn(
                'rounded-xl border p-3 text-xs',
                feedback.type === 'success'
                  ? 'border-[var(--status-success)]/30 bg-[color-mix(in_oklch,var(--status-success)_10%,transparent)] text-[var(--status-success)]'
                  : 'border-[var(--status-danger)]/30 bg-[color-mix(in_oklch,var(--status-danger)_10%,transparent)] text-[var(--status-danger)]'
              )}>
                {feedback.msg}
              </div>
            ) : null}

            {candidates.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">PIC Candidates</p>
                  <Badge variant="neutral">{candidates.length} found</Badge>
                </div>
                {candidates.map((candidate) => (
                  <div key={candidate.id} className="rounded-xl border border-border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-medium">{candidate.name || 'Unnamed contact'}</p>
                          <Badge variant={candidate.status === 'added' ? 'success' : 'info'}>
                            {candidate.status === 'added' ? 'Added' : `${candidate.confidence_score ?? 0}%`}
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">{candidate.title || 'Role unavailable'}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {candidate.company_name || 'Company unavailable'}
                          {candidate.linkedin_id ? ` · ${candidate.linkedin_id}` : ''}
                        </p>
                        {candidate.relevance_reason && (
                          <p className="mt-2 text-xs text-muted-foreground">{candidate.relevance_reason}</p>
                        )}
                      </div>
                      {candidate.linkedin_url ? (
                        <a
                          href={candidate.linkedin_url}
                          target="_blank"
                          rel="noreferrer"
                          className={cn(buttonVariants({ variant: 'outline', size: 'icon-sm' }))}
                          aria-label="Open LinkedIn profile"
                          title="Open LinkedIn profile"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : null}
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Button
                        size="sm"
                        disabled={candidate.status === 'added' || adding}
                        onClick={() => onAddCandidate(candidate.id)}
                      >
                        {adding && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        Add to Contact
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {mode === 'google'
                  ? 'Run Search by Google to find public LinkedIn profile results by company name and role keywords.'
                  : 'Run LinkedIn Search to discover PIC profiles using the LinkedIn integration.'}
              </p>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ── Main page ─────────────────────────────────────────────────────── */

export default function LeadDetailPage() {
  const params = useParams();
  const leadId = params.id as string;
  const qc = useQueryClient();
  const { formatNumber, formatCurrency, normalizeAmountInput, formatAmountInput } = useNumberFormat();
  const [activeTab, setActiveTab] = useState('overview');

  // Company info edit state (unified with Edit Lead form)
  const [showEditCompanyInfo, setShowEditCompanyInfo] = useState(false);
  const [companyForm, setCompanyForm] = useState({
    company_name: '',
    address: '',
    lat: '',
    lng: '',
    phone: '',
    email: '',
    website: '',
    industry_id: '',
    sub_industry_id: '',
    company_size_estimate: '',
    business_category: '',
    product_id: '',
    estimated_closing_amount: '',
    realized_closing_amount: '',
    source_type: '',
    channel_type_id: '',
    funnel_stage_id: '',
    qualification_status: 'pending',
    parent_lead_id: '',
    owner_id: '',
    presales_owner_id: '',
    am_owner_id: '',
    csm_owner_id: '',
  });
  const [detailLocationSearch, setDetailLocationSearch] = useState('');
  const [detailParentSearch, setDetailParentSearch] = useState('');
  const [detailParentResults, setDetailParentResults] = useState<{ id: number; company_name: string }[]>([]);
  const [detailParentSearching, setDetailParentSearching] = useState(false);

  // Contact UI state
  const [showAddContact, setShowAddContact]       = useState(false);
  const [addContactMode, setAddContactMode]       = useState<'manual' | 'google' | 'linkedin'>('manual');
  const [editingContact, setEditingContact]       = useState<any | null>(null);
  const [deletingContactId, setDeletingContactId] = useState<number | null>(null);
  const [showEnrichModal, setShowEnrichModal]     = useState(false);
  const [lushaContact, setLushaContact]           = useState<any | null>(null);
  const [confirmingLushaCandidate, setConfirmingLushaCandidate] = useState<LushaCandidate | null>(null);
  const [enrichmentFeedback, setEnrichmentFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Activity form state (controlled)
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [editingActivity, setEditingActivity]     = useState<any | null>(null);
  const [deletingActivityId, setDeletingActivityId] = useState<number | null>(null);
  const [activityForm, setActivityForm] = useState({
    activity_type: '',
    description: '',
    outcome: '',
    activity_date: '',
    next_follow_up_date: '',
    funnel_stage_id: '',
  });

  // Transcript state
  const [showTranscriptForm, setShowTranscriptForm] = useState(false);
  const [transcriptForm, setTranscriptForm] = useState({
    title: '',
    source_type: 'manual',
    activity_id: '',
    recorded_at: '',
    transcript_text: '',
    transcript_file: null as File | null,
    analyze_after_save: true,
  });
  const [evaluatingTranscriptId, setEvaluatingTranscriptId] = useState<number | null>(null);
  const [expandedEvalId, setExpandedEvalId]       = useState<number | null>(null);
  const [transcriptFeedback, setTranscriptFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Fetch lead details (includes contacts)
  const { data: lead, isLoading: leadLoading } = useQuery({
    queryKey: ['lead', leadId],
    queryFn: () => apiFetch(`/leads/${leadId}`).then((r) => r.json()),
  });

  // Google Maps setup
  const [mapsApiKey, setMapsApiKey] = useState('');
  const [mapsEnabled, setMapsEnabled] = useState(true);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [geocodeFeedback, setGeocodeFeedback] = useState('');

  // Fetch public settings for maps browser API key
  const { data: publicSettingsData } = useQuery({
    queryKey: ['public-settings'],
    queryFn: async () => {
      const response = await apiFetch('/settings/public');
      return response.json();
    },
  });

  useEffect(() => {
    if (!publicSettingsData?.data) return;
    const settings = publicSettingsData.data;
    setMapsApiKey(settings.GOOGLE_MAPS_BROWSER_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '');
    setMapsEnabled(settings.GOOGLE_MAPS_ENABLED === undefined || settings.GOOGLE_MAPS_ENABLED === true || settings.GOOGLE_MAPS_ENABLED === 'true');
  }, [publicSettingsData]);

  useEffect(() => {
    const data = lead?.data;
    if (!data) return;
    if (data.lat != null && data.lng != null && String(data.lat).trim() !== '' && String(data.lng).trim() !== '') {
      setMapCenter({ lat: Number(data.lat), lng: Number(data.lng) });
    } else if (data.address && data.address.trim() !== '') {
      setGeocodeFeedback('Geocoding address...');
      apiFetch(`/maps/geocode?query=${encodeURIComponent(data.address)}`)
        .then((res) => res.json())
        .then((json) => {
          if (json?.data?.lat && json?.data?.lng) {
            setMapCenter({ lat: Number(json.data.lat), lng: Number(json.data.lng) });
            setGeocodeFeedback('');
          } else {
            setGeocodeFeedback('Location coordinates not found.');
          }
        })
        .catch(() => {
          setGeocodeFeedback('Unable to load address location.');
        });
    } else {
      setMapCenter(null);
      setGeocodeFeedback('');
    }
  }, [lead?.data?.lat, lead?.data?.lng, lead?.data?.address]);

  // Fetch pre-meeting brief
  const { data: preMeetingBrief, refetch: refetchPreMeetingBrief } = useQuery({
    queryKey: ['preMeetingBrief', leadId],
    queryFn: () => apiFetch(`/leads/${leadId}/pre-meeting-brief`).then((r) => r.json()),
    enabled: activeTab === 'pre-meeting-brief',
  });

  const { data: customerJourney, refetch: refetchCustomerJourney } = useQuery({
    queryKey: ['customerJourney', leadId],
    queryFn: () => apiFetch(`/leads/${leadId}/customer-journey`).then((r) => r.json()),
    enabled: activeTab === 'customer journey',
  });

  // Fetch lead intelligence
  const { data: intelligence } = useQuery({
    queryKey: ['lead-intelligence', leadId],
    queryFn: () => apiFetch(`/leads/${leadId}/intelligence`).then((r) => r.json()),
    enabled: !!lead,
  });

  // Fetch lead progress
  const { data: progress } = useQuery({
    queryKey: ['lead-progress', leadId],
    queryFn: () => apiFetch(`/leads/${leadId}/progress`).then((r) => r.json()),
    enabled: !!lead,
  });

  // Fetch activities
  const { data: activities } = useQuery({
    queryKey: ['lead-activities', leadId],
    queryFn: () => apiFetch(`/leads/${leadId}/activities`).then((r) => r.json()),
    enabled: !!lead,
  });

  // Fetch meetings
  const { data: meetings } = useQuery({
    queryKey: ['lead-meetings', leadId],
    queryFn: () => apiFetch(`/leads/${leadId}/meetings`).then((r) => r.json()),
    enabled: !!lead,
  });

  // Fetch transcripts (lazy — only when tab is active)
  const { data: transcriptsData, refetch: refetchTranscripts } = useQuery({
    queryKey: ['lead-transcripts', leadId],
    queryFn: () => apiFetch(`/leads/${leadId}/transcripts`).then((r) => r.json()),
    enabled: activeTab === 'transcripts',
  });

  // Fetch evaluations alongside transcripts
  const { data: evaluationsData, refetch: refetchEvaluations } = useQuery({
    queryKey: ['lead-evaluations', leadId],
    queryFn: () => apiFetch(`/leads/${leadId}/evaluations`).then((r) => r.json()),
    enabled: activeTab === 'transcripts',
  });

  // Fetch funnel stages for the activity stage-move dropdown
  const { data: funnelStagesData } = useQuery({
    queryKey: ['funnel-stages'],
    queryFn: () => apiFetch('/funnel/stages').then((r) => r.json()),
  });

  // Fetch all industries (with sub-industries) for edit form
  const { data: industriesData } = useQuery({
    queryKey: ['industries'],
    queryFn: () => apiFetch('/industries').then((r) => r.json()),
  });
  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: () => apiFetch('/products').then((r) => r.json()),
  });
  const { data: leadSourcesData } = useQuery({
    queryKey: ['lead-source-types'],
    queryFn: () => apiFetch('/settings/lead-sources').then((r) => r.json()),
  });
  const allIndustries: any[] = industriesData?.data ?? [];
  const products: any[] = productsData?.data ?? [];
  const leadSources: any[] = leadSourcesData?.data ?? [];
  const activeLeadSources = leadSources.filter((s: any) => s.is_active);
  const activeLeadChannels = activeLeadSources.flatMap((s: any) =>
    (s.channels ?? []).filter((c: any) => c.is_active).map((c: any) => ({ ...c, source_slug: s.slug }))
  );
  const selectedLeadChannels = activeLeadChannels.filter((c: any) =>
    !companyForm.source_type || c.source_slug === companyForm.source_type
  );
  const selectedIndustrySubIndustries: any[] =
    allIndustries.find((i: any) => String(i.id) === String(companyForm.industry_id))?.sub_industries ?? [];

  // Fetch all users for lead ownership roles assignment
  const { data: assignableUsersData } = useQuery({
    queryKey: ['lead-assignable-users'],
    queryFn: () => apiFetch('/leads/assignable-users').then((r) => r.json()),
  });

  const usersList = assignableUsersData?.data || [];
  const salesUsers = usersList.filter((u: any) =>
    ["sales_exec", "sales_manager", "admin", "super_admin"].includes(u.role?.name)
  );
  const presalesUsers = usersList.filter((u: any) =>
    ["presales", "admin", "super_admin"].includes(u.role?.name)
  );
  const amUsers = usersList.filter((u: any) =>
    ["account_manager", "admin", "super_admin"].includes(u.role?.name)
  );
  const csmUsers = usersList.filter((u: any) =>
    ["csm", "admin", "super_admin"].includes(u.role?.name)
  );

  const invalidateLead = () => qc.invalidateQueries({ queryKey: ['lead', leadId] });

  // Update lead company info mutation
  const updateLeadMutation = useMutation({
    mutationFn: (data: Record<string, any>) =>
      apiFetch(`/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      invalidateLead();
      setShowEditCompanyInfo(false);
    },
  });

  function openEditCompanyInfo() {
    setCompanyForm({
      company_name:             leadData.company_name           ?? '',
      address:                  leadData.address                ?? '',
      lat:                      leadData.lat != null ? String(leadData.lat) : '',
      lng:                      leadData.lng != null ? String(leadData.lng) : '',
      phone:                    leadData.phone                  ?? '',
      email:                    leadData.email                  ?? '',
      website:                  leadData.website                ?? '',
      industry_id:              leadData.industry_id != null ? String(leadData.industry_id) : '',
      sub_industry_id:          leadData.sub_industry_id != null ? String(leadData.sub_industry_id) : '',
      company_size_estimate:    leadData.company_size_estimate  ?? '',
      business_category:        leadData.business_category      ?? '',
      product_id:               leadData.product_id != null ? String(leadData.product_id) : '',
      estimated_closing_amount: leadData.estimated_closing_amount != null ? String(leadData.estimated_closing_amount) : '',
      realized_closing_amount:  leadData.realized_closing_amount != null ? String(leadData.realized_closing_amount) : '',
      source_type:              leadData.sources?.[0]?.source_type ?? '',
      channel_type_id:          leadData.sources?.[0]?.channel_type_id != null ? String(leadData.sources[0].channel_type_id) : '',
      funnel_stage_id:          leadData.funnel_stage_id != null ? String(leadData.funnel_stage_id) : '',
      qualification_status:     leadData.qualification_status   ?? 'pending',
      parent_lead_id:           leadData.parent_lead_id != null ? String(leadData.parent_lead_id) : '',
      owner_id:                 leadData.owner_id != null ? String(leadData.owner_id) : '',
      presales_owner_id:        leadData.presales_owner_id != null ? String(leadData.presales_owner_id) : '',
      am_owner_id:              leadData.am_owner_id != null ? String(leadData.am_owner_id) : '',
      csm_owner_id:             leadData.csm_owner_id != null ? String(leadData.csm_owner_id) : '',
    });
    setDetailLocationSearch(leadData.address ?? '');
    setDetailParentSearch('');
    setDetailParentResults([]);
    setShowEditCompanyInfo(true);
  }

  function normalizeWebsiteInput(value: string) {
    const w = value.trim();
    if (!w) return '';
    return /^[a-z][a-z0-9+.-]*:\/\//i.test(w) ? w : `https://${w}`;
  }

  async function searchDetailParentLead(query: string) {
    if (!query.trim()) { setDetailParentResults([]); return; }
    setDetailParentSearching(true);
    try {
      const res = await apiFetch(`/leads?search=${encodeURIComponent(query)}&per_page=8`);
      const json = await res.json();
      setDetailParentResults((json?.data ?? []).map((l: any) => ({ id: l.id, company_name: l.company_name })));
    } catch { setDetailParentResults([]); }
    finally { setDetailParentSearching(false); }
  }

  function submitCompanyInfo() {
    const website = normalizeWebsiteInput(companyForm.website);
    const payload: Record<string, any> = {
      company_name:             companyForm.company_name           || undefined,
      address:                  companyForm.address                || null,
      lat:                      companyForm.lat ? Number(companyForm.lat) : null,
      lng:                      companyForm.lng ? Number(companyForm.lng) : null,
      phone:                    companyForm.phone                  || null,
      email:                    companyForm.email                  || null,
      website:                  website                            || null,
      industry_id:              companyForm.industry_id ? Number(companyForm.industry_id) : null,
      sub_industry_id:          companyForm.sub_industry_id ? Number(companyForm.sub_industry_id) : null,
      company_size_estimate:    companyForm.company_size_estimate  || null,
      business_category:        companyForm.business_category      || null,
      product_id:               companyForm.product_id ? Number(companyForm.product_id) : null,
      estimated_closing_amount: companyForm.estimated_closing_amount ? Number(companyForm.estimated_closing_amount) : null,
      realized_closing_amount:  companyForm.realized_closing_amount ? Number(companyForm.realized_closing_amount) : null,
      source_type:              companyForm.source_type             || null,
      channel_type_id:          companyForm.channel_type_id ? Number(companyForm.channel_type_id) : null,
      funnel_stage_id:          companyForm.funnel_stage_id ? Number(companyForm.funnel_stage_id) : null,
      qualification_status:     companyForm.qualification_status   || null,
      parent_lead_id:           companyForm.parent_lead_id ? Number(companyForm.parent_lead_id) : null,
      owner_id:                 companyForm.owner_id ? Number(companyForm.owner_id) : null,
      presales_owner_id:        companyForm.presales_owner_id ? Number(companyForm.presales_owner_id) : null,
      am_owner_id:              companyForm.am_owner_id ? Number(companyForm.am_owner_id) : null,
      csm_owner_id:             companyForm.csm_owner_id ? Number(companyForm.csm_owner_id) : null,
    };
    updateLeadMutation.mutate(payload);
  }

  /* ── Intelligence mutations ── */
  const scoreMutation = useMutation({
    mutationFn: () => apiFetch(`/leads/${leadId}/rescore`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lead-intelligence', leadId] });
      qc.invalidateQueries({ queryKey: ['lead', leadId] });
      qc.invalidateQueries({ queryKey: ['lead-progress', leadId] });
    },
  });

  const qualifyMutation = useMutation({
    mutationFn: () => apiFetch(`/leads/${leadId}/qualify`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lead-intelligence', leadId] });
      qc.invalidateQueries({ queryKey: ['lead', leadId] });
    },
  });


  /* ── Contact mutations ── */
  const addContactMutation = useMutation({
    mutationFn: (data: any) =>
      apiFetch(`/leads/${leadId}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => { invalidateLead(); setShowAddContact(false); },
  });

  const updateContactMutation = useMutation({
    mutationFn: ({ contactId, data }: { contactId: number; data: any }) =>
      apiFetch(`/leads/${leadId}/contacts/${contactId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => { invalidateLead(); setEditingContact(null); },
  });

  const deleteContactMutation = useMutation({
    mutationFn: (contactId: number) =>
      apiFetch(`/leads/${leadId}/contacts/${contactId}`, { method: 'DELETE' }),
    onSuccess: () => { invalidateLead(); setDeletingContactId(null); },
  });

  const setPrimaryMutation = useMutation({
    mutationFn: (contactId: number) =>
      apiFetch(`/leads/${leadId}/contacts/${contactId}/set-primary`, { method: 'POST' }),
    onSuccess: invalidateLead,
  });

  const { data: googleContactCandidatesData, refetch: refetchGoogleContactCandidates } = useQuery({
    queryKey: ['lead-google-contact-candidates', leadId],
    queryFn: () => apiFetch(`/leads/${leadId}/contact-enrichment/google-linkedin/candidates`).then((r) => r.json()),
    enabled: showAddContact && addContactMode === 'google',
  });

  const searchGoogleContactsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch(`/leads/${leadId}/contact-enrichment/google-linkedin/search`, { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || 'Failed to search Google contacts');
      return json;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['lead-google-contact-candidates', leadId] });
      setEnrichmentFeedback({ type: 'success', msg: data?.message || 'Google LinkedIn candidates loaded' });
    },
    onError: (error: any) => {
      setEnrichmentFeedback({ type: 'error', msg: error?.message || 'Failed to search Google contacts' });
    },
  });

  const addGoogleCandidateMutation = useMutation({
    mutationFn: async (candidateId: number) => {
      const res = await apiFetch(`/leads/${leadId}/contact-enrichment/google-linkedin/candidates/${candidateId}/add-contact`, { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || 'Failed to add Google candidate');
      return json;
    },
    onSuccess: (data) => {
      invalidateLead();
      refetchGoogleContactCandidates();
      setEnrichmentFeedback({ type: 'success', msg: data?.message || 'Candidate added to contacts' });
    },
    onError: (error: any) => {
      setEnrichmentFeedback({ type: 'error', msg: error?.message || 'Failed to add Google candidate' });
    },
  });

  const { data: linkedinContactCandidatesData, refetch: refetchLinkedinContactCandidates } = useQuery({
    queryKey: ['lead-linkedin-contact-candidates', leadId],
    queryFn: () => apiFetch(`/leads/${leadId}/contact-enrichment/linkedin/candidates`).then((r) => r.json()),
    enabled: showAddContact && addContactMode === 'linkedin',
  });

  const searchLinkedinContactsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch(`/leads/${leadId}/contact-enrichment/linkedin/search`, { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || 'Failed to search LinkedIn contacts');
      return json;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['lead-linkedin-contact-candidates', leadId] });
      setEnrichmentFeedback({ type: 'success', msg: data?.message || 'LinkedIn candidates loaded' });
    },
    onError: (error: any) => {
      setEnrichmentFeedback({ type: 'error', msg: error?.message || 'Failed to search LinkedIn contacts' });
    },
  });

  const addLinkedinCandidateMutation = useMutation({
    mutationFn: async (candidateId: number) => {
      const res = await apiFetch(`/leads/${leadId}/contact-enrichment/linkedin/candidates/${candidateId}/add-contact`, { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || 'Failed to add LinkedIn candidate');
      return json;
    },
    onSuccess: (data) => {
      invalidateLead();
      refetchLinkedinContactCandidates();
      setEnrichmentFeedback({ type: 'success', msg: data?.message || 'Candidate added to contacts' });
    },
    onError: (error: any) => {
      setEnrichmentFeedback({ type: 'error', msg: error?.message || 'Failed to add LinkedIn candidate' });
    },
  });

  const { data: lushaCandidatesData, refetch: refetchLushaCandidates } = useQuery({
    queryKey: ['lead-lusha-candidates', leadId],
    queryFn: () => apiFetch(`/leads/${leadId}/contact-enrichment/lusha/candidates`).then((r) => r.json()),
    enabled: showEnrichModal,
  });

  const searchLushaMutation = useMutation({
    mutationFn: async (contactId?: number) => {
      const res = await apiFetch(`/leads/${leadId}/contact-enrichment/lusha/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact_id: contactId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || 'Failed to search Lusha candidates');
      return json;
    },
    onSuccess: (data) => {
      qc.setQueryData(['lead-lusha-candidates', leadId], data);
      qc.invalidateQueries({ queryKey: ['lead-lusha-candidates', leadId] });
      const count = Array.isArray(data?.data) ? data.data.length : 0;
      const billing = data?.meta?.billing;
      setEnrichmentFeedback({
        type: count > 0 ? 'success' : 'error',
        msg: count > 0
          ? `${count} Lusha candidate${count === 1 ? '' : 's'} loaded. Choose one to reveal and save.`
          : `Lusha did not return a matching candidate for this contact.${billing?.resultsReturned === 0 ? ' Results returned: 0.' : ''}`,
      });
    },
    onError: (error: any) => {
      setEnrichmentFeedback({ type: 'error', msg: error?.message || 'Failed to search Lusha candidates' });
    },
  });

  const revealLushaPhoneMutation = useMutation({
    mutationFn: async (candidateId: number) => {
      const res = await apiFetch(`/leads/${leadId}/contact-enrichment/lusha/candidates/${candidateId}/reveal-phone`, { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || 'Failed to reveal Lusha phone');
      return json;
    },
    onSuccess: (data) => {
      invalidateLead();
      refetchLushaCandidates();
      setConfirmingLushaCandidate(null);
      setEnrichmentFeedback({ type: 'success', msg: data?.message || 'Lusha phone saved to contacts' });
    },
    onError: (error: any) => {
      setEnrichmentFeedback({ type: 'error', msg: error?.message || 'Failed to reveal Lusha phone' });
    },
  });

  /* ── Activity mutations (enhanced) ── */
  const activityCreateMutation = useMutation({
    mutationFn: (data: any) =>
      apiFetch(`/leads/${leadId}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lead-activities', leadId] });
      qc.invalidateQueries({ queryKey: ['lead-progress', leadId] });
      invalidateLead();
      setShowActivityModal(false);
      setActivityForm({ activity_type: '', description: '', outcome: '', activity_date: '', next_follow_up_date: '', funnel_stage_id: '' });
    },
  });

  const activityUpdateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiFetch(`/leads/${leadId}/activities/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lead-activities', leadId] });
      qc.invalidateQueries({ queryKey: ['lead-progress', leadId] });
      invalidateLead();
      setEditingActivity(null);
    },
  });

  const activityDeleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/leads/${leadId}/activities/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lead-activities', leadId] });
      qc.invalidateQueries({ queryKey: ['lead-progress', leadId] });
      setDeletingActivityId(null);
    },
  });

  /* ── Transcript mutations ── */
  const storeTranscriptMutation = useMutation({
    mutationFn: async (data: any) => {
      const r = await apiFetch(`/leads/${leadId}/transcripts`, {
        method: 'POST',
        ...(data.transcript_file ? {
          body: (() => {
            const formData = new FormData();
            formData.append('source_type', data.source_type);
            if (data.title) formData.append('title', data.title);
            if (data.activity_id) formData.append('activity_id', data.activity_id);
            const recordedAt = toApiDateTime(data.recorded_at);
            if (data.recorded_at && !recordedAt) {
              throw new Error('Recorded At harus memakai format DD/MM/YYYY, HH:mm. Contoh: 21/05/2026, 17:37');
            }
            if (recordedAt) formData.append('recorded_at', recordedAt);
            if (data.transcript_text) formData.append('transcript_text', data.transcript_text);
            formData.append('transcript_file', data.transcript_file);
            return formData;
          })(),
        } : {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...data,
            transcript_file: undefined,
            recorded_at: (() => {
              const recordedAt = toApiDateTime(data.recorded_at);
              if (data.recorded_at && !recordedAt) {
                throw new Error('Recorded At harus memakai format DD/MM/YYYY, HH:mm. Contoh: 21/05/2026, 17:37');
              }
              return recordedAt || undefined;
            })(),
          }),
        }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(firstErrorMessage(err, `Server error (${r.status})`));
      }
      return r.json();
    },
    onSuccess: (payload) => {
      refetchTranscripts();
      setShowTranscriptForm(false);
      setTranscriptForm({ title: '', source_type: 'manual', activity_id: '', recorded_at: '', transcript_text: '', transcript_file: null, analyze_after_save: true });
      setTranscriptFeedback({ type: 'success', msg: 'Transcript saved successfully.' });
      if (transcriptForm.analyze_after_save && payload?.data?.id && payload?.data?.transcript_text?.trim()) {
        setEvaluatingTranscriptId(payload.data.id);
        evaluateTranscriptMutation.mutate(payload.data.id);
      }
      setTimeout(() => setTranscriptFeedback(null), 4000);
    },
    onError: (err: any) => {
      setTranscriptFeedback({ type: 'error', msg: err.message || 'Failed to save transcript.' });
    },
  });

  const evaluateTranscriptMutation = useMutation({
    mutationFn: async (transcriptId: number) => {
      const r = await apiFetch(`/leads/${leadId}/transcripts/${transcriptId}/evaluate`, { method: 'POST' });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.message || `AI analysis failed (${r.status})`);
      }
      return r.json();
    },
    onSuccess: (_, transcriptId) => {
      refetchTranscripts();
      refetchEvaluations();
      setEvaluatingTranscriptId(null);
      setExpandedEvalId(transcriptId);
    },
    onError: (err: any) => {
      setEvaluatingTranscriptId(null);
      setTranscriptFeedback({ type: 'error', msg: err.message || 'Failed to analyze transcript.' });
    },
  });

  const deleteTranscriptMutation = useMutation({
    mutationFn: (transcriptId: number) =>
      apiFetch(`/leads/${leadId}/transcripts/${transcriptId}`, { method: 'DELETE' }),
    onSuccess: () => refetchTranscripts(),
  });

  /* ── Revenue Intelligence queries & mutations ── */
  const { data: revenueIntel, isLoading: revenueLoading, refetch: refetchRevenue } = useQuery({
    queryKey: ['revenue-intelligence', leadId],
    queryFn: () => apiFetch(`/leads/${leadId}/revenue-intelligence`).then((r) => r.json()),
    enabled: activeTab === 'revenue' || activeTab === 'intelligence',
  });

  const { data: verificationData, refetch: refetchVerification } = useQuery({
    queryKey: ['lead-verification', leadId],
    queryFn: () => apiFetch(`/leads/${leadId}/verification`).then((r) => r.json()),
    enabled: !!lead,
  });

  const requestVerificationMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/leads/${leadId}/verification/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          justification: 'Manual verification requested from lead detail.',
        }),
      }),
    onSuccess: () => {
      refetchVerification();
      qc.invalidateQueries({ queryKey: ['lead', leadId] });
      qc.invalidateQueries({ queryKey: ['lead-intelligence', leadId] });
    },
  });

  const generatePreMeetingBriefMutation = useMutation({
    mutationFn: () => apiFetch(`/leads/${leadId}/pre-meeting-brief`, { method: 'POST' }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['preMeetingBrief', leadId] });
    },
    onError: () => console.error('Failed to generate Pre-Meeting Brief'),
  });

  const generateCustomerStoryMutation = useMutation({
    mutationFn: () => apiFetch(`/leads/${leadId}/customer-journey/story`, { method: 'POST' }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customerJourney', leadId] });
    },
    onError: () => console.error('Failed to generate Customer Story'),
  });

  const icpMatchMutation = useMutation({
    mutationFn: () => apiFetch(`/leads/${leadId}/icp-match`, { method: 'POST' }).then(r => r.json()),
    onSuccess: () => {
      refetchRevenue();
      qc.invalidateQueries({ queryKey: ['lead-intelligence', leadId] });
    },
  });

  const predictMutation = useMutation({
    mutationFn: () => apiFetch(`/leads/${leadId}/predict-conversion`, { method: 'POST' }),
    onSuccess: () => refetchRevenue(),
  });

  const prescribeMutation = useMutation({
    mutationFn: () => apiFetch(`/leads/${leadId}/prescribe`, { method: 'POST' }),
    onSuccess: () => refetchRevenue(),
  });

  const outcomeMutation = useMutation({
    mutationFn: (data: { outcome: string; product_id?: number; sale_type?: string; deal_size?: number; loss_reason?: string; feedback_notes?: string }) =>
      apiFetch(`/leads/${leadId}/outcome`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => { refetchRevenue(); invalidateLead(); },
  });

  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [outcomeForm, setOutcomeForm] = useState({ outcome: 'won', product_id: '', sale_type: 'new_sales', deal_size: '', feedback_notes: '' });

  const analysisMutation = useMutation({
    mutationFn: () => apiFetch(`/leads/${leadId}/revenue-analysis`, { method: 'POST' }),
    onSuccess: () => refetchRevenue(),
  });

  const matchProductsMutation = useMutation({
    mutationFn: () => apiFetch(`/leads/${leadId}/match-products`, { method: 'POST' }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lead-intelligence', leadId] }),
  });

  /* ── Render ── */
  if (leadLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const leadData      = lead?.data || {};
  const contacts      = leadData.contacts || [];
  const leadOutcomes  = leadData.outcomes || [];
  const defaultOutcomeSaleType = leadOutcomes.some((outcome: any) => outcome.outcome === 'won') ? 'upsales' : 'new_sales';
  const latestScore   = intelligence?.latest_score;
  const latestQual    = intelligence?.latest_qualification;
  const topProducts   = intelligence?.recommended_products || [];
  const latestAnalysis = intelligence?.latest_analysis;
  const verification = verificationData?.data;
  const latestVerificationReview = verification?.latest_review;
  const entryWarnings = pipelineGateWarnings({
    score: latestScore?.score ?? leadData.lead_score,
    qualificationStatus: leadData.qualification_status,
    reviewBlocked: verification?.blocked_from_pipeline,
  });
  const scoreBreakdown = Array.isArray(latestScore?.score_breakdown) ? latestScore.score_breakdown : [];
  const icpMatch = revenueIntel?.data?.icp_match;
  const icpBreakdown = Array.isArray(icpMatch?.score_breakdown)
    ? icpMatch.score_breakdown
    : Array.isArray(icpMatch?.score_breakdown?.factors)
      ? icpMatch.score_breakdown.factors
      : [];
  const icpReasoning = icpMatch?.reasoning ?? icpMatch?.reason ?? icpMatch?.score_breakdown?.reasoning;
  const progressData      = progress || {};
  const activitiesList    = activities?.data || [];
  const meetingsList      = meetings?.data || [];
  const transcriptsList   = transcriptsData?.data || [];
  const evaluationsList   = evaluationsData?.data || [];
  const funnelStages      = funnelStagesData?.data || [];
  const meetingActivities = activitiesList.filter((activity: any) => activity.activity_type === 'Meeting');
  const latestMeetingBantc = meetingActivities.find((activity: any) =>
    activity.budget || activity.authority || activity.needs || activity.timeline || activity.competitor
  );

  const ACTIVITY_TYPES = [
    'Follow Up', 'Meeting', 'Demo', 'Proposal Sent', 'Negotiation',
    'WhatsApp', 'Call', 'Email', 'Internal Note', 'Site Visit',
    'Contract Discussion', 'Payment Discussion', 'Decision Maker Contact', 'Other',
  ];

  const TRANSCRIPT_SOURCES: Record<string, string> = {
    manual:   'Manual / Copy-Paste',
    meeting:  'Meeting Transcript',
    call:     'Call Recording',
    whatsapp: 'WhatsApp Conversation',
    audio:    'Audio File',
    video:    'Video File',
    file:     'Transcript File',
  };

  const leadInitialScore = Number(latestScore?.score ?? leadData.lead_score ?? 0);
  const lushaEligible = leadInitialScore >= 60;
  const lushaCandidates: LushaCandidate[] =
    (Array.isArray(lushaCandidatesData?.data) && lushaCandidatesData.data.length > 0)
      ? lushaCandidatesData.data
      : (searchLushaMutation.data?.data || []);
  const googleContactCandidates: GoogleContactCandidate[] = googleContactCandidatesData?.data || [];
  const linkedinContactCandidates: GoogleContactCandidate[] = linkedinContactCandidatesData?.data || [];
  const lushaContactOptions = contacts.filter((contact: any) =>
    Boolean(contact.linkedin_url || contact.email || String(contact.name ?? '').trim().split(/\s+/).length > 1)
  );

  function openActivityModal(existing?: any) {
    if (existing) {
      setActivityForm({
        activity_type: existing.activity_type ?? '',
        description: existing.description ?? '',
        outcome: existing.outcome ?? '',
        activity_date: existing.activity_date ? existing.activity_date.substring(0, 16) : '',
        next_follow_up_date: existing.next_follow_up_date ?? '',
        funnel_stage_id: '',
      });
      setEditingActivity(existing);
    } else {
      setActivityForm({ activity_type: '', description: '', outcome: '', activity_date: '', next_follow_up_date: '', funnel_stage_id: '' });
      setEditingActivity(null);
    }
    setShowActivityModal(true);
  }


  function applyMeetingBantcDefaults(activityType: string) {
    setActivityForm((f) => ({
      ...f,
      activity_type: activityType,
    }));
  }

  function submitActivity() {
    const payload = {
      activity_type: activityForm.activity_type,
      description: activityForm.description || undefined,
      outcome: activityForm.outcome || undefined,
      activity_date: activityForm.activity_date || undefined,
      next_follow_up_date: activityForm.next_follow_up_date || undefined,
      funnel_stage_id: activityForm.funnel_stage_id ? Number(activityForm.funnel_stage_id) : undefined,
    };
    if (editingActivity) {
      activityUpdateMutation.mutate({ id: editingActivity.id, data: payload });
    } else {
      activityCreateMutation.mutate(payload);
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/leads">
          <span className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }))}>
            <ArrowLeft className="h-4 w-4" />
          </span>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{leadData.company_name}</h1>
          <p className="text-sm text-muted-foreground">{leadData.address}</p>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">SCORE</span>
            <Zap className="h-4 w-4 text-yellow-500" />
          </div>
          <div className="text-2xl font-bold">{latestScore?.score ?? '—'}</div>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant={gradeVariant(latestScore?.grade)}>{latestScore?.grade ?? 'No grade'}</Badge>
            {latestScore?.calculated_at ? (
              <span className="text-xs text-muted-foreground">
                {new Date(latestScore.calculated_at).toLocaleDateString()}
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{leadData.ai_explanation || 'No scoring explanation yet.'}</p>
          <Button
            onClick={() => scoreMutation.mutate()}
            disabled={scoreMutation.isPending}
            variant="outline"
            size="xs"
            className="mt-3"
          >
            {scoreMutation.isPending ? 'Scoring...' : 'Rescore'}
          </Button>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">QUALIFICATION</span>
            <CheckCircle className="h-4 w-4 text-[var(--status-success)]" />
          </div>
          <div className="text-2xl font-bold capitalize">{latestQual?.qualified ?? '—'}</div>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="outline">{qualificationLabel(latestQual?.qualified)}</Badge>
            <span className="text-xs text-muted-foreground">{latestQual?.business_type || 'Unknown'}</span>
          </div>
          <Button
            onClick={() => qualifyMutation.mutate()}
            disabled={qualifyMutation.isPending}
            variant="outline"
            size="xs"
            className="mt-3"
          >
            {qualifyMutation.isPending ? 'Qualifying...' : 'Requalify'}
          </Button>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">ACTIVITIES</span>
            <MessageSquare className="h-4 w-4 text-[var(--status-info)]" />
          </div>
          <div className="text-2xl font-bold">{progressData.total_activities ?? 0}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            {progressData.days_since_last ? `${progressData.days_since_last}d ago` : 'Never'}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">NEXT FOLLOW-UP</span>
            <Calendar className={`h-4 w-4 ${progressData.next_follow_up ? 'text-orange-500' : 'text-muted-foreground'}`} />
          </div>
          <div className="text-sm font-bold">
            {progressData.next_follow_up?.due_date
              ? new Date(progressData.next_follow_up.due_date).toLocaleDateString()
              : 'Not set'}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{progressData.next_follow_up?.purpose || 'N/A'}</p>
        </div>
      </div>

      {verification?.requires_verification ? (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-[var(--brand)]" />
                <h2 className="font-semibold">Human Verification</h2>
                <Badge variant={verification.verified_for_pipeline ? 'success' : 'warning'}>
                  {verification.verified_for_pipeline ? 'Verified for pipeline' : 'Verification required'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {latestVerificationReview
                  ? `Latest review is ${latestVerificationReview.status.replace(/_/g, ' ')}.`
                  : 'No human review has been requested for this lead yet.'}
              </p>
              {latestVerificationReview?.decision_reason ? (
                <p className="text-sm text-muted-foreground">{latestVerificationReview.decision_reason}</p>
              ) : null}
              {latestVerificationReview?.reviewer?.name ? (
                <p className="text-xs text-muted-foreground">
                  Reviewer: {latestVerificationReview.reviewer.name}
                  {latestVerificationReview.reviewed_at ? ` on ${new Date(latestVerificationReview.reviewed_at).toLocaleString()}` : ''}
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Link href="/qualification/reviews" className={cn(buttonVariants({ variant: 'outline' }))}>
                Open Queue
              </Link>
              <Button
                variant="outline"
                onClick={() => requestVerificationMutation.mutate()}
                disabled={requestVerificationMutation.isPending}
              >
                {requestVerificationMutation.isPending ? 'Requesting...' : 'Request Review'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {entryWarnings.length > 0 ? (
        <div className="rounded-lg border border-[var(--warning)]/30 bg-[var(--warning-soft)]/70 p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-[var(--warning)]" />
            <h2 className="font-semibold">Pipeline Entry Warning</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Pipeline = filtered entry. This lead cannot move forward until the following gates are cleared:
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {entryWarnings.map((warning) => (
              <Badge key={warning} variant="warning">
                {warning}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-0 overflow-x-auto">
          {['Overview', 'Contacts', 'Intelligence', 'Revenue', 'Activities', 'Transcripts', 'Pre-Meeting Brief', 'Customer Journey'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab.toLowerCase())}
              className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.toLowerCase()
                  ? 'border-[var(--brand)] text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
              {tab === 'Contacts' && contacts.length > 0 && (
                <span className="ml-1.5 rounded-full bg-[color-mix(in_oklch,var(--brand)_20%,transparent)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--brand)]">
                  {contacts.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Row 1: Company Info + Key Contacts */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold">Company Information</h3>
                <Button variant="ghost" size="icon-sm" onClick={openEditCompanyInfo} title="Edit lead information">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="space-y-3 text-sm">
                <div><span className="text-muted-foreground">Industry:</span> {leadData.industry?.name || '—'}</div>
                {leadData.subIndustry?.name && (
                  <div><span className="text-muted-foreground">Sub-Industry:</span> {leadData.subIndustry.name}</div>
                )}
                {leadData.business_category && (
                  <div><span className="text-muted-foreground">Business Category:</span> {leadData.business_category}</div>
                )}
                <div><span className="text-muted-foreground">Company Size:</span> {leadData.company_size_estimate || '—'}</div>
                <div><span className="text-muted-foreground">Email:</span> {leadData.email || '—'}</div>
                <div><span className="text-muted-foreground">Phone:</span> {leadData.phone || '—'}</div>
                <div>
                  <span className="text-muted-foreground">Website:</span>{' '}
                  {leadData.website ? (
                    <a href={leadData.website} target="_blank" rel="noreferrer" className="text-[var(--brand)] hover:underline">
                      {leadData.website}
                    </a>
                  ) : '—'}
                </div>
                <div><span className="text-muted-foreground">Initial Product:</span> {leadData.product?.name || '—'}</div>
              </div>
            </div>

            {/* Mini contacts card in overview */}
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold">Key Contacts</h3>
                <button
                  onClick={() => setActiveTab('contacts')}
                  className="text-xs text-[var(--brand)] hover:underline"
                >
                  Manage all →
                </button>
              </div>
              {contacts.length > 0 ? (
                <div className="space-y-3">
                  {contacts.slice(0, 3).map((c: any) => (
                    <div key={c.id} className="flex items-start gap-3 rounded-lg bg-muted/20 p-3 text-sm">
                      <User className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium">{c.name}</p>
                          {c.is_primary && <Star className="h-3 w-3 fill-[var(--status-warning)] text-[var(--status-warning)]" />}
                        </div>
                        {c.title && <p className="text-xs text-muted-foreground">{c.title}</p>}
                        {c.email && <p className="truncate text-xs text-muted-foreground">{c.email}</p>}
                      </div>
                    </div>
                  ))}
                  {contacts.length > 3 && (
                    <p className="text-xs text-muted-foreground">+{contacts.length - 3} more</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No contacts recorded</p>
              )}
            </div>
          </div>

          {/* Row 2: Sales Info + Group Company */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Sales Information */}
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold">Sales Information</h3>
                <Button variant="ghost" size="icon-sm" onClick={openEditCompanyInfo} title="Edit lead information">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Lead Source:</span>{' '}
                  {leadData.sources?.[0]?.source_type ? (
                    <span className="font-medium capitalize">{leadData.sources[0].source_type.replace(/_/g, ' ')}</span>
                  ) : '—'}
                </div>
                {leadData.sources?.[0]?.channel_type?.name && (
                  <div><span className="text-muted-foreground">Channel:</span> {leadData.sources[0].channel_type.name}</div>
                )}
                <div>
                  <span className="text-muted-foreground">Funnel Stage:</span>{' '}
                  {leadData.funnelStage?.name || leadData.current_funnel_stage?.name || '—'}
                </div>
                <div>
                  <span className="text-muted-foreground">Qualification:</span>{' '}
                  <span className={`font-medium capitalize ${
                    leadData.qualification_status === 'eligible' ? 'text-[var(--status-success)]' :
                    leadData.qualification_status === 'potential' ? 'text-[var(--status-warning)]' :
                    leadData.qualification_status === 'not_eligible' ? 'text-[var(--status-danger)]' :
                    'text-muted-foreground'
                  }`}>
                    {leadData.qualification_status?.replace(/_/g, ' ') || 'pending'}
                  </span>
                </div>
                {leadData.estimated_closing_amount != null && (
                  <div>
                    <span className="text-muted-foreground">Est. Closing:</span>{' '}
                    <span className="font-medium">{formatCurrency(Number(leadData.estimated_closing_amount))}</span>
                  </div>
                )}
                {leadData.realized_closing_amount != null && Number(leadData.realized_closing_amount) > 0 && (
                  <div>
                    <span className="text-muted-foreground">Realized:</span>{' '}
                    <span className="font-medium text-[var(--status-success)]">{formatCurrency(Number(leadData.realized_closing_amount))}</span>
                  </div>
                )}
                <hr className="my-3 border-border" />
                <div>
                  <span className="text-muted-foreground">Sales Owner:</span>{' '}
                  <span className="font-medium">{leadData.owner?.name || '—'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Presales Owner:</span>{' '}
                  <span className="font-medium">{leadData.presalesOwner?.name || '—'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">AM Owner:</span>{' '}
                  <span className="font-medium">{leadData.amOwner?.name || '—'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">CSM Owner:</span>{' '}
                  <span className="font-medium">{leadData.csmOwner?.name || '—'}</span>
                </div>
              </div>
            </div>

            {/* Group Company */}
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold">Group Company</h3>
                <Button variant="ghost" size="icon-sm" onClick={openEditCompanyInfo} title="Edit lead information">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="space-y-4 text-sm">
                {/* Parent company */}
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Parent Company</p>
                  {leadData.parentLead ? (
                    <Link
                      href={`/leads/${leadData.parentLead.id}`}
                      className="flex items-center gap-2 rounded-lg border border-[var(--brand)]/30 bg-[color-mix(in_oklch,var(--brand)_6%,transparent)] px-3 py-2 transition-colors hover:bg-[color-mix(in_oklch,var(--brand)_10%,transparent)]"
                    >
                      <Building2 className="h-4 w-4 shrink-0 text-[var(--brand)]" />
                      <span className="font-medium text-[var(--brand)]">{leadData.parentLead.company_name}</span>
                      <ExternalLink className="ml-auto h-3 w-3 text-[var(--brand)]/60" />
                    </Link>
                  ) : (
                    <p className="text-muted-foreground">— Standalone company —</p>
                  )}
                </div>

                {/* Subsidiaries */}
                {leadData.subsidiaries && leadData.subsidiaries.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Subsidiaries ({leadData.subsidiaries.length})
                    </p>
                    <div className="space-y-1.5">
                      {leadData.subsidiaries.map((sub: any) => (
                        <Link
                          key={sub.id}
                          href={`/leads/${sub.id}`}
                          className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:border-[var(--brand)]/30 hover:bg-muted/30"
                        >
                          <CornerDownRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="flex-1 font-medium">{sub.company_name}</span>
                          {sub.qualification_status && (
                            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                              sub.qualification_status === 'eligible' ? 'bg-[color-mix(in_oklch,var(--status-success)_15%,transparent)] text-[var(--status-success)]' :
                              sub.qualification_status === 'potential' ? 'bg-[color-mix(in_oklch,var(--status-warning)_15%,transparent)] text-[var(--status-warning)]' :
                              'bg-muted text-muted-foreground'
                            }`}>
                              {sub.qualification_status.replace(/_/g, ' ')}
                            </span>
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {!leadData.parentLead && (!leadData.subsidiaries || leadData.subsidiaries.length === 0) && (
                  <p className="text-xs text-muted-foreground">
                    No group company relationship set. Use the edit button to link this lead to a parent company.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Row 3: Map Preview */}
          {(leadData.lat != null && leadData.lng != null) || leadData.address ? (
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold">Location</h3>
                <div className="flex items-center gap-2">
                  {leadData.address && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        leadData.lat && leadData.lng
                          ? `${leadData.lat},${leadData.lng}`
                          : leadData.address
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-xs text-[var(--brand)] hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Open in Google Maps
                    </a>
                  )}
                </div>
              </div>
              {leadData.address && (
                <p className="mb-3 flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand)]" />
                  {leadData.address}
                </p>
              )}
              {mapsEnabled && mapsApiKey ? (
                <div className="h-[320px] overflow-hidden rounded-xl border border-border bg-[color:var(--surface-subtle)] relative">
                  {mapCenter ? (
                    <APIProvider apiKey={mapsApiKey}>
                      <Map
                        mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "DEMO_MAP_ID"}
                        center={mapCenter}
                        defaultCenter={mapCenter}
                        defaultZoom={15}
                        gestureHandling="cooperative"
                        disableDefaultUI={true}
                      >
                        <AdvancedMarker position={mapCenter}>
                          <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-background bg-[color:var(--brand)] text-white shadow-lg">
                            <MapPin className="h-4 w-4" />
                          </div>
                        </AdvancedMarker>
                      </Map>
                    </APIProvider>
                  ) : (
                    <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
                      {geocodeFeedback || "Loading map..."}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex h-[320px] items-center justify-center rounded-xl border border-border bg-[color:var(--surface-subtle)] p-6 text-center text-sm text-muted-foreground">
                  Maps are unavailable. Configure the public Google Maps browser key to enable map preview.
                </div>
              )}
              {(leadData.lat != null || leadData.lng != null || mapCenter != null) && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Coordinates: {leadData.lat != null ? leadData.lat : mapCenter?.lat.toFixed(6)}, {leadData.lng != null ? leadData.lng : mapCenter?.lng.toFixed(6)}
                </p>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* ── CONTACTS TAB ── */}
      {activeTab === 'contacts' && (
        <div className="space-y-4">
          {/* Action bar */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => {
                setAddContactMode('manual');
                setEnrichmentFeedback(null);
                setShowAddContact(true);
              }}
              size="sm"
            >
              <Plus className="h-3.5 w-3.5" /> Add Contact
            </Button>
            <Button
              onClick={() => {
                setLushaContact(lushaContactOptions[0] ?? null);
                setEnrichmentFeedback(null);
                qc.setQueryData(['lead-lusha-candidates', leadId], { data: [] });
                searchLushaMutation.reset();
                setShowEnrichModal(true);
              }}
              disabled={!lushaEligible || lushaContactOptions.length === 0}
              variant="outline"
              size="sm"
              tooltip={
                !lushaEligible
                  ? 'Requires initial lead score of 60+'
                  : lushaContactOptions.length === 0
                    ? 'Add a contact with LinkedIn, email, or full name first'
                    : 'Search Lusha for hidden email and phone data'
              }
            >
              <Zap className="h-3.5 w-3.5" /> Lusha
            </Button>
          </div>

          {/* Contacts list */}
          {contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-16 text-center">
              <User className="mb-3 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">No contacts yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Add manually or use Search by Google from Add Contact to discover LinkedIn PIC candidates.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {contacts.map((contact: any) => (
                <div
                  key={contact.id}
                  className={`rounded-xl border bg-card p-4 shadow-sm transition-colors ${
                    contact.is_primary ? 'border-[var(--status-warning)]/40' : 'border-border'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklch,var(--brand)_15%,transparent)] text-[var(--brand)]">
                      <User className="h-5 w-5" />
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{contact.name}</p>
                        {contact.is_primary && (
                          <span className="flex items-center gap-0.5 rounded-full bg-[color-mix(in_oklch,var(--status-warning)_15%,transparent)] px-2 py-0.5 text-[10px] font-bold text-[var(--status-warning)]">
                            <Star className="h-2.5 w-2.5 fill-[var(--status-warning)]" /> Primary
                          </span>
                        )}
                        <SourceBadge source={contact.source} />
                      </div>
                      {contact.title && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{contact.title}</p>
                      )}

                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                        {contact.linkedin_url && (
                          <a
                            href={contact.linkedin_url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                          >
                            <ExternalLink className="h-3 w-3" /> LinkedIn
                          </a>
                        )}
                        {contact.email && (
                          <a
                            href={`mailto:${contact.email}`}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                          >
                            <Mail className="h-3 w-3" /> {contact.email}
                          </a>
                        )}
                        {contact.phone && (
                          <a
                            href={`tel:${contact.phone}`}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                          >
                            <Phone className="h-3 w-3" /> {contact.phone}
                          </a>
                        )}
                      </div>

                      <div className="mt-2">
                        <ConfidenceDot score={contact.confidence_score} />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 items-center gap-1">
                      {!contact.is_primary && (
                        <button
                          onClick={() => setPrimaryMutation.mutate(contact.id)}
                          disabled={setPrimaryMutation.isPending}
                          title="Set as primary"
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-[color-mix(in_oklch,var(--status-warning)_10%,transparent)] hover:text-[var(--status-warning)] disabled:opacity-50"
                        >
                          <Star className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => setEditingContact(contact)}
                        title="Edit contact"
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingContactId(contact.id)}
                        title="Delete contact"
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-[color-mix(in_oklch,var(--status-danger)_10%,transparent)] hover:text-[var(--status-danger)]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
          </div>
        </div>
      </div>

              ))}
            </div>
          )}
        </div>
      )}

      {/* ── INTELLIGENCE TAB ── */}
      {activeTab === 'intelligence' && (
        <div className="space-y-6">

          {/* ── Action bar ── */}
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Run Intelligence Functions</p>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => scoreMutation.mutate()}
                disabled={scoreMutation.isPending}
                variant="outline"
                size="sm"
              >
                {scoreMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5 text-yellow-500" />}
                {scoreMutation.isPending ? 'Scoring…' : 'Rescore Lead'}
              </Button>
              <Button
                onClick={() => qualifyMutation.mutate()}
                disabled={qualifyMutation.isPending}
                variant="outline"
                size="sm"
              >
                {qualifyMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5 text-[var(--status-success)]" />}
                {qualifyMutation.isPending ? 'Qualifying…' : 'Re-qualify'}
              </Button>
              <Button
                onClick={() => icpMatchMutation.mutate()}
                disabled={icpMatchMutation.isPending}
                variant="outline"
                size="sm"
              >
                {icpMatchMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Target className="h-3.5 w-3.5 text-[var(--brand)]" />}
                {icpMatchMutation.isPending ? 'Matching…' : 'Run ICP Match'}
              </Button>
              <Button
                onClick={() => analysisMutation.mutate()}
                disabled={analysisMutation.isPending}
                variant="outline"
                size="sm"
              >
                {analysisMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BrainCircuit className="h-3.5 w-3.5 text-[var(--status-warning)]" />}
                {analysisMutation.isPending ? 'Analysing…' : 'Run AI Analysis'}
              </Button>
              <Button
                onClick={() => matchProductsMutation.mutate()}
                disabled={matchProductsMutation.isPending}
                variant="outline"
                size="sm"
              >
                {matchProductsMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ClipboardList className="h-3.5 w-3.5 text-[var(--status-info)]" />}
                {matchProductsMutation.isPending ? 'Matching…' : 'Run Product Match'}
              </Button>
            </div>
            {scoreMutation.isSuccess && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--status-success)]">
                <CheckCircle className="h-3.5 w-3.5" /> Lead scored — results updated below.
              </p>
            )}
            {scoreMutation.isError && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--status-danger)]">
                <AlertCircle className="h-3.5 w-3.5" /> Scoring failed. Check AI settings.
              </p>
            )}
            {icpMatchMutation.isSuccess && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--status-success)]">
                <CheckCircle className="h-3.5 w-3.5" /> ICP Match complete — see results below.
              </p>
            )}
            {matchProductsMutation.isSuccess && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--status-success)]">
                <CheckCircle className="h-3.5 w-3.5" /> Product Match complete — results updated below.
              </p>
            )}
            {matchProductsMutation.isError && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--status-danger)]">
                <AlertCircle className="h-3.5 w-3.5" /> Product Match failed. Check AI settings and ensure products exist.
              </p>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              <strong>Rescore</strong> runs immediately. <strong>Re-qualify</strong> uses AI for business fit. <strong>ICP Match</strong> requires an active ICP Profile. <strong>AI Analysis</strong> generates a commercial readout. <strong>Product Match</strong> uses BANT + Competitor AI to rank all products against this lead.
            </p>
          </div>

          <LeadBantcQuestionGuide leadId={leadData.id} />

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold">Lead Score</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Deterministic scoring from industry fit, size, location, completeness, contactability, source quality, and activity.
                  </p>
                </div>
                <Badge variant={gradeVariant(latestScore?.grade)}>{latestScore?.grade ?? 'N/A'}</Badge>
              </div>
              <div className="flex items-end gap-3">
                <p className="text-4xl font-bold">{latestScore?.score ?? '—'}</p>
                <p className="pb-1 text-sm text-muted-foreground">out of 100</p>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {leadData.ai_explanation || 'No scoring explanation has been generated yet.'}
              </p>
              {latestScore?.calculated_at ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  Calculated {new Date(latestScore.calculated_at).toLocaleString()}
                </p>
              ) : null}
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold">ICP Match</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Fit against the current Ideal Customer Profile configuration.
                  </p>
                </div>
                <Badge variant={icpVariant(icpMatch?.match_status ?? icpMatch?.match_level)}>
                  {icpLabel(icpMatch?.match_status ?? icpMatch?.match_level)}
                </Badge>
              </div>
              {icpMatch ? (
                <div className="space-y-3">
                  <div className="flex items-end gap-3">
                    <p className="text-4xl font-bold">
                      {Math.round(icpMatch.icp_score ?? icpMatch.match_score ?? 0)}
                    </p>
                    <p className="pb-1 text-sm text-muted-foreground">ICP score</p>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted/50">
                    <div
                      className="h-full rounded-full bg-[var(--brand)] transition-all"
                      style={{ width: `${clampPercent(icpMatch.icp_score ?? icpMatch.match_score)}%` }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {icpReasoning || 'Run ICP Match to evaluate this lead against your configured ICP.'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Profile: {icpMatch.icp_profile || 'Lead ICP Config'}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No ICP match yet. Click <strong>Run ICP Match</strong> above to evaluate this lead.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold">Score Breakdown</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Every factor shows its raw score, configured weight, and weighted contribution.
                </p>
              </div>
              <Badge variant="outline">{scoreBreakdown.length} factors</Badge>
            </div>
            {scoreBreakdown.length > 0 ? (
              <div className="space-y-4">
                {scoreBreakdown.map((factor: any, idx: number) => (
                  <div key={factor.factor_key ?? factor.factor ?? idx} className="rounded-xl border border-border/70 bg-muted/10 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{factor.factor}</p>
                          <Badge variant="outline">{factor.value}</Badge>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{factor.reason}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold">{factor.raw_score ?? 0}/100</p>
                        <p className="text-xs text-muted-foreground">
                          +{formatNumber(factor.score_contribution, { decimals: 2 })} from {formatNumber(factor.weight, { decimals: 0 })}% weight
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted/60">
                      <div
                        className="h-full rounded-full bg-[var(--brand)] transition-all"
                        style={{ width: `${clampPercent(factor.raw_score)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No score breakdown yet. Rescore this lead to generate one.</p>
            )}
          </div>

          {latestAnalysis && (
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold">AI Insight</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    AI-generated commercial readout shown alongside the deterministic score.
                  </p>
                </div>
                {latestAnalysis.urgency_level ? (
                  <Badge variant="brand">{latestAnalysis.urgency_level}</Badge>
                ) : null}
              </div>
              <div className="space-y-3 text-sm">
                {latestAnalysis.company_summary && (
                  <div>
                    <span className="mb-1 block text-muted-foreground">AI Summary:</span>
                    <p>{latestAnalysis.company_summary}</p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Relevance:</span>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-2 w-24 rounded-full bg-muted">
                      <div className="h-full rounded-full bg-[var(--brand)]" style={{ width: `${clampPercent(latestAnalysis.relevance_score)}%` }} />
                    </div>
                    {latestAnalysis.relevance_score}%
                  </div>
                </div>
                {latestAnalysis.suggested_approach && (
                  <div>
                    <span className="mb-1 block text-muted-foreground">Recommendation:</span>
                    <p>{latestAnalysis.suggested_approach}</p>
                  </div>
                )}
                {latestAnalysis.potential_use_case && (
                  <div>
                    <span className="mb-1 block text-muted-foreground">Potential Use Case:</span>
                    <p>{latestAnalysis.potential_use_case}</p>
                  </div>
                )}
                {latestAnalysis.risk_insight && (
                  <div className="rounded-lg border border-[var(--warning)]/20 bg-[var(--warning-soft)]/60 p-3">
                    <span className="mb-1 block text-muted-foreground">Risk Insight:</span>
                    <p>{latestAnalysis.risk_insight}</p>
                  </div>
                )}
                {typeof latestAnalysis.confidence_score === 'number' && (
                  <div>
                    <span className="mb-1 block text-muted-foreground">Confidence:</span>
                    <p>{latestAnalysis.confidence_score}%</p>
                  </div>
                )}
                <div>
                  <span className="mb-2 block text-muted-foreground">Opportunity Summary:</span>
                  <p>{latestAnalysis.business_opportunity_summary}</p>
                </div>
                <div>
                  <span className="mb-1 block text-muted-foreground">Probable Needs:</span>
                  {Array.isArray(latestAnalysis.probable_needs) &&
                    latestAnalysis.probable_needs.map((need: string, idx: number) => (
                      <div key={idx} className="mr-2 mt-1 inline-block rounded bg-muted/20 px-2 py-1 text-xs">
                        {need}
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {!latestAnalysis && (
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="font-semibold">AI Insight</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                No AI insight has been generated yet. The lead can still be evaluated from the deterministic score and ICP match above.
              </p>
            </div>
          )}

          {/* ── Product Match Results ── */}
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold">Product Match</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  AI-powered BANT + Competitor analysis against all active products.
                </p>
              </div>
              <Button
                onClick={() => matchProductsMutation.mutate()}
                disabled={matchProductsMutation.isPending}
                variant="outline"
                size="sm"
              >
                {matchProductsMutation.isPending
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Matching…</>
                  : <><ClipboardList className="h-3.5 w-3.5" /> Run Product Match</>}
              </Button>
            </div>

            {topProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/10 py-10 text-center">
                <ClipboardList className="mb-2 h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No product matches yet.</p>
                <p className="mt-1 text-xs text-muted-foreground">Click <strong>Run Product Match</strong> above to analyse this lead against all active products.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {topProducts.map((match: any, idx: number) => {
                  const bant = match.bant_analysis || {};
                  const reasoning = safeJsonArray(match.reasoning);
                  const levelColor = match.match_level === 'strong'
                    ? 'text-[var(--status-success)] bg-[color-mix(in_oklch,var(--status-success)_10%,transparent)] border-[var(--status-success)]/30'
                    : match.match_level === 'moderate'
                      ? 'text-[var(--status-warning)] bg-[color-mix(in_oklch,var(--status-warning)_10%,transparent)] border-[var(--status-warning)]/30'
                      : 'text-muted-foreground bg-muted/30 border-border';

                  return (
                    <div key={match.id} className={`rounded-xl border p-4 ${idx === 0 ? 'border-[var(--brand)]/40 bg-[color-mix(in_oklch,var(--brand)_4%,transparent)]' : 'border-border bg-card'}`}>
                      {/* Header row */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          {idx === 0 && <span className="rounded-full bg-[var(--brand)] px-2 py-0.5 text-[10px] font-bold text-white">TOP</span>}
                          <p className="font-semibold">{match.product?.name ?? `Product ${match.product_id}`}</p>
                          {match.product?.category && <Badge variant="neutral">{match.product.category}</Badge>}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${levelColor}`}>
                            {match.match_level ?? 'N/A'}
                          </span>
                          <span className="text-xl font-bold tabular-nums">{match.match_score}%</span>
                        </div>
                      </div>

                      {/* Score bar */}
                      <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
                        <div
                          className={`h-full rounded-full transition-all ${match.match_level === 'strong' ? 'bg-[var(--status-success)]' : match.match_level === 'moderate' ? 'bg-[var(--status-warning)]' : 'bg-muted-foreground/40'}`}
                          style={{ width: `${match.match_score}%` }}
                        />
                      </div>

                      {/* BANT breakdown */}
                      {Object.keys(bant).length > 0 && (
                        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {[
                            { key: 'budget',    label: 'Budget' },
                            { key: 'authority', label: 'Authority' },
                            { key: 'need',      label: 'Need' },
                            { key: 'timeline',  label: 'Timeline' },
                            { key: 'competitor',label: 'Competitor' },
                          ].filter(f => bant[f.key]).map(({ key, label }) => (
                            <div key={key} className="rounded-lg bg-muted/20 p-2">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                              <p className="mt-0.5 text-xs">{bant[key]}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reasoning */}
                      {reasoning.length > 0 && (
                        <div className="mb-3">
                          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Reasoning</p>
                          <ul className="space-y-0.5">
                            {reasoning.map((r: string, i: number) => (
                              <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-[var(--brand)]" />{r}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Recommended approach */}
                      {match.recommended_approach && (
                        <div className="rounded-lg border border-[var(--brand)]/20 bg-[color-mix(in_oklch,var(--brand)_8%,transparent)] p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--brand)] mb-1">Recommended Approach</p>
                          <p className="text-xs">{match.recommended_approach}</p>
                        </div>
                      )}

                      {/* Footer: confidence + AI model */}
                      {(match.confidence_score != null || match.ai_model_used) && (
                        <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
                          {match.confidence_score != null && <span>Confidence: {match.confidence_score}%</span>}
                          {match.ai_model_used && <span>Model: {match.ai_model_used}</span>}
                          {match.last_matched_at && <span>{new Date(match.last_matched_at).toLocaleString()}</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── REVENUE INTELLIGENCE TAB ── */}
      {activeTab === 'revenue' && (
        <div className="space-y-4">
          {revenueLoading ? (
            <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => icpMatchMutation.mutate()}
                  disabled={icpMatchMutation.isPending}
                  className="flex items-center gap-1.5 rounded-lg border border-[var(--brand)]/40 bg-[color-mix(in_oklch,var(--brand)_10%,transparent)] px-3 py-1.5 text-xs font-medium text-[var(--brand)] hover:bg-[color-mix(in_oklch,var(--brand)_20%,transparent)] disabled:opacity-50"
                >
                  {icpMatchMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Target className="h-3 w-3" />}
                  Run ICP Match
                </button>
                <button
                  onClick={() => predictMutation.mutate()}
                  disabled={predictMutation.isPending}
                  className="flex items-center gap-1.5 rounded-lg border border-[var(--status-success)]/40 bg-[color-mix(in_oklch,var(--status-success)_10%,transparent)] px-3 py-1.5 text-xs font-medium text-[var(--status-success)] hover:bg-[color-mix(in_oklch,var(--status-success)_20%,transparent)] disabled:opacity-50"
                >
                  {predictMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <TrendingUp className="h-3 w-3" />}
                  Predict Conversion
                </button>
                <button
                  onClick={() => prescribeMutation.mutate()}
                  disabled={prescribeMutation.isPending}
                  className="flex items-center gap-1.5 rounded-lg border border-[var(--status-warning)]/40 bg-[color-mix(in_oklch,var(--status-warning)_10%,transparent)] px-3 py-1.5 text-xs font-medium text-[var(--status-warning)] hover:bg-[color-mix(in_oklch,var(--status-warning)_20%,transparent)] disabled:opacity-50"
                >
                  {prescribeMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <BrainCircuit className="h-3 w-3" />}
                  Get Prescription
                </button>
                <button
                  onClick={() => analysisMutation.mutate()}
                  disabled={analysisMutation.isPending}
                  className="flex items-center gap-1.5 rounded-lg border border-[var(--brand)]/40 bg-[color-mix(in_oklch,var(--brand)_10%,transparent)] px-3 py-1.5 text-xs font-medium text-[var(--brand)] hover:bg-[color-mix(in_oklch,var(--brand)_20%,transparent)] disabled:opacity-50"
                >
                  {analysisMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                  Run AI Analysis
                </button>
                <button
                  onClick={() => {
                    setOutcomeForm((current) => ({
                      ...current,
                      product_id: current.product_id || (leadData.product_id ? String(leadData.product_id) : ''),
                      sale_type: current.sale_type || defaultOutcomeSaleType,
                    }));
                    setShowOutcomeModal(true);
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50"
                >
                  <ThumbsUp className="h-3 w-3" />
                  Record Outcome
                </button>
              </div>

              {/* ── Revenue Intelligence Analyst AI Panel ── */}
              {revenueIntel?.data?.latest_analysis && (
                <RevenueAnalysisPanel analysis={revenueIntel.data.latest_analysis} />
              )}
              {analysisMutation.isPending && (
                <div className="flex items-center gap-3 rounded-xl border border-[var(--brand)]/30 bg-[color-mix(in_oklch,var(--brand)_10%,transparent)] p-4 text-sm text-[var(--brand)]">
                  <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                  Revenue Intelligence AI is analysing this lead — this may take 15–30 seconds…
                </div>
              )}

              <div className="grid gap-4 lg:grid-cols-2">
                {/* ICP Match */}
                <div className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="h-4 w-4 text-[var(--brand)]" />
                    <h3 className="font-semibold text-sm">ICP Match</h3>
                  </div>
                  {revenueIntel?.data?.icp_match ? (
                    <div>
                      {revenueIntel.data.icp_match.matched === false ? (
                        <p className="text-xs text-muted-foreground">
                          {revenueIntel.data.icp_match.reasoning || revenueIntel.data.icp_match.reason}
                        </p>
                      ) : (
                        <>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-2xl font-bold">
                              {formatNumber(revenueIntel.data.icp_match.icp_score ?? revenueIntel.data.icp_match.match_score, { decimals: 0 })}
                            </span>
                            <Badge variant={icpVariant(revenueIntel.data.icp_match.match_status ?? revenueIntel.data.icp_match.match_level)}>
                              {icpLabel(revenueIntel.data.icp_match.match_status ?? revenueIntel.data.icp_match.match_level)}
                            </Badge>
                          </div>
                          <div className="h-2 w-full rounded-full bg-muted/50 overflow-hidden mb-2">
                            <div
                              className="h-full rounded-full bg-[var(--brand)] transition-all"
                              style={{ width: `${clampPercent(revenueIntel.data.icp_match.icp_score ?? revenueIntel.data.icp_match.match_score)}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">Profile: {revenueIntel.data.icp_match.icp_profile}</p>
                          {icpReasoning ? (
                            <p className="mt-2 text-xs text-muted-foreground">{icpReasoning}</p>
                          ) : null}
                          {icpBreakdown.length > 0 ? (
                            <div className="mt-3 space-y-2">
                              {icpBreakdown.map((factor: any, index: number) => (
                                <div key={`${factor.factor}-${index}`} className="rounded-lg bg-muted/20 px-3 py-2 text-xs">
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="font-medium capitalize">{factor.factor?.replace(/_/g, ' ')}</span>
                                    <span>
                                      {formatNumber(factor.weighted_score, { decimals: 1 })} pts
                                    </span>
                                  </div>
                                  {factor.reason ? (
                                    <p className="mt-1 text-muted-foreground">{factor.reason}</p>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No ICP match yet. Click "Run ICP Match" to evaluate.</p>
                  )}
                </div>

                {/* Conversion Prediction */}
                <div className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="h-4 w-4 text-[var(--status-success)]" />
                    <h3 className="font-semibold text-sm">Conversion Prediction</h3>
                  </div>
                  {revenueIntel?.data?.latest_prediction ? (
                    <div>
                      <div className="flex items-end gap-2 mb-2">
                        <span className="text-3xl font-bold">{revenueIntel.data.latest_prediction.probability_to_close}%</span>
                        <span className="text-xs text-muted-foreground mb-1">probability to close</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted/50 overflow-hidden mb-3">
                        <div className="h-full rounded-full bg-[var(--status-success)] transition-all" style={{ width: `${Math.max(0, Math.min(100, revenueIntel.data.latest_prediction.probability_to_close ?? 0))}%` }} />
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-lg bg-muted/30 p-2">
                          <p className="text-xs text-muted-foreground">Effort</p>
                          <p className="text-xs font-semibold capitalize">{revenueIntel.data.latest_prediction.estimated_sales_effort?.replace('_', ' ')}</p>
                        </div>
                        <div className="rounded-lg bg-muted/30 p-2">
                          <p className="text-xs text-muted-foreground">Confidence</p>
                          <p className="text-xs font-semibold">{revenueIntel.data.latest_prediction.confidence_score}%</p>
                        </div>
                        <div className="rounded-lg bg-muted/30 p-2">
                          <p className="text-xs text-muted-foreground">Est. Deal</p>
                          <p className="text-xs font-semibold">
                            {revenueIntel.data.latest_prediction.expected_deal_size
                              ? formatCurrency(revenueIntel.data.latest_prediction.expected_deal_size)
                              : '—'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No prediction yet. Click "Predict Conversion" to generate.</p>
                  )}
                </div>

                {/* Prescriptive Recommendations */}
                <div className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <BrainCircuit className="h-4 w-4 text-[var(--status-warning)]" />
                    <h3 className="font-semibold text-sm">AI Prescription</h3>
                  </div>
                  {revenueIntel?.data?.latest_prescription ? (
                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Recommended Approach</p>
                        <p className="text-sm">{revenueIntel.data.latest_prescription.recommended_approach}</p>
                      </div>
                      <div className="rounded-lg bg-[color-mix(in_oklch,var(--status-warning)_10%,transparent)] border border-[var(--status-warning)]/20 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--status-warning)] mb-1">Next Best Action</p>
                        <p className="text-sm font-medium">{revenueIntel.data.latest_prescription.next_best_action}</p>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Follow-up timing</span>
                        <span className="font-medium">{revenueIntel.data.latest_prescription.follow_up_timing}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Priority</span>
                        <span className="font-bold text-[var(--brand)]">{revenueIntel.data.latest_prescription.priority_score}/10</span>
                      </div>
                      {revenueIntel.data.latest_prescription.recommended_owner && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Recommended Owner</span>
                          <span className="font-medium">{revenueIntel.data.latest_prescription.recommended_owner.name}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No prescription yet. Click "Get Prescription" to generate AI-guided recommendations.</p>
                  )}
                </div>

                {/* Revenue Check / Rules */}
                <div className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldCheck className="h-4 w-4 text-[var(--status-info)]" />
                    <h3 className="font-semibold text-sm">Revenue Gate Check</h3>
                  </div>
                  {revenueIntel?.data?.revenue_check ? (
                    <div className="space-y-3">
                      <div className={`rounded-lg border p-3 ${
                        revenueIntel.data.revenue_check.blocked
                          ? 'bg-[color-mix(in_oklch,var(--status-danger)_10%,transparent)] border-[var(--status-danger)]/30'
                          : 'bg-[color-mix(in_oklch,var(--status-success)_10%,transparent)] border-[var(--status-success)]/30'
                      }`}>
                        <p className={`text-sm font-semibold ${revenueIntel.data.revenue_check.blocked ? 'text-[var(--status-danger)]' : 'text-[var(--status-success)]'}`}>
                          {revenueIntel.data.revenue_check.summary}
                        </p>
                      </div>
                      {revenueIntel.data.revenue_check.rules_triggered.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Triggered Rules</p>
                          <div className="space-y-1.5">
                            {revenueIntel.data.revenue_check.rules_triggered.map((r: any, i: number) => (
                              <div key={i} className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-xs ${
                                r.severity === 'critical' ? 'bg-[color-mix(in_oklch,var(--status-danger)_10%,transparent)] text-[var(--status-danger)]'
                                : r.severity === 'warning' ? 'bg-[color-mix(in_oklch,var(--status-warning)_10%,transparent)] text-[var(--status-warning)]'
                                : 'bg-[color-mix(in_oklch,var(--status-info)_10%,transparent)] text-[var(--status-info)]'
                              }`}>
                                <span>{r.rule}</span>
                                <span className="font-semibold uppercase">{r.action}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {revenueIntel.data.revenue_check.flags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {revenueIntel.data.revenue_check.flags.map((f: string) => (
                            <span key={f} className="rounded-full bg-[color-mix(in_oklch,var(--status-warning)_15%,transparent)] px-2 py-0.5 text-[10px] font-semibold text-[var(--status-warning)]">{f}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Revenue rules evaluation will appear here.</p>
                  )}
                </div>

                {/* Latest Outcome */}
                {revenueIntel?.data?.latest_outcome && (
                  <div className="col-span-full rounded-xl border border-border bg-card p-5">
                    <div className="flex items-center gap-2 mb-3">
                      {revenueIntel.data.latest_outcome.outcome === 'won'
                        ? <ThumbsUp className="h-4 w-4 text-[var(--status-success)]" />
                        : <ThumbsDown className="h-4 w-4 text-[var(--status-danger)]" />}
                      <h3 className="font-semibold text-sm">Deal Outcome</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Result</p>
                        <p className="font-semibold capitalize">{revenueIntel.data.latest_outcome.outcome}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Product</p>
                        <p className="font-semibold">{revenueIntel.data.latest_outcome.product?.name ?? 'Unassigned'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Sales Type</p>
                        <p className="font-semibold capitalize">{(revenueIntel.data.latest_outcome.sale_type ?? 'new_sales').replace('_', ' ')}</p>
                      </div>
                      {revenueIntel.data.latest_outcome.deal_size && (
                        <div>
                          <p className="text-xs text-muted-foreground">Deal Size</p>
                          <p className="font-semibold">{formatCurrency(revenueIntel.data.latest_outcome.deal_size)}</p>
                        </div>
                      )}
                      {revenueIntel.data.latest_outcome.feedback_notes && (
                        <div className="col-span-2">
                          <p className="text-xs text-muted-foreground mb-1">Notes</p>
                          <p className="text-sm">{revenueIntel.data.latest_outcome.feedback_notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {leadOutcomes.length > 0 && (
                  <div className="col-span-full rounded-xl border border-border bg-card p-5">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-sm">Product Revenue History</h3>
                      <Badge variant="neutral">{leadOutcomes.length} outcome{leadOutcomes.length === 1 ? '' : 's'}</Badge>
                    </div>
                    <div className="divide-y divide-border">
                      {leadOutcomes.map((outcome: any) => (
                        <div key={outcome.id} className="grid gap-2 py-3 text-sm md:grid-cols-[1.5fr_1fr_1fr_1fr]">
                          <div>
                            <p className="font-medium">{outcome.product?.name ?? 'Unassigned product'}</p>
                            <p className="text-xs text-muted-foreground">{outcome.feedback_notes || 'No notes'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Outcome</p>
                            <p className="font-semibold capitalize">{outcome.outcome}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Type</p>
                            <p className="font-semibold capitalize">{(outcome.sale_type ?? 'new_sales').replace('_', ' ')}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Amount</p>
                            <p className="font-semibold">{formatCurrency(outcome.deal_size)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── ACTIVITIES TAB ── */}
      {activeTab === 'activities' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {activitiesList.length > 0 ? `${activitiesList.length} interaction${activitiesList.length !== 1 ? 's' : ''} recorded` : 'No interactions yet'}
            </p>
            <Button onClick={() => openActivityModal()} size="sm">
              <Plus className="h-3.5 w-3.5" /> Log Activity
            </Button>
          </div>

          {/* Timeline */}
          {activitiesList.length > 0 ? (
            <div className="relative space-y-0">
              <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border" />
              {activitiesList.map((activity: any) => (
                <div key={activity.id} className="relative flex gap-4 pb-6 last:pb-0">
                  <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card">
                    <Activity className="h-4 w-4 text-[var(--brand)]" />
                  </div>
                  <div className="flex-1 rounded-xl border border-border bg-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold">{activity.activity_type}</span>
                          {activity.user?.name && (
                            <span className="text-xs text-muted-foreground">by {activity.user.name}</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(activity.activity_date).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          onClick={() => openActivityModal(activity)}
                          className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => setDeletingActivityId(activity.id)}
                          className="rounded p-1 text-muted-foreground hover:bg-[color-mix(in_oklch,var(--status-danger)_10%,transparent)] hover:text-[var(--status-danger)]"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    {activity.description && (
                      <p className="mt-2 text-sm text-muted-foreground">{activity.description}</p>
                    )}
                    {activity.outcome && (
                      <div className="mt-2 rounded-lg bg-[color-mix(in_oklch,var(--status-success)_8%,transparent)] border border-[var(--status-success)]/20 px-3 py-2">
                        <p className="text-xs font-medium text-[var(--status-success)]">Outcome</p>
                        <p className="text-sm">{activity.outcome}</p>
                      </div>
                    )}
                    {activity.activity_type === 'Meeting' && (activity.budget || activity.authority || activity.needs || activity.timeline || activity.competitor) && (
                      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                        {[
                          ['Budget', activity.budget],
                          ['Authority', activity.authority],
                          ['Needs', activity.needs],
                          ['Timeline', activity.timeline],
                          ['Competitor', activity.competitor],
                        ].filter(([, value]) => Boolean(value)).map(([label, value]) => (
                          <div key={label} className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                            <p className="mt-1 line-clamp-3 text-xs text-foreground">{value}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {activity.next_follow_up_date && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        Next follow-up: {new Date(activity.next_follow_up_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-16 text-center">
              <Activity className="mb-3 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">No activities yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Log the first interaction to start the timeline.</p>
            </div>
          )}
        </div>
      )}

      {/* ── MEETINGS TAB (deprecated — use Activities) ── */}
      {activeTab === 'meetings' && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-[var(--status-warning)]/40 bg-[color-mix(in_oklch,var(--status-warning)_8%,transparent)] p-4">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--status-warning)]" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-[var(--status-warning)]">Meetings are now logged in Activities</p>
              <p className="text-xs text-muted-foreground">
                Log new meetings as a <strong>Meeting</strong> activity in the Activities tab. The meeting type, summary, outcome, and next follow-up can all be captured there. Existing meeting records remain visible below.
              </p>
              <button
                onClick={() => setActiveTab('activities')}
                className="mt-1 flex items-center gap-1 text-xs font-medium text-[var(--brand)] hover:underline"
              >
                Go to Activities <CornerDownRight className="h-3 w-3" />
              </button>
            </div>
          </div>

          {meetingsList.length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Existing meeting records</p>
              {meetingsList.map((meeting: any) => (
                <div key={meeting.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{meeting.meeting_type}</p>
                      <p className="text-xs text-muted-foreground">{new Date(meeting.meeting_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  {meeting.summary && <p className="mt-2 text-sm text-muted-foreground">{meeting.summary}</p>}
                  {meeting.key_points?.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Key Points</p>
                      <ul className="space-y-0.5">{meeting.key_points.map((k: string, i: number) => (
                        <li key={i} className="text-xs flex items-start gap-1"><CheckCircle className="h-3 w-3 mt-0.5 shrink-0 text-[var(--status-success)]" />{k}</li>
                      ))}</ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No legacy meeting records.</p>
          )}
        </div>
      )}

      {/* ── TRANSCRIPTS TAB ── */}
      {activeTab === 'transcripts' && (
        <div className="space-y-4">
          {/* Action bar */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {transcriptsList.length > 0
                ? `${transcriptsList.length} transcript${transcriptsList.length !== 1 ? 's' : ''}`
                : 'No transcripts yet'}
            </p>
            <Button size="sm" onClick={() => setShowTranscriptForm((v) => !v)}>
              <Plus className="h-3.5 w-3.5" />
              {showTranscriptForm ? 'Cancel' : 'Add Transcript'}
            </Button>
          </div>

          {/* Feedback banner */}
          {transcriptFeedback && (
            <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium ${
              transcriptFeedback.type === 'success'
                ? 'bg-[color-mix(in_oklch,var(--status-success)_10%,transparent)] text-[var(--status-success)]'
                : 'bg-[color-mix(in_oklch,var(--status-danger)_10%,transparent)] text-[var(--status-danger)]'
            }`}>
              {transcriptFeedback.type === 'success'
                ? <CheckCircle className="h-4 w-4 shrink-0" />
                : <AlertCircle className="h-4 w-4 shrink-0" />}
              {transcriptFeedback.msg}
            </div>
          )}

          {/* Add Transcript Form */}
          {showTranscriptForm && (
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <h4 className="font-semibold text-sm">New Transcript</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Title</label>
                  <Input
                    value={transcriptForm.title}
                    onChange={(e) => setTranscriptForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Discovery meeting transcript"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Related Activity</label>
                  <Select
                    value={transcriptForm.activity_id}
                    onChange={(e) => setTranscriptForm((f) => ({ ...f, activity_id: e.target.value }))}
                    placeholder="— Not linked —"
                  >
                    {activitiesList.map((activity: any) => (
                      <option key={activity.id} value={String(activity.id)}>
                        {activity.activity_type} · {new Date(activity.activity_date).toLocaleDateString()}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Source Type</label>
                  <Select
                    value={transcriptForm.source_type}
                    onChange={(e) => setTranscriptForm((f) => ({ ...f, source_type: e.target.value }))}
                  >
                    {Object.entries(TRANSCRIPT_SOURCES).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Recorded At</label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={transcriptForm.recorded_at}
                    onChange={(e) => setTranscriptForm((f) => ({ ...f, recorded_at: e.target.value }))}
                    placeholder="21/05/2026, 17:37"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Format: DD/MM/YYYY, HH:mm. Kosongkan untuk memakai waktu saat disimpan.
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Transcript File</label>
                  <Input
                    type="file"
                    accept=".txt,.vtt,.srt,audio/*,video/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      setTranscriptForm((f) => ({
                        ...f,
                        transcript_file: file,
                        source_type: file?.type.startsWith('audio/')
                          ? 'audio'
                          : file?.type.startsWith('video/')
                            ? 'video'
                            : file
                              ? 'file'
                              : f.source_type,
                      }));
                    }}
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    TXT/VTT/SRT akan dibaca sebagai teks. Audio/video disimpan sebagai referensi; paste transkrip atau catatan agar AI bisa menganalisis isi meeting.
                  </p>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Transcript Text / Notes</label>
                <textarea
                  value={transcriptForm.transcript_text}
                  onChange={(e) => setTranscriptForm((f) => ({ ...f, transcript_text: e.target.value }))}
                  rows={8}
                  placeholder="Paste your meeting notes, call transcript, or conversation here..."
                  className="min-h-[160px] w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground shadow-xs outline-none transition placeholder:text-muted-foreground focus-visible:border-[var(--brand)] focus-visible:ring-3 focus-visible:ring-[color:var(--brand)]/15"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={transcriptForm.analyze_after_save}
                  onChange={(e) => setTranscriptForm((f) => ({ ...f, analyze_after_save: e.target.checked }))}
                  className="h-4 w-4 rounded border-border"
                />
                Analyze with AI after saving when text is available
              </label>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowTranscriptForm(false)}>Cancel</Button>
                <Button
                  onClick={() => storeTranscriptMutation.mutate(transcriptForm)}
                  disabled={storeTranscriptMutation.isPending || (!transcriptForm.transcript_text.trim() && !transcriptForm.transcript_file)}
                >
                  {storeTranscriptMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Save Transcript
                </Button>
              </div>
            </div>
          )}

          {/* Transcript list */}
          {transcriptsList.length === 0 && !showTranscriptForm ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-16 text-center">
              <FileText className="mb-3 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">No transcripts yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Paste meeting notes or call transcripts and run AI analysis.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {transcriptsList.map((tr: any) => {
                const evaluation = evaluationsList.find(
                  (ev: any) => ev.source_id === tr.id && ev.source_type?.endsWith('LeadTranscript')
                );
                const isExpanded = expandedEvalId === tr.id;
                return (
                  <div key={tr.id} className="rounded-xl border border-border bg-card overflow-hidden">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 p-4">
                      <div className="space-y-1">
                        {tr.title && <p className="text-sm font-semibold">{tr.title}</p>}
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="neutral">{TRANSCRIPT_SOURCES[tr.source_type] ?? tr.source_type}</Badge>
                          <Badge variant={tr.evaluation_status === 'evaluated' ? 'success' : 'warning'}>
                            {tr.evaluation_status}
                          </Badge>
                          {tr.activity && (
                            <Badge variant="info" className="text-[10px]">
                              Linked: {tr.activity.activity_type}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tr.recorded_at ?? tr.created_at).toLocaleString()}
                          {tr.file_name ? ` · ${tr.file_name}` : ''}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {tr.evaluation_status !== 'evaluated' && (
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => { setEvaluatingTranscriptId(tr.id); evaluateTranscriptMutation.mutate(tr.id); }}
                            disabled={(evaluateTranscriptMutation.isPending && evaluatingTranscriptId === tr.id) || !tr.transcript_text?.trim()}
                            title={!tr.transcript_text?.trim() ? 'Add transcript text before AI analysis' : undefined}
                          >
                            {evaluateTranscriptMutation.isPending && evaluatingTranscriptId === tr.id
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : <Sparkles className="h-3 w-3" />}
                            Analyse with AI
                          </Button>
                        )}
                        {evaluation && (
                          <Button variant="ghost" size="xs" onClick={() => setExpandedEvalId(isExpanded ? null : tr.id)}>
                            {isExpanded ? 'Hide' : 'View'} Analysis
                          </Button>
                        )}
                        <button
                          onClick={() => deleteTranscriptMutation.mutate(tr.id)}
                          disabled={deleteTranscriptMutation.isPending}
                          className="rounded p-1 text-muted-foreground hover:bg-[color-mix(in_oklch,var(--status-danger)_10%,transparent)] hover:text-[var(--status-danger)]"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Transcript text preview */}
                    <div className="border-t border-border px-4 py-3 bg-muted/20">
                      {tr.transcript_text ? (
                        <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">{tr.transcript_text}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Media file saved. Add or paste transcript text before running AI analysis.
                        </p>
                      )}
                    </div>

                    {/* Evaluation result */}
                    {isExpanded && evaluation && (
                      <div className="border-t border-border bg-[color-mix(in_oklch,var(--brand)_4%,transparent)] p-4 space-y-4">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-[var(--brand)]" />
                          <h4 className="font-semibold text-sm">AI Transcript Analysis</h4>
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          {[
                            { label: 'Sentiment',     value: evaluation.sentiment },
                            { label: 'Intent Level',  value: evaluation.intent_level },
                            { label: 'Interest',      value: evaluation.interest_level },
                            { label: 'Confidence',    value: `${evaluation.confidence_score ?? 0}%` },
                          ].map(({ label, value }) => (
                            <div key={label} className="rounded-lg border border-border bg-card p-3 text-center">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                              <p className="mt-1 text-sm font-bold capitalize">{value ?? '—'}</p>
                            </div>
                          ))}
                        </div>

                        {evaluation.summary && (
                          <div className="rounded-lg border border-border bg-card p-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Meeting Summary</p>
                            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{evaluation.summary}</p>
                          </div>
                        )}

                        {evaluation.bantc_extracted && Object.values(evaluation.bantc_extracted).some(v => !!v) && (
                          <div className="rounded-lg border border-[var(--brand)]/20 bg-[color-mix(in_oklch,var(--brand)_5%,transparent)] p-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--brand)] mb-2">BANTC Extracted Insights</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {['budget', 'authority', 'needs', 'timeline', 'competitor'].map((key) => {
                                const val = (evaluation.bantc_extracted as any)[key];
                                if (!val) return null;
                                return (
                                  <div key={key} className={key === 'needs' ? 'sm:col-span-2' : ''}>
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{key}</p>
                                    <p className="text-sm font-medium text-foreground capitalize">{val}</p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {safeJsonArray(evaluation.buying_signals).length > 0 && (
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--status-success)] mb-2">Buying Signals</p>
                            <ul className="space-y-1">
                              {safeJsonArray(evaluation.buying_signals).map((s: string, i: number) => (
                                <li key={i} className="flex items-start gap-1.5 text-xs">
                                  <CheckCircle className="h-3 w-3 mt-0.5 shrink-0 text-[var(--status-success)]" />{s}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {safeJsonArray(evaluation.objections_detected).length > 0 && (
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--status-danger)] mb-2">Objections Detected</p>
                            <ul className="space-y-1">
                              {safeJsonArray(evaluation.objections_detected).map((o: string, i: number) => (
                                <li key={i} className="flex items-start gap-1.5 text-xs">
                                  <AlertCircle className="h-3 w-3 mt-0.5 shrink-0 text-[var(--status-danger)]" />{o}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {evaluation.next_best_action && (
                          <div className="rounded-lg border border-[var(--brand)]/20 bg-[color-mix(in_oklch,var(--brand)_10%,transparent)] p-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--brand)] mb-1">Recommended Next Action</p>
                            <p className="text-sm font-medium">{evaluation.next_best_action}</p>
                          </div>
                        )}

                        <p className="text-[10px] text-muted-foreground">
                          Analysed {new Date(evaluation.evaluated_at ?? evaluation.created_at).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── PRE-MEETING BRIEF TAB ── */}
      {activeTab === 'pre-meeting-brief' && (
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Pre-Meeting Brief</h2>
              <p className="text-sm text-muted-foreground">AI-generated structured sales preparation insights based on Lead context, activities, and product match.</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
              >
                Export PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setActivityForm({
                    activity_type: 'Meeting',
                    description: '',
                    outcome: '',
                    activity_date: new Date().toISOString().slice(0, 16),
                    next_follow_up_date: '',
                    funnel_stage_id: '',
                  });
                  setEditingActivity(null);
                  setShowActivityModal(true);
                }}
              >
                Create Meeting Task
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => generatePreMeetingBriefMutation.mutate()}
                disabled={generatePreMeetingBriefMutation.isPending}
              >
                {generatePreMeetingBriefMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" /> {preMeetingBrief?.data ? 'Regenerate Brief' : 'Generate Brief'}
                  </>
                )}
              </Button>
            </div>
          </div>

          {!preMeetingBrief?.data && !generatePreMeetingBriefMutation.isPending ? (
            <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
              <Sparkles className="mx-auto mb-3 h-8 w-8 opacity-50" />
              <h3 className="mb-1 text-sm font-semibold">No Brief Generated</h3>
              <p className="text-xs">Click Generate Brief to analyze lead data and prepare your strategy.</p>
            </div>
          ) : preMeetingBrief?.data ? (
            <div className="space-y-6 print:space-y-4">
              {/* HEADER / SUMMARY */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="col-span-2 rounded-xl border border-border bg-card p-5">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Executive Summary</h3>
                  <p className="text-sm">{preMeetingBrief.data.summary_json?.company_summary}</p>
                  <div className="mt-4 flex gap-4 text-xs">
                    <div><span className="text-muted-foreground font-medium">Stage:</span> {preMeetingBrief.data.summary_json?.stage}</div>
                    <div><span className="text-muted-foreground font-medium">Engagement Level:</span> {preMeetingBrief.data.summary_json?.engagement_level}</div>
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-card p-5 flex flex-col items-center justify-center text-center">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Readiness Score</h3>
                  <div className={`text-4xl font-black ${preMeetingBrief.data.readiness_score >= 80 ? 'text-[var(--status-success)]' : preMeetingBrief.data.readiness_score >= 50 ? 'text-[var(--warning)]' : 'text-[var(--status-danger)]'}`}>
                    {preMeetingBrief.data.readiness_score}
                  </div>
                  <p className="text-xs mt-1 text-muted-foreground">
                    {preMeetingBrief.data.readiness_score >= 80 ? 'READY' : preMeetingBrief.data.readiness_score >= 50 ? 'NEED CLARIFICATION' : 'NOT READY'}
                  </p>
                </div>
              </div>

              {/* STRATEGY & OBJECTIVES */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-[var(--brand)]/20 bg-[color-mix(in_oklch,var(--brand)_5%,transparent)] p-5">
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-[var(--brand)]">Objective Hypothesis</h3>
                  <ul className="space-y-2 text-sm">
                    <li><strong>Inferred Goals:</strong> {preMeetingBrief.data.objective_hypothesis_json?.inferred_goals}</li>
                    <li><strong>Expected Needs:</strong> {preMeetingBrief.data.objective_hypothesis_json?.expected_needs}</li>
                    <li><strong>Urgency Signals:</strong> {preMeetingBrief.data.objective_hypothesis_json?.urgency_signals}</li>
                  </ul>
                </div>
                <div className="rounded-xl border border-[var(--brand)]/20 bg-[color-mix(in_oklch,var(--brand)_5%,transparent)] p-5">
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-[var(--brand)]">Presales Strategy</h3>
                  <ul className="space-y-2 text-sm">
                    <li><strong>Opening Angle:</strong> {preMeetingBrief.data.strategy_json?.opening_angle}</li>
                    <li><strong>Positioning:</strong> {preMeetingBrief.data.strategy_json?.positioning}</li>
                    <li><strong>Messaging Direction:</strong> {preMeetingBrief.data.strategy_json?.messaging_direction}</li>
                    <li><strong>Assumptions to Avoid:</strong> {preMeetingBrief.data.strategy_json?.assumptions_to_avoid}</li>
                  </ul>
                </div>
              </div>

              {/* DISCOVERY QUESTIONS */}
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="mb-4 text-xs font-bold uppercase tracking-wide text-foreground">Discovery Questions</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {safeJsonArray(preMeetingBrief.data.questions_json).map((q: any, i: number) => (
                    <div key={i} className="rounded-lg bg-muted/30 p-3 text-sm">
                      <p className="font-medium">{q.question || q}</p>
                      <p className="mt-1 text-xs text-[var(--brand)]">{q.category || 'Discovery'}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* PRE-BANTC & RISKS */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-border bg-card p-5">
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-foreground">Pre-BANTC Estimation</h3>
                  <div className="space-y-3">
                    {['budget', 'authority', 'need', 'timeline', 'competitor'].map(key => (
                      <div key={key}>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{key}</p>
                        <p className="text-sm font-medium capitalize">{preMeetingBrief.data.bantc_pre_json?.[key] || '—'}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="rounded-xl border border-[var(--status-danger)]/20 bg-[color-mix(in_oklch,var(--status-danger)_5%,transparent)] p-5">
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-[var(--status-danger)]">Risk Analysis</h3>
                    <ul className="space-y-2 text-sm">
                      <li><strong>Deal Risk Score:</strong> {preMeetingBrief.data.risk_analysis_json?.deal_risk_score}</li>
                      <li><strong>Persona Risk:</strong> {preMeetingBrief.data.risk_analysis_json?.persona_risk}</li>
                      <li><strong>Competitor Lock-in:</strong> {preMeetingBrief.data.risk_analysis_json?.competitor_lock_in_risk}</li>
                    </ul>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-5">
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-foreground">Pain Points (Operational/Maturity)</h3>
                    <ul className="space-y-2 text-sm">
                      <li><strong>Operational Pain:</strong> {preMeetingBrief.data.pain_point_json?.operational_pain}</li>
                      <li><strong>Inefficiencies:</strong> {preMeetingBrief.data.pain_point_json?.inefficiencies}</li>
                      <li><strong>Maturity Level:</strong> {preMeetingBrief.data.pain_point_json?.maturity_level}</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* DEMO STRATEGY */}
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-foreground">Demo Strategy</h3>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="col-span-2 text-sm">
                    <p className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">Expected Flow</p>
                    <p>{preMeetingBrief.data.demo_strategy_json?.expected_demo_flow}</p>
                    <p className="mt-3 mb-1 text-[10px] font-semibold uppercase text-muted-foreground">Feature Mapping</p>
                    <p>{preMeetingBrief.data.demo_strategy_json?.feature_mapping}</p>
                  </div>
                  <div className="rounded-lg bg-[var(--warning-soft)]/50 p-3 border border-[var(--warning)]/20 text-sm">
                    <p className="mb-1 text-[10px] font-semibold uppercase text-[var(--warning)]">Mismatch Risks</p>
                    <p>{preMeetingBrief.data.demo_strategy_json?.mismatch_risks}</p>
                  </div>
                </div>
              </div>
              
            </div>
          ) : null}
        </div>
      )}

      {/* ── Add Contact Modal ── */}
      {showAddContact && (
        <AddContactModal
          mode={addContactMode}
          setMode={(mode) => {
            setAddContactMode(mode);
            setEnrichmentFeedback(null);
          }}
          candidates={addContactMode === 'google' ? googleContactCandidates : (addContactMode === 'linkedin' ? linkedinContactCandidates : [])}
          feedback={enrichmentFeedback}
          searching={addContactMode === 'google' ? searchGoogleContactsMutation.isPending : (addContactMode === 'linkedin' ? searchLinkedinContactsMutation.isPending : false)}
          adding={addContactMode === 'google' ? addGoogleCandidateMutation.isPending : (addContactMode === 'linkedin' ? addLinkedinCandidateMutation.isPending : false)}
          saving={addContactMutation.isPending}
          onSearch={() => {
            if (addContactMode === 'google') {
              searchGoogleContactsMutation.mutate();
            } else if (addContactMode === 'linkedin') {
              searchLinkedinContactsMutation.mutate();
            }
          }}
          onAddCandidate={(candidateId) => {
            if (addContactMode === 'google') {
              addGoogleCandidateMutation.mutate(candidateId);
            } else if (addContactMode === 'linkedin') {
              addLinkedinCandidateMutation.mutate(candidateId);
            }
          }}
          onClose={() => {
            setShowAddContact(false);
            setEnrichmentFeedback(null);
          }}
          onSaveManual={(data) => addContactMutation.mutate(data)}
        />
      )}

      {/* ── Edit Contact Modal ── */}
      {editingContact && (
        <ContactFormModal
          title="Edit Contact"
          initial={{
            name:  editingContact.name  ?? '',
            title: editingContact.title ?? '',
            email: editingContact.email ?? '',
            phone: editingContact.phone ?? '',
            linkedin_url: editingContact.linkedin_url ?? '',
          }}
          saving={updateContactMutation.isPending}
          onClose={() => setEditingContact(null)}
          onSave={(data) =>
            updateContactMutation.mutate({ contactId: editingContact.id, data })
          }
        />
      )}

      {/* ── Record Outcome Modal ── */}
      {showOutcomeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Record Deal Outcome</h2>
              <button onClick={() => setShowOutcomeModal(false)} className="rounded-lg p-1.5 hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Outcome</label>
                <select
                  value={outcomeForm.outcome}
                  onChange={(e) => setOutcomeForm({ ...outcomeForm, outcome: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="won">Won</option>
                  <option value="lost">Lost</option>
                  <option value="churned">Churned</option>
                  <option value="disqualified">Disqualified</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Product</label>
                <select
                  value={outcomeForm.product_id}
                  onChange={(e) => setOutcomeForm({ ...outcomeForm, product_id: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Unassigned product</option>
                  {products.map((product: any) => (
                    <option key={product.id} value={String(product.id)}>{product.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Sales Type</label>
                <select
                  value={outcomeForm.sale_type}
                  onChange={(e) => setOutcomeForm({ ...outcomeForm, sale_type: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="new_sales">New Sales</option>
                  <option value="upsales">Upsales</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Deal Size (optional)</label>
                <input
                  inputMode="decimal"
                  value={formatAmountInput(outcomeForm.deal_size)}
                  onChange={(e) => setOutcomeForm({ ...outcomeForm, deal_size: normalizeAmountInput(e.target.value) })}
                  placeholder="e.g. 50,000,000"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Notes</label>
                <textarea
                  value={outcomeForm.feedback_notes}
                  onChange={(e) => setOutcomeForm({ ...outcomeForm, feedback_notes: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  placeholder="What happened? What did you learn?"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowOutcomeModal(false)} className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground">Cancel</button>
              <button
                disabled={outcomeMutation.isPending}
                onClick={() => {
                  outcomeMutation.mutate({
                    outcome: outcomeForm.outcome as any,
                    product_id: outcomeForm.product_id ? Number(outcomeForm.product_id) : undefined,
                    sale_type: outcomeForm.sale_type,
                    deal_size: outcomeForm.deal_size ? parseFloat(outcomeForm.deal_size) : undefined,
                    feedback_notes: outcomeForm.feedback_notes || undefined,
                  });
                  setShowOutcomeModal(false);
                }}
                className="flex items-center gap-1.5 rounded-lg bg-[var(--brand)] px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
              >
                {outcomeMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                Save Outcome
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Lead Information Modal (Unified) ── */}
      <Modal
        open={showEditCompanyInfo}
        onOpenChange={setShowEditCompanyInfo}
        title="Edit Lead Information"
        description="Update all lead details — company info, sales data, and relationship."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowEditCompanyInfo(false)}>
              Cancel
            </Button>
            <Button
              onClick={submitCompanyInfo}
              disabled={updateLeadMutation.isPending || !companyForm.company_name.trim()}
            >
              {updateLeadMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save Changes
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          {/* ── Section: Company ── */}
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Company</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Company Name <span className="text-[var(--status-danger)]">*</span>
                </label>
                <Input
                  value={companyForm.company_name}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, company_name: e.target.value }))}
                  placeholder="e.g. PT. Asahimas Flat Glass"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Address</label>
                <textarea
                  value={companyForm.address}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, address: e.target.value, lat: f.lat, lng: f.lng }))}
                  placeholder="Full address"
                  rows={2}
                  className="min-h-[60px] w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground shadow-xs outline-none transition placeholder:text-muted-foreground focus-visible:border-[var(--brand)] focus-visible:ring-3 focus-visible:ring-[color:var(--brand)]/15"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Latitude</label>
                <Input
                  type="number"
                  value={companyForm.lat}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, lat: e.target.value }))}
                  placeholder="-6.2088"
                  step="any"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Longitude</label>
                <Input
                  type="number"
                  value={companyForm.lng}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, lng: e.target.value }))}
                  placeholder="106.8456"
                  step="any"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Industry</label>
                <Select
                  value={companyForm.industry_id}
                  onChange={(e) =>
                    setCompanyForm((f) => ({ ...f, industry_id: e.target.value, sub_industry_id: '' }))
                  }
                  placeholder="— Select industry —"
                >
                  {allIndustries.map((ind: any) => (
                    <option key={ind.id} value={String(ind.id)}>{ind.name}</option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Sub-Industry</label>
                <Select
                  value={companyForm.sub_industry_id}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, sub_industry_id: e.target.value }))}
                  placeholder="— Select sub-industry —"
                  disabled={!companyForm.industry_id || selectedIndustrySubIndustries.length === 0}
                >
                  {selectedIndustrySubIndustries.map((sub: any) => (
                    <option key={sub.id} value={String(sub.id)}>{sub.name}</option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Phone</label>
                <Input
                  type="tel"
                  value={companyForm.phone}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+62 31 7882383"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Email</label>
                <Input
                  type="email"
                  value={companyForm.email}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="info@company.com"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Website</label>
                <Input
                  type="url"
                  value={companyForm.website}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, website: e.target.value }))}
                  placeholder="https://www.company.com"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Company Size</label>
                <Select
                  value={companyForm.company_size_estimate}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, company_size_estimate: e.target.value }))}
                  placeholder="— Select size —"
                >
                  <option value="1-10">1–10 employees</option>
                  <option value="11-50">11–50 employees</option>
                  <option value="51-200">51–200 employees</option>
                  <option value="201-500">201–500 employees</option>
                  <option value="501-1000">501–1,000 employees</option>
                  <option value="1000+">1,000+ employees</option>
                </Select>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Business Category</label>
                <Input
                  value={companyForm.business_category}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, business_category: e.target.value }))}
                  placeholder="e.g. Manufacturing, Retail, Services"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Initial Product</label>
                <Select
                  value={companyForm.product_id}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, product_id: e.target.value }))}
                  placeholder="— Select product —"
                >
                  {products.map((product: any) => (
                    <option key={product.id} value={String(product.id)}>{product.name}</option>
                  ))}
                </Select>
                <p className="mt-1 text-xs text-muted-foreground">
                  Use this as the first product interest. Additional product purchases are tracked as outcomes in the Revenue tab.
                </p>
              </div>
            </div>
          </div>

          {/* ── Section: Sales ── */}
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sales</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Estimated Closing Amount</label>
                <Input
                  type="text"
                  value={companyForm.estimated_closing_amount}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, estimated_closing_amount: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Realized Closing Amount</label>
                <Input
                  type="text"
                  value={companyForm.realized_closing_amount}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, realized_closing_amount: e.target.value }))}
                  placeholder="0"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Lead Source</label>
                <Select
                  value={companyForm.source_type}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, source_type: e.target.value, channel_type_id: '' }))}
                  placeholder="— Select source —"
                >
                  {activeLeadSources.map((src: any) => (
                    <option key={src.slug} value={src.slug}>{src.name}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Channel Type</label>
                <Select
                  value={companyForm.channel_type_id}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, channel_type_id: e.target.value }))}
                  placeholder="— Select channel —"
                  disabled={!companyForm.source_type || selectedLeadChannels.length === 0}
                >
                  {selectedLeadChannels.map((ch: any) => (
                    <option key={ch.id} value={String(ch.id)}>{ch.name}</option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Funnel Stage</label>
                <Select
                  value={companyForm.funnel_stage_id}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, funnel_stage_id: e.target.value }))}
                  placeholder="— Unassigned —"
                >
                  {(funnelStagesData?.data ?? funnelStagesData ?? []).map((stage: any) => (
                    <option key={stage.id} value={String(stage.id)}>{stage.name}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Qualification</label>
                <Select
                  value={companyForm.qualification_status}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, qualification_status: e.target.value }))}
                >
                  <option value="pending">Pending</option>
                  <option value="eligible">Eligible</option>
                  <option value="potential">Potential</option>
                  <option value="not_eligible">Not Eligible</option>
                </Select>
              </div>
            </div>
          </div>

          {/* ── Section: Ownership Roles ── */}
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ownership Roles</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Sales Owner</label>
                <Select
                  value={companyForm.owner_id}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, owner_id: e.target.value }))}
                  placeholder="— Unassigned Sales —"
                >
                  {salesUsers.map((u: any) => (
                    <option key={u.id} value={String(u.id)}>{u.name}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Presales Owner</label>
                <Select
                  value={companyForm.presales_owner_id}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, presales_owner_id: e.target.value }))}
                  placeholder="— Unassigned Presales —"
                >
                  {presalesUsers.map((u: any) => (
                    <option key={u.id} value={String(u.id)}>{u.name}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Account Manager Owner</label>
                <Select
                  value={companyForm.am_owner_id}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, am_owner_id: e.target.value }))}
                  placeholder="— Unassigned AM —"
                >
                  {amUsers.map((u: any) => (
                    <option key={u.id} value={String(u.id)}>{u.name}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">CSM Owner</label>
                <Select
                  value={companyForm.csm_owner_id}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, csm_owner_id: e.target.value }))}
                  placeholder="— Unassigned CSM —"
                >
                  {csmUsers.map((u: any) => (
                    <option key={u.id} value={String(u.id)}>{u.name}</option>
                  ))}
                </Select>
              </div>
            </div>
          </div>

          {/* ── Section: Group Company ── */}
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Group Company</p>
            <div className="grid gap-2">
              <label className="text-xs font-medium text-muted-foreground">Subsidiary of (Parent Company)</label>
              {companyForm.parent_lead_id ? (
                <div className="flex items-center gap-2 rounded-lg border border-[var(--brand)]/30 bg-[color-mix(in_oklch,var(--brand)_8%,transparent)] px-3 py-2">
                  <Building2 className="h-4 w-4 shrink-0 text-[var(--brand)]" />
                  <span className="flex-1 text-sm font-medium">
                    {detailParentResults.find(r => String(r.id) === companyForm.parent_lead_id)?.company_name
                      ?? leadData?.parentLead?.company_name
                      ?? `Lead #${companyForm.parent_lead_id}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => { setCompanyForm(f => ({ ...f, parent_lead_id: '' })); setDetailParentSearch(''); setDetailParentResults([]); }}
                    className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Input
                    value={detailParentSearch}
                    onChange={(e) => { setDetailParentSearch(e.target.value); searchDetailParentLead(e.target.value); }}
                    placeholder="Search company name…"
                  />
                  {detailParentSearching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  {detailParentResults.length > 0 && (
                    <div className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-card shadow-lg">
                      {detailParentResults
                        .filter(r => String(r.id) !== leadId)
                        .map(r => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => { setCompanyForm(f => ({ ...f, parent_lead_id: String(r.id) })); setDetailParentSearch(''); setDetailParentResults([]); }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                          >
                            <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            {r.company_name}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              )}
              <p className="text-xs text-muted-foreground">Tandai lead ini sebagai anak perusahaan (subsidiary) dari perusahaan lain.</p>
            </div>
          </div>
        </div>
      </Modal>

      {/* ── Log / Edit Activity Modal ── */}
      <Modal
        open={showActivityModal}
        onOpenChange={(open) => { if (!open) { setShowActivityModal(false); setEditingActivity(null); } }}
        title={editingActivity ? 'Edit Activity' : 'Log Activity'}
        description="Record an interaction or update the lead stage."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => { setShowActivityModal(false); setEditingActivity(null); }}>
              Cancel
            </Button>
            <Button
              onClick={submitActivity}
              disabled={(activityCreateMutation.isPending || activityUpdateMutation.isPending) || !activityForm.activity_type}
            >
              {(activityCreateMutation.isPending || activityUpdateMutation.isPending) && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {editingActivity ? 'Save Changes' : 'Log Activity'}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Activity Type */}
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Activity Type <span className="text-[var(--status-danger)]">*</span>
            </label>
            <Select
              value={activityForm.activity_type}
              onChange={(e) => applyMeetingBantcDefaults(e.target.value)}
              placeholder="— Select activity type —"
            >
              {ACTIVITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </div>

          {/* Date & Time */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Date & Time</label>
            <Input
              type="datetime-local"
              value={activityForm.activity_date}
              onChange={(e) => setActivityForm((f) => ({ ...f, activity_date: e.target.value }))}
            />
          </div>

          {/* Move Lead Stage */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Move Lead to Stage</label>
            <Select
              value={activityForm.funnel_stage_id}
              onChange={(e) => setActivityForm((f) => ({ ...f, funnel_stage_id: e.target.value }))}
              placeholder="— No stage change —"
            >
              {funnelStages.map((s: any) => (
                <option key={s.id} value={String(s.id)}>{s.name}</option>
              ))}
            </Select>
          </div>

          {/* Notes */}
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Notes / Description</label>
            <textarea
              value={activityForm.description}
              onChange={(e) => setActivityForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              placeholder="What happened? Any context or details..."
              className="min-h-[80px] w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground shadow-xs outline-none transition placeholder:text-muted-foreground focus-visible:border-[var(--brand)] focus-visible:ring-3 focus-visible:ring-[color:var(--brand)]/15"
            />
          </div>

          {/* Outcome */}
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Outcome</label>
            <Input
              value={activityForm.outcome}
              onChange={(e) => setActivityForm((f) => ({ ...f, outcome: e.target.value }))}
              placeholder="e.g. Decision maker engaged, follow-up scheduled for next week"
            />
          </div>



          {/* Next Follow-up */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Next Follow-up Date</label>
            <Input
              type="date"
              value={activityForm.next_follow_up_date}
              onChange={(e) => setActivityForm((f) => ({ ...f, next_follow_up_date: e.target.value }))}
            />
          </div>
        </div>
      </Modal>

      {/* ── Delete Activity Confirmation ── */}
      {deletingActivityId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <h2 className="mb-2 text-lg font-semibold">Delete Activity?</h2>
            <p className="mb-5 text-sm text-muted-foreground">This activity will be permanently removed from the timeline.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeletingActivityId(null)} className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground">Cancel</button>
              <button
                onClick={() => activityDeleteMutation.mutate(deletingActivityId)}
                disabled={activityDeleteMutation.isPending}
                className="flex items-center gap-1.5 rounded-lg bg-[var(--status-danger)] px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
              >
                {activityDeleteMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Contact Enrichment Source Modal ── */}
      <Modal
        open={showEnrichModal}
        onOpenChange={(open) => {
          setShowEnrichModal(open);
          if (!open) {
            setEnrichmentFeedback(null);
            setLushaContact(null);
            setConfirmingLushaCandidate(null);
            searchLushaMutation.reset();
            qc.setQueryData(['lead-lusha-candidates', leadId], { data: [] });
          }
        }}
        title="Lusha Contact Enrichment"
        description="Pick a saved contact, preview Lusha matches, then confirm before spending reveal credits."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowEnrichModal(false)}>Cancel</Button>
            <Button
              onClick={() => searchLushaMutation.mutate(lushaContact?.id)}
              disabled={searchLushaMutation.isPending || !lushaEligible || !lushaContact}
            >
              {searchLushaMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Search Lusha
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Contact to enrich</label>
            <Select
              value={lushaContact?.id ? String(lushaContact.id) : ''}
              onChange={(event) => {
                const nextContact = lushaContactOptions.find((contact: any) => String(contact.id) === event.target.value) ?? null;
                setLushaContact(nextContact);
                setEnrichmentFeedback(null);
                searchLushaMutation.reset();
                qc.setQueryData(['lead-lusha-candidates', leadId], { data: [] });
              }}
              placeholder="Select contact"
              disabled={lushaContactOptions.length === 0}
            >
              {lushaContactOptions.map((contact: any) => (
                <option key={contact.id} value={String(contact.id)}>
                  {contact.name}{contact.title ? ` — ${contact.title}` : ''}
                </option>
              ))}
            </Select>
            {lushaContact ? (
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {lushaContact.linkedin_url || lushaContact.email || 'Using full name + company identity'}
              </p>
            ) : null}
          </div>
          <div className="rounded-xl border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
            <p>Lead score: <strong>{leadInitialScore}</strong>. Lusha is available when the initial score reaches 60.</p>
            <p className="mt-1">Search previews matching candidates and availability only. Phone/email values stay hidden until you confirm Reveal & Save.</p>
          </div>

          {enrichmentFeedback ? (
            <div className={`rounded-xl border p-3 text-xs ${
              enrichmentFeedback.type === 'success'
                ? 'border-[var(--status-success)]/30 bg-[color-mix(in_oklch,var(--status-success)_10%,transparent)] text-[var(--status-success)]'
                : 'border-[var(--status-danger)]/30 bg-[color-mix(in_oklch,var(--status-danger)_10%,transparent)] text-[var(--status-danger)]'
            }`}>
              {enrichmentFeedback.msg}
            </div>
          ) : null}

          {lushaCandidates.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">Lusha PIC Candidates</p>
                <Badge variant="neutral">{lushaCandidates.length} found</Badge>
              </div>
              {lushaCandidates.map((candidate) => (
                <div key={candidate.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{candidate.name || 'Unnamed contact'}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{candidate.title || 'Role unavailable'}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {candidate.company_name || leadData.company_name}
                        {candidate.company_domain ? ` · ${candidate.company_domain}` : ''}
                      </p>
                    </div>
                    <Badge variant={candidate.status === 'revealed' ? 'success' : 'warning'}>
                      {candidate.status === 'revealed' ? 'Saved' : 'Preview'}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={candidate.has_phone ? 'success' : 'neutral'}>
                        {candidate.has_phone ? `Phone ${candidate.reveal_phone_credits} credit` : 'No phone'}
                      </Badge>
                      <Badge variant={candidate.has_email ? 'neutral' : 'neutral'}>
                        {candidate.has_email ? 'Email available' : 'No email'}
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      disabled={
                        !candidate.has_phone ||
                        candidate.status === 'revealed' ||
                        revealLushaPhoneMutation.isPending
                      }
                      onClick={() => setConfirmingLushaCandidate(candidate)}
                    >
                      {revealLushaPhoneMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      Reveal & Save
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Preview does not include the phone number. Confirm Reveal & Save only if the name and role match the selected contact.
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground">
              {searchLushaMutation.isSuccess
                ? 'No matching Lusha candidate was returned for this contact. Try another LinkedIn contact or enrich after adding email/company domain data.'
                : 'Search Lusha after selecting a LinkedIn contact. Matching candidates will appear here with a Reveal & Save confirmation action.'}
              {searchLushaMutation.data?.meta?.search_identity ? (
                <div className="mt-3 space-y-1 border-t border-border pt-3">
                  <p className="font-medium text-foreground">Search identity sent to Lusha</p>
                  <p>LinkedIn: {searchLushaMutation.data.meta.search_identity.linkedin_url || 'not available'}</p>
                  <p>Email: {searchLushaMutation.data.meta.search_identity.email || 'not available'}</p>
                  <p>Name: {[searchLushaMutation.data.meta.search_identity.first_name, searchLushaMutation.data.meta.search_identity.last_name].filter(Boolean).join(' ') || 'not available'}</p>
                  <p>Company: {searchLushaMutation.data.meta.search_identity.company_name || 'not available'} · {searchLushaMutation.data.meta.search_identity.company_domain || 'domain not available'}</p>
                  {searchLushaMutation.data?.meta?.billing ? (
                    <p>Billing: {searchLushaMutation.data.meta.billing.resultsReturned ?? 0} result returned, {searchLushaMutation.data.meta.billing.creditsCharged ?? 0} credit charged</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={Boolean(confirmingLushaCandidate)}
        onOpenChange={(open) => {
          if (!open && !revealLushaPhoneMutation.isPending) {
            setConfirmingLushaCandidate(null);
          }
        }}
        title="Use Lusha Credit?"
        description="Confirm this match before revealing hidden contact data."
        size="sm"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setConfirmingLushaCandidate(null)}
              disabled={revealLushaPhoneMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => confirmingLushaCandidate && revealLushaPhoneMutation.mutate(confirmingLushaCandidate.id)}
              disabled={!confirmingLushaCandidate || revealLushaPhoneMutation.isPending}
            >
              {revealLushaPhoneMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Confirm Reveal & Save
            </Button>
          </>
        }
      >
        {confirmingLushaCandidate ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-border p-3">
              <p className="text-sm font-medium">{confirmingLushaCandidate.name || 'Unnamed contact'}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{confirmingLushaCandidate.title || 'Role unavailable'}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {confirmingLushaCandidate.company_name || leadData.company_name}
                {confirmingLushaCandidate.company_domain ? ` · ${confirmingLushaCandidate.company_domain}` : ''}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--status-warning)]/30 bg-[color-mix(in_oklch,var(--status-warning)_10%,transparent)] p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Credit confirmation</p>
              <p className="mt-1">
                Phone reveal may use {confirmingLushaCandidate.reveal_phone_credits ?? 0} Lusha credit. The phone number is not shown in preview and will be saved to this lead contact only after confirmation.
              </p>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* ── Delete Contact Confirmation ── */}
      {deletingContactId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <h2 className="mb-2 text-lg font-semibold">Delete Contact?</h2>
            <p className="mb-5 text-sm text-muted-foreground">
              This action cannot be undone. The contact and all raw source data will be removed.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeletingContactId(null)}
                className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteContactMutation.mutate(deletingContactId)}
                disabled={deleteContactMutation.isPending}
                className="flex items-center gap-1.5 rounded-lg bg-[var(--status-danger)] px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
              >
                {deleteContactMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── CUSTOMER JOURNEY TAB ── */}
      {activeTab === 'customer journey' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between no-print">
            <div>
              <h2 className="text-lg font-bold">End-to-End Customer Journey</h2>
              <p className="text-sm text-muted-foreground">Aggregated view of the entire relationship lifecycle.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> Export to PDF
            </Button>
          </div>

          {!customerJourney?.data ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              Loading journey data...
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-12 print:block print:space-y-8">
              
              {/* LEFT COLUMN: Timeline */}
              <div className="md:col-span-3 print:col-span-12">
                <div className="rounded-lg border border-border bg-card p-6">
                  <h3 className="mb-4 font-semibold">Journey Timeline</h3>
                  <div className="relative border-l border-border pl-4 space-y-6">
                    {safeJsonArray(customerJourney.data.timeline).length === 0 ? (
                      <p className="text-sm text-muted-foreground">No events recorded.</p>
                    ) : (
                      safeJsonArray(customerJourney.data.timeline).map((event: any, i: number) => (
                        <div key={i} className="relative">
                          <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-[var(--brand)] outline outline-2 outline-card"></div>
                          <div className="text-xs font-semibold text-[var(--brand)]">
                            {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                          <div className="mt-1 font-medium text-sm">{event.title}</div>
                          {event.description && <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{event.description}</p>}
                          {event.outcome && (
                            <div className="mt-1">
                              <Badge variant="outline" className="text-[10px]">{event.outcome}</Badge>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* CENTER COLUMN: Narrative & Intelligence */}
              <div className="md:col-span-6 space-y-6 print:col-span-12">
                
                {/* Final Story block */}
                <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
                  <div className="mb-4 flex items-center justify-between no-print">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-[var(--brand)]" />
                      Final Customer Story
                    </h3>
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={() => generateCustomerStoryMutation.mutate()}
                      disabled={generateCustomerStoryMutation.isPending}
                    >
                      {generateCustomerStoryMutation.isPending ? 'Generating...' : customerJourney.data.final_customer_story ? 'Regenerate Story' : 'Generate Story'}
                    </Button>
                  </div>
                  {/* Print Title */}
                  <h3 className="hidden font-semibold flex items-center gap-2 mb-4 print:flex">
                    Final Customer Story
                  </h3>

                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    {!customerJourney.data.final_customer_story && !generateCustomerStoryMutation.isPending ? (
                      <p className="text-muted-foreground italic text-center py-8">
                        No customer story generated yet. Click generate to analyze the timeline and build a narrative.
                      </p>
                    ) : generateCustomerStoryMutation.isPending ? (
                      <div className="animate-pulse space-y-3 py-4">
                        <div className="h-4 bg-muted rounded w-full"></div>
                        <div className="h-4 bg-muted rounded w-5/6"></div>
                        <div className="h-4 bg-muted rounded w-4/6"></div>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                        {customerJourney.data.final_customer_story}
                      </div>
                    )}
                  </div>
                </div>

                {/* Meeting Intelligence */}
                <div className="rounded-lg border border-border bg-card p-6">
                  <h3 className="mb-4 font-semibold">Meeting Intelligence</h3>
                  {safeJsonArray(customerJourney.data.meeting_intelligence).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No meetings evaluated.</p>
                  ) : (
                    <div className="space-y-4">
                      {safeJsonArray(customerJourney.data.meeting_intelligence).map((mtg: any, i: number) => (
                        <div key={i} className="border border-border/50 bg-muted/20 p-4 rounded-md">
                          <h4 className="font-medium text-sm mb-2">{mtg.title}</h4>
                          {safeJsonArray(mtg.evaluations).map((ev: any, j: number) => (
                            <div key={j} className="space-y-2 mt-2">
                              <p className="text-xs text-muted-foreground">{ev.summary}</p>
                              {ev.next_best_action && (
                                <div className="text-xs bg-background p-2 rounded border border-border/50">
                                  <strong>Next Action:</strong> {ev.next_best_action}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: Insights */}
              <div className="md:col-span-3 space-y-6 print:col-span-12">
                
                {/* Profile Snapshot */}
                <div className="rounded-lg border border-border bg-[var(--brand-soft)]/20 p-6">
                  <h3 className="mb-4 font-semibold">Customer Snapshot</h3>
                  <div className="space-y-3 text-sm">
                    <div><span className="text-muted-foreground">Company:</span> <strong className="block">{customerJourney.data.profile_snapshot?.company_name}</strong></div>
                    <div><span className="text-muted-foreground">Industry:</span> <strong className="block">{customerJourney.data.profile_snapshot?.industry || '—'}</strong></div>
                    <div><span className="text-muted-foreground">Size:</span> <strong className="block">{customerJourney.data.profile_snapshot?.size || '—'}</strong></div>
                    <div><span className="text-muted-foreground">Owner:</span> <strong className="block">{customerJourney.data.profile_snapshot?.owner || '—'}</strong></div>
                  </div>
                </div>

                {/* Pre Meeting Insights */}
                {customerJourney.data.pre_meeting_insights && (
                  <div className="rounded-lg border border-border bg-card p-6">
                    <h3 className="mb-4 font-semibold">Pre-Meeting Insights</h3>
                    <div className="space-y-3 text-sm">
                      {customerJourney.data.pre_meeting_insights.objective_hypothesis?.inferred_goals && (
                        <div><strong className="block">Inferred Goals:</strong> <span className="text-muted-foreground">{customerJourney.data.pre_meeting_insights.objective_hypothesis.inferred_goals}</span></div>
                      )}
                      {customerJourney.data.pre_meeting_insights.pain_points?.operational_pain && (
                        <div><strong className="block">Operational Pain:</strong> <span className="text-muted-foreground">{customerJourney.data.pre_meeting_insights.pain_points.operational_pain}</span></div>
                      )}
                    </div>
                  </div>
                )}

                {/* Product Fit */}
                <div className="rounded-lg border border-border bg-card p-6">
                  <h3 className="mb-4 font-semibold">Product Fit</h3>
                  {safeJsonArray(customerJourney.data.product_fit_analysis).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No product matches calculated.</p>
                  ) : (
                    <div className="space-y-4">
                      {safeJsonArray(customerJourney.data.product_fit_analysis).map((fit: any, i: number) => (
                        <div key={i}>
                          <div className="flex items-center justify-between mb-1">
                            <strong className="text-sm">{fit.product}</strong>
                            <Badge variant={fit.match_score > 70 ? 'success' : 'warning'}>{fit.match_score}%</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">ICP Match: {fit.icp_match ? 'Yes' : 'No'}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Post Meeting Status */}
                <div className="rounded-lg border border-border bg-card p-6">
                  <h3 className="mb-4 font-semibold">Post-Meeting Status</h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="text-muted-foreground block mb-1">Qualification Status:</span>
                      <Badge variant={customerJourney.data.post_meeting_analysis?.qualification_status === 'Eligible' ? 'success' : 'outline'}>
                        {customerJourney.data.post_meeting_analysis?.qualification_status || 'Unknown'}
                      </Badge>
                    </div>
                    {customerJourney.data.post_meeting_analysis?.risk_analysis && (
                      <div className="pt-2 border-t border-border/50">
                        <span className="text-muted-foreground block mb-1">Risk Summary:</span>
                        <div className="text-xs space-y-1">
                          <div><strong>Deal Risk:</strong> {customerJourney.data.post_meeting_analysis.risk_analysis.deal_risk_score}</div>
                          <div><strong>Persona Risk:</strong> {customerJourney.data.post_meeting_analysis.risk_analysis.persona_risk}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Revenue Journey */}
                <div className="rounded-lg border border-[var(--status-success)]/30 bg-[var(--status-success)]/5 p-6">
                  <h3 className="mb-4 font-semibold">Revenue Journey</h3>
                  <div className="space-y-3 text-sm">
                    <div><span className="text-muted-foreground">Expected Value:</span> <strong className="block text-lg">${Number(customerJourney.data.revenue_journey?.estimated_value || 0).toLocaleString()}</strong></div>
                    <div><span className="text-muted-foreground">Realized Value:</span> <strong className="block text-lg">${Number(customerJourney.data.revenue_journey?.realized_value || 0).toLocaleString()}</strong></div>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
