'use client';

import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiFetch';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  ArrowLeft, Plus, Zap, TrendingUp, MessageSquare, Calendar,
  AlertCircle, CheckCircle, Clock, User, FileText, Loader2,
  Phone, Mail, Star, StarOff, Pencil, Trash2, X, Shield, ChevronDown,
  Target, DollarSign, BrainCircuit, ShieldCheck, ThumbsUp, ThumbsDown,
  Building2, ClipboardList, Sparkles, CornerDownRight, ChevronRight,
  Activity, Info,
} from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import Link from 'next/link';
import { cn } from '@/lib/utils';

/* ── Source badge ──────────────────────────────────────────────────── */

const SOURCE_STYLES: Record<string, string> = {
  LUSHA:   'bg-[color-mix(in_oklch,var(--brand)_15%,transparent)] text-[var(--brand)] border-[var(--brand)]/30',
  manual:  'bg-[color-mix(in_oklch,var(--status-success)_15%,transparent)] text-[var(--status-success)] border-[var(--status-success)]/30',
  website: 'bg-[color-mix(in_oklch,var(--status-info)_15%,transparent)] text-[var(--status-info)] border-[var(--status-info)]/30',
  other:   'bg-muted text-muted-foreground border-border',
};

function SourceBadge({ source }: { source?: string | null }) {
  const label = source?.toUpperCase() ?? 'OTHER';
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
          <p className="text-2xl font-bold tabular-nums">{analysis.probability_to_close?.toFixed(0) ?? '—'}<span className="text-xs font-normal text-muted-foreground">%</span></p>
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
        {analysis.buying_signals?.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--status-success)] mb-2">Buying Signals</p>
            <ul className="space-y-1">
              {analysis.buying_signals.map((s: string, i: number) => (
                <li key={i} className="flex items-start gap-1.5 text-xs">
                  <CheckCircle className="h-3 w-3 flex-shrink-0 mt-0.5 text-[var(--status-success)]" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}
        {analysis.objections?.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--status-danger)] mb-2">Objections</p>
            <ul className="space-y-1">
              {analysis.objections.map((o: string, i: number) => (
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
      {analysis.reasoning?.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Reasoning</p>
          <ol className="space-y-1 list-none">
            {analysis.reasoning.map((r: string, i: number) => (
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
          {analysis.prompt_tokens && <span>{(analysis.prompt_tokens + (analysis.completion_tokens ?? 0)).toLocaleString()} tokens</span>}
          {analysis.cost_usd && <span>${analysis.cost_usd.toFixed(4)}</span>}
        </div>
      )}
    </div>
  );
}

/* ── Contact form modal ────────────────────────────────────────────── */

type ContactFormData = { name: string; title: string; email: string; phone: string };
const EMPTY_FORM: ContactFormData = { name: '', title: '', email: '', phone: '' };

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

/* ── Main page ─────────────────────────────────────────────────────── */

export default function LeadDetailPage() {
  const params = useParams();
  const leadId = params.id as string;
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');

  // Company info edit state
  const [showEditCompanyInfo, setShowEditCompanyInfo] = useState(false);
  const [companyForm, setCompanyForm] = useState({
    company_name: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    industry_id: '',
    sub_industry_id: '',
    company_size_estimate: '',
    business_category: '',
  });

  // Contact UI state
  const [showAddContact, setShowAddContact]       = useState(false);
  const [editingContact, setEditingContact]       = useState<any | null>(null);
  const [deletingContactId, setDeletingContactId] = useState<number | null>(null);
  const [showEnrichModal, setShowEnrichModal]     = useState(false);
  const [selectedEnrichSources, setSelectedEnrichSources] = useState<string[]>(['lusha']);

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
  const [transcriptForm, setTranscriptForm] = useState({ source_type: 'manual', transcript_text: '' });
  const [evaluatingTranscriptId, setEvaluatingTranscriptId] = useState<number | null>(null);
  const [expandedEvalId, setExpandedEvalId]       = useState<number | null>(null);
  const [transcriptFeedback, setTranscriptFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Fetch lead details (includes contacts)
  const { data: lead, isLoading: leadLoading } = useQuery({
    queryKey: ['lead', leadId],
    queryFn: () => apiFetch(`/leads/${leadId}`).then((r) => r.json()),
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
  const allIndustries: any[] = industriesData?.data ?? [];
  const selectedIndustrySubIndustries: any[] =
    allIndustries.find((i: any) => String(i.id) === String(companyForm.industry_id))?.sub_industries ?? [];

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
      company_name:          leadData.company_name         ?? '',
      address:               leadData.address              ?? '',
      phone:                 leadData.phone                ?? '',
      email:                 leadData.email                ?? '',
      website:               leadData.website              ?? '',
      industry_id:           leadData.industry_id != null ? String(leadData.industry_id) : '',
      sub_industry_id:       leadData.sub_industry_id != null ? String(leadData.sub_industry_id) : '',
      company_size_estimate: leadData.company_size_estimate ?? '',
      business_category:     leadData.business_category    ?? '',
    });
    setShowEditCompanyInfo(true);
  }

  function submitCompanyInfo() {
    const payload: Record<string, any> = {
      company_name:          companyForm.company_name      || undefined,
      address:               companyForm.address           || null,
      phone:                 companyForm.phone             || null,
      email:                 companyForm.email             || null,
      website:               companyForm.website           || null,
      industry_id:           companyForm.industry_id       ? Number(companyForm.industry_id)     : null,
      sub_industry_id:       companyForm.sub_industry_id   ? Number(companyForm.sub_industry_id) : null,
      company_size_estimate: companyForm.company_size_estimate || null,
      business_category:     companyForm.business_category || null,
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

  const enrichMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/leads/${leadId}/enrich-contacts`, { method: 'POST' }),
    onSuccess: () => { invalidateLead(); setShowEnrichModal(false); },
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
      setEditingActivity(null);
    },
  });

  const activityDeleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/leads/${leadId}/activities/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lead-activities', leadId] });
      setDeletingActivityId(null);
    },
  });

  /* ── Transcript mutations ── */
  const storeTranscriptMutation = useMutation({
    mutationFn: async (data: any) => {
      const r = await apiFetch(`/leads/${leadId}/transcripts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.message || `Server error (${r.status})`);
      }
      return r.json();
    },
    onSuccess: () => {
      refetchTranscripts();
      setShowTranscriptForm(false);
      setTranscriptForm({ source_type: 'manual', transcript_text: '' });
      setTranscriptFeedback({ type: 'success', msg: 'Transcript saved successfully.' });
      setTimeout(() => setTranscriptFeedback(null), 4000);
    },
    onError: (err: any) => {
      setTranscriptFeedback({ type: 'error', msg: err.message || 'Failed to save transcript.' });
    },
  });

  const evaluateTranscriptMutation = useMutation({
    mutationFn: (transcriptId: number) =>
      apiFetch(`/leads/${leadId}/transcripts/${transcriptId}/evaluate`, { method: 'POST' }),
    onSuccess: (_, transcriptId) => {
      refetchTranscripts();
      refetchEvaluations();
      setEvaluatingTranscriptId(null);
      setExpandedEvalId(transcriptId);
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
    mutationFn: (data: { outcome: string; deal_size?: number; loss_reason?: string; feedback_notes?: string }) =>
      apiFetch(`/leads/${leadId}/outcome`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => { refetchRevenue(); invalidateLead(); },
  });

  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [outcomeForm, setOutcomeForm] = useState({ outcome: 'won', deal_size: '', feedback_notes: '' });

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
  };

  const ENRICH_SOURCES = [
    { id: 'lusha',    label: 'Lusha',            available: true,  note: 'API-backed enrichment' },
    { id: 'linkedin', label: 'LinkedIn',          available: false, note: 'Requires LinkedIn API key' },
    { id: 'apollo',   label: 'Apollo.io',         available: false, note: 'Requires Apollo API key' },
    { id: 'hunter',   label: 'Hunter.io',         available: false, note: 'Requires Hunter API key' },
    { id: 'manual',   label: 'Manual Input',      available: true,  note: 'Add contacts manually' },
  ];

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
          {['Overview', 'Contacts', 'Intelligence', 'Revenue', 'Activities', 'Transcripts'].map((tab) => (
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
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">Company Information</h3>
              <Button variant="ghost" size="icon-sm" onClick={openEditCompanyInfo} title="Edit company information">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="space-y-3 text-sm">
              <div><span className="text-muted-foreground">Industry:</span> {leadData.industry?.name || '—'}</div>
              {leadData.subIndustry?.name && (
                <div><span className="text-muted-foreground">Sub-Industry:</span> {leadData.subIndustry.name}</div>
              )}
              <div><span className="text-muted-foreground">Email:</span> {leadData.email || '—'}</div>
              <div><span className="text-muted-foreground">Phone:</span> {leadData.phone || '—'}</div>
              <div>
                <span className="text-muted-foreground">Website:</span>{' '}
                {leadData.website ? (
                  <a href={leadData.website} target="_blank" className="text-[var(--brand)] hover:underline">
                    {leadData.website}
                  </a>
                ) : '—'}
              </div>
              <div><span className="text-muted-foreground">Company Size:</span> {leadData.company_size_estimate || '—'}</div>
              {leadData.business_category && (
                <div><span className="text-muted-foreground">Business Category:</span> {leadData.business_category}</div>
              )}
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
      )}

      {/* ── CONTACTS TAB ── */}
      {activeTab === 'contacts' && (
        <div className="space-y-4">
          {/* Action bar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowAddContact(true)}
              className="flex items-center gap-1.5 rounded-lg bg-[var(--brand)] px-3 py-2 text-xs font-medium text-white hover:bg-[var(--brand-hover)]"
            >
              <Plus className="h-3.5 w-3.5" /> Add Contact
            </button>
            <button
              onClick={() => setShowEnrichModal(true)}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--brand)]/40 bg-[color-mix(in_oklch,var(--brand)_10%,transparent)] px-3 py-2 text-xs font-medium text-[var(--brand)] hover:bg-[color-mix(in_oklch,var(--brand)_20%,transparent)]"
            >
              <Zap className="h-3.5 w-3.5" />
              Enrich Contacts
            </button>
          </div>

          {/* Contacts list */}
          {contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-16 text-center">
              <User className="mb-3 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">No contacts yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Add manually or trigger Lusha enrichment to discover contacts.
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
                          +{Number(factor.score_contribution ?? 0).toFixed(2)} from {factor.weight}% weight
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
                  const reasoning = Array.isArray(match.reasoning) ? match.reasoning : [];
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
                  onClick={() => setShowOutcomeModal(true)}
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
                              {(revenueIntel.data.icp_match.icp_score ?? revenueIntel.data.icp_match.match_score ?? 0).toFixed(0)}
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
                                      {Number(factor.weighted_score ?? 0).toFixed(1)} pts
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
                              ? `$${revenueIntel.data.latest_prediction.expected_deal_size.toLocaleString()}`
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
                      {revenueIntel.data.latest_outcome.deal_size && (
                        <div>
                          <p className="text-xs text-muted-foreground">Deal Size</p>
                          <p className="font-semibold">${revenueIntel.data.latest_outcome.deal_size.toLocaleString()}</p>
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
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Transcript Text *</label>
                <textarea
                  value={transcriptForm.transcript_text}
                  onChange={(e) => setTranscriptForm((f) => ({ ...f, transcript_text: e.target.value }))}
                  rows={8}
                  placeholder="Paste your meeting notes, call transcript, or conversation here..."
                  className="min-h-[160px] w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground shadow-xs outline-none transition placeholder:text-muted-foreground focus-visible:border-[var(--brand)] focus-visible:ring-3 focus-visible:ring-[color:var(--brand)]/15"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowTranscriptForm(false)}>Cancel</Button>
                <Button
                  onClick={() => storeTranscriptMutation.mutate(transcriptForm)}
                  disabled={storeTranscriptMutation.isPending || !transcriptForm.transcript_text.trim()}
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="neutral">{TRANSCRIPT_SOURCES[tr.source_type] ?? tr.source_type}</Badge>
                          <Badge variant={tr.evaluation_status === 'evaluated' ? 'success' : 'warning'}>
                            {tr.evaluation_status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tr.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {tr.evaluation_status !== 'evaluated' && (
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => { setEvaluatingTranscriptId(tr.id); evaluateTranscriptMutation.mutate(tr.id); }}
                            disabled={evaluateTranscriptMutation.isPending && evaluatingTranscriptId === tr.id}
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
                      <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">{tr.transcript_text}</p>
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

                        {evaluation.buying_signals?.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--status-success)] mb-2">Buying Signals</p>
                            <ul className="space-y-1">
                              {evaluation.buying_signals.map((s: string, i: number) => (
                                <li key={i} className="flex items-start gap-1.5 text-xs">
                                  <CheckCircle className="h-3 w-3 mt-0.5 shrink-0 text-[var(--status-success)]" />{s}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {evaluation.objections_detected?.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--status-danger)] mb-2">Objections Detected</p>
                            <ul className="space-y-1">
                              {evaluation.objections_detected.map((o: string, i: number) => (
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

      {/* ── Add Contact Modal ── */}
      {showAddContact && (
        <ContactFormModal
          title="Add Contact"
          initial={EMPTY_FORM}
          saving={addContactMutation.isPending}
          onClose={() => setShowAddContact(false)}
          onSave={(data) => addContactMutation.mutate(data)}
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
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Deal Size (optional)</label>
                <input
                  type="number"
                  value={outcomeForm.deal_size}
                  onChange={(e) => setOutcomeForm({ ...outcomeForm, deal_size: e.target.value })}
                  placeholder="e.g. 50000"
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

      {/* ── Edit Company Information Modal ── */}
      <Modal
        open={showEditCompanyInfo}
        onOpenChange={setShowEditCompanyInfo}
        title="Edit Company Information"
        description="Update the company details for this lead."
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
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Company Name */}
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

            {/* Address */}
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Address</label>
              <textarea
                value={companyForm.address}
                onChange={(e) => setCompanyForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="Full address"
                rows={2}
                className="min-h-[60px] w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground shadow-xs outline-none transition placeholder:text-muted-foreground focus-visible:border-[var(--brand)] focus-visible:ring-3 focus-visible:ring-[color:var(--brand)]/15"
              />
            </div>

            {/* Industry */}
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

            {/* Sub-Industry */}
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

            {/* Phone */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Phone</label>
              <Input
                type="tel"
                value={companyForm.phone}
                onChange={(e) => setCompanyForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+62 31 7882383"
              />
            </div>

            {/* Email */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Email</label>
              <Input
                type="email"
                value={companyForm.email}
                onChange={(e) => setCompanyForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="info@company.com"
              />
            </div>

            {/* Website */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Website</label>
              <Input
                type="url"
                value={companyForm.website}
                onChange={(e) => setCompanyForm((f) => ({ ...f, website: e.target.value }))}
                placeholder="https://www.company.com"
              />
            </div>

            {/* Company Size */}
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

            {/* Business Category */}
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Business Category</label>
              <Input
                value={companyForm.business_category}
                onChange={(e) => setCompanyForm((f) => ({ ...f, business_category: e.target.value }))}
                placeholder="e.g. Manufacturing, Retail, Services"
              />
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
              onChange={(e) => setActivityForm((f) => ({ ...f, activity_type: e.target.value }))}
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
        onOpenChange={setShowEnrichModal}
        title="Enrich Contacts"
        description="Select sources to search for contact data. Only sources with a configured API key are active."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowEnrichModal(false)}>Cancel</Button>
            <Button
              onClick={() => enrichMutation.mutate()}
              disabled={enrichMutation.isPending || !selectedEnrichSources.includes('lusha')}
            >
              {enrichMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Run Enrichment
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          {ENRICH_SOURCES.map((src) => (
            <label
              key={src.id}
              className={`flex items-start gap-3 rounded-xl border p-3 transition-colors cursor-pointer ${
                src.available
                  ? 'border-border hover:bg-muted/30'
                  : 'border-border/50 opacity-50 cursor-not-allowed'
              }`}
            >
              <input
                type="checkbox"
                className="mt-0.5"
                disabled={!src.available}
                checked={selectedEnrichSources.includes(src.id)}
                onChange={(e) =>
                  setSelectedEnrichSources((prev) =>
                    e.target.checked ? [...prev, src.id] : prev.filter((s) => s !== src.id)
                  )
                }
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{src.label}</span>
                  {src.available
                    ? <Badge variant="success">Active</Badge>
                    : <Badge variant="neutral">Not configured</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{src.note}</p>
              </div>
            </label>
          ))}
          <p className="text-xs text-muted-foreground pt-1">
            Configure API keys in <strong>Settings → Integrations</strong> to enable additional sources.
          </p>
        </div>
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
    </div>
  );
}
