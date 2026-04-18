'use client';

import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiFetch';
import { useState } from 'react';
import {
  ArrowLeft, Plus, Zap, TrendingUp, MessageSquare, Calendar,
  AlertCircle, CheckCircle, Clock, User, FileText, Loader2,
  Phone, Mail, Star, StarOff, Pencil, Trash2, X, Shield, ChevronDown,
  Target, DollarSign, BrainCircuit, ShieldCheck, ThumbsUp, ThumbsDown,
} from 'lucide-react';
import Link from 'next/link';

/* ── Source badge ──────────────────────────────────────────────────── */

const SOURCE_STYLES: Record<string, string> = {
  LUSHA:   'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  manual:  'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  website: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  other:   'bg-gray-500/15 text-gray-400 border-gray-500/30',
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
  const color = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500';
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
  high:   { cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-400/40', label: 'HIGH' },
  medium: { cls: 'bg-amber-500/15 text-amber-400 border-amber-400/40',       label: 'MEDIUM' },
  low:    { cls: 'bg-slate-500/15 text-slate-400 border-slate-400/40',        label: 'LOW' },
};

function IntentBadge({ level }: { level?: string | null }) {
  const cfg = INTENT_CFG[level as keyof typeof INTENT_CFG] ?? INTENT_CFG.low;
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${cfg.cls}`}>{cfg.label}</span>
  );
}

function ConfidenceBar({ value }: { value?: number | null }) {
  const pct = ((value ?? 0) * 100);
  const color = pct >= 70 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-muted/50 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="w-10 text-right text-xs font-medium tabular-nums text-muted-foreground">{pct.toFixed(0)}%</span>
    </div>
  );
}

function RevenueAnalysisPanel({ analysis }: { analysis: any }) {
  const date = analysis.created_at ? new Date(analysis.created_at).toLocaleString() : '';
  const model = analysis.ai_model ? analysis.ai_model.split('-').slice(0, 3).join('-') : 'AI';

  return (
    <div className="rounded-xl border border-purple-500/25 bg-gradient-to-br from-purple-950/30 to-card p-5 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-purple-400" />
            <h3 className="font-semibold text-sm">Revenue Intelligence Analysis</h3>
            {analysis.status === 'failed' && (
              <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-400">FAILED</span>
            )}
            {analysis.status === 'partial' && (
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-400">PARTIAL</span>
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
            <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-400 mb-2">Buying Signals</p>
            <ul className="space-y-1">
              {analysis.buying_signals.map((s: string, i: number) => (
                <li key={i} className="flex items-start gap-1.5 text-xs">
                  <CheckCircle className="h-3 w-3 flex-shrink-0 mt-0.5 text-emerald-400" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}
        {analysis.objections?.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-red-400 mb-2">Objections</p>
            <ul className="space-y-1">
              {analysis.objections.map((o: string, i: number) => (
                <li key={i} className="flex items-start gap-1.5 text-xs">
                  <AlertCircle className="h-3 w-3 flex-shrink-0 mt-0.5 text-red-400" />
                  {o}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Recommended action */}
      {analysis.recommended_action && (
        <div className="rounded-lg border border-purple-500/20 bg-purple-500/10 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-purple-400 mb-1">Recommended Action</p>
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
            className="flex items-center gap-1.5 rounded-lg bg-indigo-500 px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
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
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [showMeetingForm, setShowMeetingForm] = useState(false);

  // Contact UI state
  const [showAddContact, setShowAddContact]       = useState(false);
  const [editingContact, setEditingContact]       = useState<any | null>(null);
  const [deletingContactId, setDeletingContactId] = useState<number | null>(null);

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

  const invalidateLead = () => qc.invalidateQueries({ queryKey: ['lead', leadId] });

  /* ── Intelligence mutations ── */
  const scoreMutation = useMutation({
    mutationFn: () => apiFetch(`/leads/${leadId}/rescore`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lead-intelligence', leadId] }),
  });

  const qualifyMutation = useMutation({
    mutationFn: () => apiFetch(`/leads/${leadId}/qualify`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lead-intelligence', leadId] }),
  });

  /* ── Activity / meeting mutations ── */
  const activityMutation = useMutation({
    mutationFn: (data: any) =>
      apiFetch(`/leads/${leadId}/activities`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lead-activities', leadId] }),
  });

  const meetingMutation = useMutation({
    mutationFn: (data: any) =>
      apiFetch(`/leads/${leadId}/meetings`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lead-meetings', leadId] }),
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
    onSuccess: () => alert('Contact enrichment queued. Results will appear shortly.'),
  });

  /* ── Revenue Intelligence queries & mutations ── */
  const { data: revenueIntel, isLoading: revenueLoading, refetch: refetchRevenue } = useQuery({
    queryKey: ['revenue-intelligence', leadId],
    queryFn: () => apiFetch(`/leads/${leadId}/revenue-intelligence`).then((r) => r.json()),
    enabled: activeTab === 'revenue',
  });

  const icpMatchMutation = useMutation({
    mutationFn: () => apiFetch(`/leads/${leadId}/icp-match`, { method: 'POST' }),
    onSuccess: () => refetchRevenue(),
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
  const progressData  = progress || {};
  const activitiesList = activities?.data || [];
  const meetingsList  = meetings?.data || [];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/leads">
          <button className="rounded-lg p-2 hover:bg-muted">
            <ArrowLeft className="h-4 w-4" />
          </button>
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
          <p className="mt-1 text-xs text-muted-foreground">Grade: {latestScore?.grade ?? 'N/A'}</p>
          <button
            onClick={() => scoreMutation.mutate()}
            disabled={scoreMutation.isPending}
            className="mt-3 rounded bg-muted px-2 py-1 text-xs hover:bg-muted/80 disabled:opacity-50"
          >
            {scoreMutation.isPending ? 'Scoring...' : 'Rescore'}
          </button>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">QUALIFICATION</span>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </div>
          <div className="text-2xl font-bold capitalize">{latestQual?.qualified ?? '—'}</div>
          <p className="mt-1 text-xs text-muted-foreground">{latestQual?.business_type || 'Unknown'}</p>
          <button
            onClick={() => qualifyMutation.mutate()}
            disabled={qualifyMutation.isPending}
            className="mt-3 rounded bg-muted px-2 py-1 text-xs hover:bg-muted/80 disabled:opacity-50"
          >
            {qualifyMutation.isPending ? 'Qualifying...' : 'Requalify'}
          </button>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">ACTIVITIES</span>
            <MessageSquare className="h-4 w-4 text-blue-500" />
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

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-0 overflow-x-auto">
          {['Overview', 'Contacts', 'Intelligence', 'Revenue', 'Activities', 'Meetings', 'Transcripts'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab.toLowerCase())}
              className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.toLowerCase()
                  ? 'border-indigo-500 text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
              {tab === 'Contacts' && contacts.length > 0 && (
                <span className="ml-1.5 rounded-full bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-bold text-indigo-400">
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
            <h3 className="mb-4 font-semibold">Company Information</h3>
            <div className="space-y-3 text-sm">
              <div><span className="text-muted-foreground">Industry:</span> {leadData.industry?.name || '—'}</div>
              <div><span className="text-muted-foreground">Email:</span> {leadData.email || '—'}</div>
              <div><span className="text-muted-foreground">Phone:</span> {leadData.phone || '—'}</div>
              <div>
                <span className="text-muted-foreground">Website:</span>{' '}
                {leadData.website ? (
                  <a href={leadData.website} target="_blank" className="text-indigo-400 hover:underline">
                    {leadData.website}
                  </a>
                ) : '—'}
              </div>
              <div><span className="text-muted-foreground">Company Size:</span> {leadData.company_size_estimate || '—'}</div>
            </div>
          </div>

          {/* Mini contacts card in overview */}
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">Key Contacts</h3>
              <button
                onClick={() => setActiveTab('contacts')}
                className="text-xs text-indigo-400 hover:underline"
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
                        {c.is_primary && <Star className="h-3 w-3 fill-amber-400 text-amber-400" />}
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
              className="flex items-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-600"
            >
              <Plus className="h-3.5 w-3.5" /> Add Contact
            </button>
            <button
              onClick={() => enrichMutation.mutate()}
              disabled={enrichMutation.isPending}
              className="flex items-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-3 py-2 text-xs font-medium text-indigo-400 hover:bg-indigo-500/20 disabled:opacity-50"
            >
              {enrichMutation.isPending
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Zap className="h-3.5 w-3.5" />}
              Enrich via Lusha
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
                    contact.is_primary ? 'border-amber-500/40' : 'border-border'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-400">
                      <User className="h-5 w-5" />
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{contact.name}</p>
                        {contact.is_primary && (
                          <span className="flex items-center gap-0.5 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                            <Star className="h-2.5 w-2.5 fill-amber-400" /> Primary
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
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-amber-500/10 hover:text-amber-400 disabled:opacity-50"
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
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-400"
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
          {latestScore && (
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="mb-4 font-semibold">Score Breakdown</h3>
              {latestScore.score_breakdown && (
                <div className="space-y-2">
                  {Array.isArray(latestScore.score_breakdown) &&
                    latestScore.score_breakdown.map((factor: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span>{factor.factor}</span>
                        <span className="font-medium">{factor.score} pts</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {latestAnalysis && (
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="mb-4 font-semibold">AI Lead Analysis</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Relevance:</span>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-2 w-24 rounded-full bg-muted">
                      <div className="h-full rounded-full bg-indigo-500" style={{ width: `${latestAnalysis.relevance_score}%` }} />
                    </div>
                    {latestAnalysis.relevance_score}%
                  </div>
                </div>
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

          {topProducts.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="mb-4 font-semibold">Recommended Products</h3>
              <div className="space-y-3">
                {topProducts.map((match: any) => (
                  <div key={match.id} className="flex items-center justify-between rounded-lg bg-muted/20 p-3">
                    <div>
                      <p className="text-sm font-medium">{match.product?.name}</p>
                      <p className="text-xs text-muted-foreground">{match.match_reason}</p>
                    </div>
                    <p className="font-bold">{match.match_score}%</p>
                  </div>
                ))}
              </div>
            </div>
          )}
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
                  className="flex items-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-400 hover:bg-indigo-500/20 disabled:opacity-50"
                >
                  {icpMatchMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Target className="h-3 w-3" />}
                  Run ICP Match
                </button>
                <button
                  onClick={() => predictMutation.mutate()}
                  disabled={predictMutation.isPending}
                  className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50"
                >
                  {predictMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <TrendingUp className="h-3 w-3" />}
                  Predict Conversion
                </button>
                <button
                  onClick={() => prescribeMutation.mutate()}
                  disabled={prescribeMutation.isPending}
                  className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-400 hover:bg-amber-500/20 disabled:opacity-50"
                >
                  {prescribeMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <BrainCircuit className="h-3 w-3" />}
                  Get Prescription
                </button>
                <button
                  onClick={() => analysisMutation.mutate()}
                  disabled={analysisMutation.isPending}
                  className="flex items-center gap-1.5 rounded-lg border border-purple-500/40 bg-purple-500/10 px-3 py-1.5 text-xs font-medium text-purple-400 hover:bg-purple-500/20 disabled:opacity-50"
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
                <div className="flex items-center gap-3 rounded-xl border border-purple-500/30 bg-purple-500/10 p-4 text-sm text-purple-400">
                  <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                  Revenue Intelligence AI is analysing this lead — this may take 15–30 seconds…
                </div>
              )}

              <div className="grid gap-4 lg:grid-cols-2">
                {/* ICP Match */}
                <div className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="h-4 w-4 text-indigo-400" />
                    <h3 className="font-semibold text-sm">ICP Match</h3>
                  </div>
                  {revenueIntel?.data?.icp_match ? (
                    <div>
                      {revenueIntel.data.icp_match.matched === false ? (
                        <p className="text-xs text-muted-foreground">{revenueIntel.data.icp_match.reason}</p>
                      ) : (
                        <>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-2xl font-bold">{revenueIntel.data.icp_match.match_score?.toFixed(1)}</span>
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                              revenueIntel.data.icp_match.match_level === 'excellent' ? 'bg-emerald-500/15 text-emerald-500 border-emerald-400/40'
                              : revenueIntel.data.icp_match.match_level === 'good' ? 'bg-blue-500/15 text-blue-400 border-blue-400/40'
                              : revenueIntel.data.icp_match.match_level === 'fair' ? 'bg-amber-500/15 text-amber-400 border-amber-400/40'
                              : 'bg-red-500/15 text-red-400 border-red-400/40'
                            }`}>
                              {revenueIntel.data.icp_match.match_level?.toUpperCase()}
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-muted/50 overflow-hidden mb-2">
                            <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${revenueIntel.data.icp_match.match_score ?? 0}%` }} />
                          </div>
                          <p className="text-xs text-muted-foreground">Profile: {revenueIntel.data.icp_match.icp_profile}</p>
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
                    <TrendingUp className="h-4 w-4 text-emerald-400" />
                    <h3 className="font-semibold text-sm">Conversion Prediction</h3>
                  </div>
                  {revenueIntel?.data?.latest_prediction ? (
                    <div>
                      <div className="flex items-end gap-2 mb-2">
                        <span className="text-3xl font-bold">{revenueIntel.data.latest_prediction.probability_to_close}%</span>
                        <span className="text-xs text-muted-foreground mb-1">probability to close</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted/50 overflow-hidden mb-3">
                        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${revenueIntel.data.latest_prediction.probability_to_close}%` }} />
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
                    <BrainCircuit className="h-4 w-4 text-amber-400" />
                    <h3 className="font-semibold text-sm">AI Prescription</h3>
                  </div>
                  {revenueIntel?.data?.latest_prescription ? (
                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Recommended Approach</p>
                        <p className="text-sm">{revenueIntel.data.latest_prescription.recommended_approach}</p>
                      </div>
                      <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-400 mb-1">Next Best Action</p>
                        <p className="text-sm font-medium">{revenueIntel.data.latest_prescription.next_best_action}</p>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Follow-up timing</span>
                        <span className="font-medium">{revenueIntel.data.latest_prescription.follow_up_timing}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Priority</span>
                        <span className="font-bold text-indigo-400">{revenueIntel.data.latest_prescription.priority_score}/10</span>
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
                    <ShieldCheck className="h-4 w-4 text-blue-400" />
                    <h3 className="font-semibold text-sm">Revenue Gate Check</h3>
                  </div>
                  {revenueIntel?.data?.revenue_check ? (
                    <div className="space-y-3">
                      <div className={`rounded-lg border p-3 ${
                        revenueIntel.data.revenue_check.blocked
                          ? 'bg-red-500/10 border-red-500/30'
                          : 'bg-emerald-500/10 border-emerald-500/30'
                      }`}>
                        <p className={`text-sm font-semibold ${revenueIntel.data.revenue_check.blocked ? 'text-red-400' : 'text-emerald-400'}`}>
                          {revenueIntel.data.revenue_check.summary}
                        </p>
                      </div>
                      {revenueIntel.data.revenue_check.rules_triggered.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Triggered Rules</p>
                          <div className="space-y-1.5">
                            {revenueIntel.data.revenue_check.rules_triggered.map((r: any, i: number) => (
                              <div key={i} className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-xs ${
                                r.severity === 'critical' ? 'bg-red-500/10 text-red-400'
                                : r.severity === 'warning' ? 'bg-amber-500/10 text-amber-400'
                                : 'bg-blue-500/10 text-blue-400'
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
                            <span key={f} className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-400">{f}</span>
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
                        ? <ThumbsUp className="h-4 w-4 text-emerald-400" />
                        : <ThumbsDown className="h-4 w-4 text-red-400" />}
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
          <button
            onClick={() => setShowActivityForm(!showActivityForm)}
            className="flex items-center gap-2 rounded-lg bg-indigo-500 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-600"
          >
            <Plus className="h-4 w-4" /> Add Activity
          </button>

          {showActivityForm && (
            <div className="rounded-lg border border-border bg-card p-4">
              <input type="text" placeholder="Activity type (Call, Email, Meeting...)" className="mb-2 w-full rounded border border-input px-3 py-2 text-sm" id="activity-type" />
              <textarea placeholder="Description..." className="mb-3 w-full rounded border border-input px-3 py-2 text-sm" id="activity-desc" rows={3} />
              <button
                onClick={() => {
                  const typeEl = document.getElementById('activity-type') as HTMLInputElement;
                  const descEl = document.getElementById('activity-desc') as HTMLTextAreaElement;
                  activityMutation.mutate({ activity_type: typeEl.value, description: descEl.value });
                  setShowActivityForm(false);
                }}
                className="rounded bg-indigo-500 px-3 py-2 text-sm font-medium text-white"
              >
                Save Activity
              </button>
            </div>
          )}

          <div className="space-y-2">
            {activitiesList.length > 0 ? (
              activitiesList.map((activity: any) => (
                <div key={activity.id} className="flex gap-4 rounded border border-border bg-card p-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.activity_type}</p>
                    <p className="text-xs text-muted-foreground">{activity.description}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(activity.activity_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No activities recorded</p>
            )}
          </div>
        </div>
      )}

      {/* ── MEETINGS TAB ── */}
      {activeTab === 'meetings' && (
        <div className="space-y-4">
          <button
            onClick={() => setShowMeetingForm(!showMeetingForm)}
            className="flex items-center gap-2 rounded-lg bg-indigo-500 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-600"
          >
            <Plus className="h-4 w-4" /> Add Meeting
          </button>

          {showMeetingForm && (
            <div className="rounded-lg border border-border bg-card p-4">
              <input type="date" className="mb-2 w-full rounded border border-input px-3 py-2 text-sm" id="meeting-date" />
              <select className="mb-2 w-full rounded border border-input px-3 py-2 text-sm" id="meeting-type">
                <option>Virtual</option>
                <option>In-Person</option>
                <option>Phone Call</option>
              </select>
              <textarea placeholder="Summary..." className="mb-2 w-full rounded border border-input px-3 py-2 text-sm" id="meeting-summary" rows={3} />
              <button
                onClick={() => {
                  const dateEl    = document.getElementById('meeting-date') as HTMLInputElement;
                  const typeEl    = document.getElementById('meeting-type') as HTMLSelectElement;
                  const summaryEl = document.getElementById('meeting-summary') as HTMLTextAreaElement;
                  meetingMutation.mutate({
                    meeting_date: dateEl.value,
                    meeting_type: typeEl.value,
                    summary:      summaryEl.value,
                    key_points: [], objections: [], next_steps: [],
                  });
                  setShowMeetingForm(false);
                }}
                className="rounded bg-indigo-500 px-3 py-2 text-sm font-medium text-white"
              >
                Save Meeting
              </button>
            </div>
          )}

          <div className="space-y-2">
            {meetingsList.length > 0 ? (
              meetingsList.map((meeting: any) => (
                <div key={meeting.id} className="flex gap-4 rounded border border-border bg-card p-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {meeting.meeting_type} — {new Date(meeting.meeting_date).toLocaleDateString()}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{meeting.summary}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No meetings recorded</p>
            )}
          </div>
        </div>
      )}

      {/* ── TRANSCRIPTS TAB ── */}
      {activeTab === 'transcripts' && (
        <div className="text-sm text-muted-foreground">
          Transcript feature coming soon. Evaluations will appear here.
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
                className="flex items-center gap-1.5 rounded-lg bg-indigo-500 px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
              >
                {outcomeMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                Save Outcome
              </button>
            </div>
          </div>
        </div>
      )}

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
                className="flex items-center gap-1.5 rounded-lg bg-red-500 px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
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
