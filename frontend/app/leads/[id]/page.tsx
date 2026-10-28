'use client';
import { EditLeadModal } from "@/components/leads/EditLeadModal";
import { useAuthStore } from "@/store/useAuthStore";

import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiFetch';
import { IntelligenceTab } from '@/components/leads/IntelligenceTab';
import { clampPercent, formatQualificationStatus, gradeVariant, icpLabel, icpVariant, qualificationVariant } from "@/lib/leadDisplay";
import { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { AILoader } from "@/components/ui/ai-loader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button, buttonVariants } from '@/components/ui/button';
import {
  ArrowLeft, Plus, Zap, TrendingUp, MessageSquare, Calendar,
  AlertCircle, CheckCircle, XCircle, Clock, User, FileText, Loader2,
  Phone, Mail, MapPin, Star, StarOff, Pencil, Trash2, X, Shield, ChevronDown, ChevronUp,
  Target, DollarSign, BrainCircuit, ShieldCheck, ThumbsUp, ThumbsDown,
  Building2, ClipboardList, Sparkles, CornerDownRight, ChevronRight,
  Activity, Info, Search, ExternalLink, Printer, RefreshCw, Bot, FileDown, GitBranch, Link as LinkIcon
} from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import Link from 'next/link';
import DateTimePicker from "@/components/ui/date-time-picker";
import { cn, safeJsonArray, safeRender } from '@/lib/utils';
import { useNumberFormat } from '@/lib/hooks/use-number-format';
import { LeadBantcQuestionGuide } from '@/components/leads/LeadBantcQuestionGuide';
import { ProgressiveFluxLoader } from "@/components/ui/progressive-flux-loader";
import { PreMeetingBriefTab } from '@/components/leads/PreMeetingBriefTab';
import { CommercialTeam } from '@/components/leads/CommercialTeam';
import { OrderToCash } from '@/components/leads/OrderToCash';
import { ProfessionalServicesTab } from '@/components/leads/tabs/professional-services-tab';
import { ProjectPlansTab } from '@/components/leads/tabs/project-plans-tab';
import { DiscoveryWorkspaceTab } from '@/components/leads/tabs/DiscoveryWorkspaceTab';
import { ContactsTab } from '@/components/leads/tabs/ContactsTab';
import { ActivitiesTab } from '@/components/leads/tabs/ActivitiesTab';
import { MeetingsTab } from '@/components/leads/tabs/MeetingsTab';
import { TranscriptsTab } from '@/components/leads/tabs/TranscriptsTab';
import { CustomerJourneyTab } from '@/components/leads/tabs/CustomerJourneyTab';
import { OverviewTab } from '@/components/leads/tabs/OverviewTab';
import { RevenueTab } from '@/components/leads/tabs/RevenueTab';
import { CreateNewModal } from '@/components/ui/CreateNewModal';
import { AnalysisReportDialog } from '@/components/leads/reports/AnalysisReportDialog';
import { useToast } from "@/components/ui/toast";
import { InContextSalesCopilotDrawer } from '@/components/leads/InContextSalesCopilotDrawer';
import { EnrollCadenceModal } from '@/components/leads/EnrollCadenceModal';
import { SalesCadenceStatusCard } from '@/components/leads/SalesCadenceStatusCard';
import { FieldSalesCheckinModal } from '@/components/leads/FieldSalesCheckinModal';

/* ── Source badge ──────────────────────────────────────────────────── */

const SOURCE_STYLES: Record<string, string> = {
  LUSHA:   'bg-[color-mix(in_oklch,var(--brand)_15%,transparent)] text-[var(--brand)] border-[var(--brand)]/30',
  GOOGLE_SEARCH: 'bg-[color-mix(in_oklch,var(--status-info)_15%,transparent)] text-[var(--status-info)] border-[var(--status-info)]/30',
  LINKEDIN: 'bg-[color-mix(in_oklch,var(--status-info)_15%,transparent)] text-[var(--status-info)] border-[var(--status-info)]/30',
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
      <div className="w-16">
        <ProgressiveFluxLoader layout="feature"
          value={pct}
          showLabel={false}
          barClassName="h-1.5"
          gradient={`var(${color.replace('bg-[var(', '--').replace(')]', ')')})`}
        />
      </div>
      <span className="text-[10px] font-medium tabular-nums text-muted-foreground">{pct}%</span>
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

function qualificationLabel(value?: string | null) {
  if (!value) return 'Unknown';
  return value.replace(/_/g, ' ');
}

/**
 * The lead detail tabs, grouped by intent. Every label — and therefore every
 * activeTab value — is unchanged from the flat list this replaced.
 *
 * 'Meetings' is deliberately absent, as it was before: the tab still renders a
 * notice pointing at Activities so old ?tab=meetings links keep working, but it
 * is not something to send people to.
 */
const LEAD_TAB_GROUPS: { label: string; tabs: string[] }[] = [
  { label: 'Profile', tabs: ['Overview', 'Contacts', 'Team'] },
  { label: 'AI Intelligence', tabs: ['Discovery', 'Intelligence', 'Pre-Meeting Brief', 'Revenue'] },
  { label: 'Commercial', tabs: ['Orders', 'Professional Services', 'Projects'] },
  { label: 'History', tabs: ['Activities', 'Transcripts', 'Customer Journey'] },
];



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
            <label className="text-xs font-medium text-muted-foreground">PIC Email</label>
            <input type="email" value={form.email} onChange={set('email')} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">PIC Phone</label>
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
  mode: 'manual' | 'google' | 'linkedin' | 'deep';
  setMode: (mode: 'manual' | 'google' | 'linkedin' | 'deep') => void;
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
              {mode === 'google' ? 'Search by Google' : (mode === 'linkedin' ? 'LinkedIn Search' : 'Deep Search (Yahoo/AI)')}
            </Button>
          </>
        )
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Add Method</label>
          <Select value={mode} onChange={(e) => setMode(e.target.value as 'manual' | 'google' | 'linkedin' | 'deep')}>
            <option value="manual">Manual Add</option>
            <option value="google">Search by Google</option>
            <option value="linkedin">LinkedIn Search</option>
            <option value="deep">Deep Search (Yahoo/AI)</option>
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
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">PIC Email</label>
              <Input type="email" value={form.email} onChange={set('email')} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">PIC Phone</label>
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
              ) : mode === 'linkedin' ? (
                <>LinkedIn search discovers matching public profiles scoped under the LINKEDIN provider using Google search engine scoped to site:linkedin.com/in.</>
              ) : (
                <>Deep Search scans global search engines (Google, Bing, Yahoo) using AI Web Search to discover decision-maker LinkedIn profiles and PIC names.</>
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
                  : mode === 'linkedin'
                  ? 'Run LinkedIn Search to discover PIC profiles using the LinkedIn integration.'
                  : 'Run Deep Search (Yahoo/AI) to find PIC profiles across global search engines.'}
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
  const toast = useToast();
  const params = useParams();
  const leadId = params.id as string;
  const qc = useQueryClient();
  const authUser = useAuthStore((s) => s.user);
  const isSuperAdmin = authUser?.role?.name === "super_admin" || authUser?.role?.name === "superadmin";
  const currentUserId = authUser?.id;
  const { formatNumber, formatCurrency, normalizeAmountInput, formatAmountInput } = useNumberFormat();
  const [activeTab, setActiveTab] = useState('overview');
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isCadenceModalOpen, setIsCadenceModalOpen] = useState(false);
  const [isCheckinModalOpen, setIsCheckinModalOpen] = useState(false);
  const [createNewModalConfig, setCreateNewModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    endpoint: string;
    payloadKey?: string;
    additionalPayload?: Record<string, any>;
    onSuccess: (item: any) => void;
  } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab) {
        setActiveTab(tab);
      }
    }
  }, []);

  // Company info edit state (unified with Edit Lead form)
  const [showEditCompanyInfo, setShowEditCompanyInfo] = useState(false);
  const [companyForm, setCompanyForm] = useState({
    company_name: '',
    brand: '',
    address: '',
    lat: '',
    lng: '',
    phone: '',
    email: '',
    website: '',
    industry_id: '',
    sub_industry_id: '',
    company_size_estimate: '',
    business_category_id: '',
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
  const [addContactMode, setAddContactMode]       = useState<'manual' | 'google' | 'linkedin' | 'deep'>('manual');
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
    budget: '',
    authority: '',
    needs: '',
    timeline: '',
    competitor: '',
  });
  // Transcript state
  const [showTranscriptForm, setShowTranscriptForm] = useState(false);
  const [transcriptFeedback, setTranscriptFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [larkBaseFeedback, setLarkBaseFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [transcriptForm, setTranscriptForm] = useState({
    title: '',
    source_type: 'manual',
    activity_id: '',
    recorded_at: '',
    transcript_text: '',
    transcript_file: null as File | null,
    meeting_link: '',
    analyze_after_save: true,
    meeting_type: 'General',
  });
  const [evaluatingTranscriptId, setEvaluatingTranscriptId] = useState<number | null>(null);
  const [expandedEvalId, setExpandedEvalId]       = useState<number | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [showPdfModal, setShowPdfModal] = useState<boolean>(false);

  // Fetch lead details (includes contacts)
  const { data: lead, isLoading: leadLoading } = useQuery({
    queryKey: ['lead', leadId],
    queryFn: () => apiFetch(`/leads/${leadId}`).then((r) => r.json()),
    enabled: !!leadId && leadId !== 'undefined',
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
    enabled: activeTab === 'pre-meeting brief',
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

  const { data: financialsData, refetch: refetchFinancials } = useQuery({
    queryKey: ['company-financials', leadId],
    queryFn: () => apiFetch(`/leads/${leadId}/financials`).then((r) => r.json()),
    enabled: activeTab === 'intelligence',
  });

  const resolveConflictMutation = useMutation({
    mutationFn: async (payload: { override_value: string; override_type: string; justification?: string }) => {
      const res = await apiFetch(`/leads/${leadId}/verification/resolve-conflict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || 'Failed to resolve conflict');
      return json;
    },
    onSuccess: () => {
      refetchVerification();
      invalidateLead();
      setShowConflictModal(false);
    }
  });

  const [showConflictModal, setShowConflictModal] = useState(false);
  const [overrideValue, setOverrideValue] = useState('');
  const [overrideType, setOverrideType] = useState('legal_name');
  const [overrideJustification, setOverrideJustification] = useState('');

  const { data: confidentiality, refetch: refetchConfidentiality } = useQuery({
    queryKey: ['lead-confidentiality', leadId],
    queryFn: () => apiFetch(`/confidentiality/assessments/lead/${leadId}`)
      .then((r) => {
        if (!r.ok && r.status === 404) return null;
        if (!r.ok) throw new Error('Failed to fetch confidentiality');
        return r.json().then(json => json.data || json);
      }),
    enabled: !!lead && activeTab === 'intelligence',
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
    refetchInterval: (query) => {
      if (!query.state.data) return false;
      const data = (query.state.data as any).data || [];
      if (!Array.isArray(data)) return false;
      const isProcessing = data.some((t: any) => 
        ['VALIDATING_LINK', 'RESOLVING_RECORDING', 'EXPORTING_TRANSCRIPT', 'ANALYZING'].includes(t.import_status) ||
        t.evaluation_status === 'pending' || t.evaluation_status === 'analyzing'
      );
      return isProcessing ? 3000 : false;
    }
  });

  // Fetch evaluations alongside transcripts
  const { data: evaluationsData, refetch: refetchEvaluations } = useQuery({
    queryKey: ['lead-evaluations', leadId],
    queryFn: () => apiFetch(`/leads/${leadId}/evaluations`).then((r) => r.json()),
    enabled: activeTab === 'transcripts',
    refetchInterval: (query) => {
      if (!query.state.data) return false;
      // We can just rely on transcripts refetch, but if we need evaluations, refetch at same rate
      return transcriptsData?.data?.some((t: any) => t.evaluation_status === 'pending' || t.evaluation_status === 'analyzing') ? 3000 : false;
    }
  });

  const { data: businessCategoriesData } = useQuery({
    queryKey: ['business-categories'],
    queryFn: () => apiFetch('/business-categories').then(res => res.json())
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
  const allIndustries: any[] = Array.isArray(industriesData?.data)
    ? industriesData.data
    : Array.isArray(industriesData)
      ? industriesData
      : [];
  const products: any[] = Array.isArray(productsData?.data)
    ? productsData.data
    : Array.isArray(productsData)
      ? productsData
      : [];
  const leadSources: any[] = Array.isArray(leadSourcesData?.data)
    ? leadSourcesData.data
    : Array.isArray(leadSourcesData)
      ? leadSourcesData
      : [];
  const activeLeadSources = Array.isArray(leadSources) ? leadSources.filter((s: any) => s?.is_active) : [];
  const activeLeadChannels = activeLeadSources.flatMap((s: any) =>
    (Array.isArray(s?.channels) ? s.channels : [])
      .filter((c: any) => c?.is_active)
      .map((c: any) => ({ ...c, source_slug: s.slug }))
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

  const usersList = Array.isArray(assignableUsersData?.data)
    ? assignableUsersData.data
    : Array.isArray(assignableUsersData)
      ? assignableUsersData
      : [];
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

  /* ── AI Actions bar (superadmin-only) — mirrors the AI Testing Console's
     re-run buttons so re-running a stuck/failed function doesn't require
     leaving the lead's own page. Every endpoint below is also gated
     server-side to super_admin, not just hidden here. ── */


  const runIntelligenceMutation = useMutation({
    mutationFn: async () => {
      const response = await apiFetch(`/leads/${params.id}/run-intelligence`, { method: "POST" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message ?? "Failed to run AI Intelligence");
      }
      return response.json();
    },
    onSuccess: (data) => {
      setEnrichmentFeedback({ type: 'success', msg: data.message });
    },
    onError: (err: any) => {
      setEnrichmentFeedback({ type: 'error', msg: err.message });
    }
  });

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
      brand:                    leadData.brand                  ?? '',
      address:                  leadData.address                ?? '',
      lat:                      leadData.lat != null ? String(leadData.lat) : '',
      lng:                      leadData.lng != null ? String(leadData.lng) : '',
      phone:                    leadData.phone                  ?? '',
      email:                    leadData.email                  ?? '',
      website:                  leadData.website                ?? '',
      industry_id:              leadData.industry_id != null ? String(leadData.industry_id) : '',
      sub_industry_id:          leadData.sub_industry_id != null ? String(leadData.sub_industry_id) : '',
      company_size_estimate:    leadData.company_size_estimate  ?? '',
      business_category_id:     leadData.business_category_id?.toString() ?? '',
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
      brand:                    companyForm.brand                  || null,
      address:                  companyForm.address                || null,
      lat:                      companyForm.lat ? Number(companyForm.lat) : null,
      lng:                      companyForm.lng ? Number(companyForm.lng) : null,
      phone:                    companyForm.phone                  || null,
      email:                    companyForm.email                  || null,
      website:                  website                            || null,
      industry_id:              companyForm.industry_id ? Number(companyForm.industry_id) : null,
      sub_industry_id:          companyForm.sub_industry_id ? Number(companyForm.sub_industry_id) : null,
      company_size_estimate:    companyForm.company_size_estimate  || null,
      business_category_id:     companyForm.business_category_id || null,
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

  const { data: deepContactCandidatesData, refetch: refetchDeepContactCandidates } = useQuery({
    queryKey: ['lead-deep-contact-candidates', leadId],
    queryFn: () => apiFetch(`/leads/${leadId}/contact-enrichment/google-deep/candidates`).then((r) => r.json()),
    enabled: showAddContact && addContactMode === 'deep',
  });

  const searchDeepContactsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch(`/leads/${leadId}/contact-enrichment/google-deep/search`, { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || 'Failed to perform deep search');
      return json;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['lead-deep-contact-candidates', leadId] });
      setEnrichmentFeedback({ type: 'success', msg: data?.message || 'Deep search candidates loaded' });
    },
    onError: (error: any) => {
      setEnrichmentFeedback({ type: 'error', msg: error?.message || 'Failed to perform deep search' });
    },
  });

  const addDeepCandidateMutation = useMutation({
    mutationFn: async (candidateId: number) => {
      const res = await apiFetch(`/leads/${leadId}/contact-enrichment/google-deep/candidates/${candidateId}/add-contact`, { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || 'Failed to add deep search candidate');
      return json;
    },
    onSuccess: (data) => {
      invalidateLead();
      refetchDeepContactCandidates();
      setEnrichmentFeedback({ type: 'success', msg: data?.message || 'Candidate added to contacts' });
    },
    onError: (error: any) => {
      setEnrichmentFeedback({ type: 'error', msg: error?.message || 'Failed to add deep search candidate' });
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
      setActivityForm({ activity_type: '', description: '', outcome: '', activity_date: '', next_follow_up_date: '', funnel_stage_id: '', budget: '', authority: '', needs: '', timeline: '', competitor: '' });
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
            if (data.meeting_type) formData.append('meeting_type', data.meeting_type);
            const recordedAt = toApiDateTime(data.recorded_at);
            if (data.recorded_at && !recordedAt) {
               throw new Error('Recorded At harus memakai format DD/MM/YYYY, HH:mm. Contoh: 21/05/2026, 17:37');
            }
            if (recordedAt) formData.append('recorded_at', recordedAt);
            if (data.transcript_text) formData.append('transcript_text', data.transcript_text);
            if (data.meeting_link) formData.append('meeting_link', data.meeting_link);
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
      setTranscriptForm({ title: '', source_type: 'manual', activity_id: '', recorded_at: '', transcript_text: '', transcript_file: null, meeting_link: '', analyze_after_save: true, meeting_type: 'General' });
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
        const errText = await r.text();
        let err;
        try {
          const jsonStart = errText.indexOf('{');
          err = JSON.parse(jsonStart !== -1 ? errText.substring(jsonStart) : errText);
        } catch {
          err = { message: errText || `AI analysis failed (${r.status})` };
        }
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

  const fetchTranscriptLinkMutation = useMutation({
    mutationFn: async (url?: string) => {
      const link = url || leadData.meeting_link;
      if (!link) throw new Error("No meeting link provided.");
      const r = await apiFetch(`/leads/${leadId}/transcripts/fetch-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meeting_link: link })
      });
      if (!r.ok) {
        const error = await r.json();
        throw new Error(error.message || 'Failed to fetch transcript from link');
      }
      return r.json();
    },
    onSuccess: () => {
      refetchTranscripts();
      refetchEvaluations();
      setShowTranscriptForm(false);
      setTranscriptFeedback({ type: 'success', msg: 'Transcript import started from link successfully.' });
    },
    onError: (err: any) => {
      setTranscriptFeedback({ type: 'error', msg: err.message || 'Failed to fetch transcript from link.' });
    }
  });

  const generateMeetingSummaryPdfMutation = useMutation({
    mutationFn: async ({ transcriptId, evaluationId }: { transcriptId: number; evaluationId?: number }) => {
      const res = await apiFetch(`/transcripts/meeting-summary/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript_id: transcriptId, evaluation_id: evaluationId })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to trigger PDF generation.');
      return json;
    },
    onSuccess: () => {
      setEvaluatingTranscriptId(null);
      setTranscriptFeedback({ type: 'success', msg: 'Meeting summary PDF generation started. It will be available shortly.' });
    },
    onError: (err: any) => {
      setEvaluatingTranscriptId(null);
      setTranscriptFeedback({ type: 'error', msg: err.message || 'Failed to generate Meeting Summary PDF.' });
    }
  });

  const syncToLarkBaseMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch(`/leads/${leadId}/sync-lark`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to trigger Lark Base sync.');
      return json;
    },
    onSuccess: () => {
      setLarkBaseFeedback({ type: 'success', msg: 'Sync started.' });
      setTimeout(() => setLarkBaseFeedback(null), 4000);
    },
    onError: (err: any) => {
      setLarkBaseFeedback({ type: 'error', msg: err.message || 'Failed to sync to Lark.' });
      setTimeout(() => setLarkBaseFeedback(null), 4000);
    }
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

  const markEligibleMutation = useMutation({
    mutationFn: () => apiFetch(`/leads/${leadId}/mark-eligible`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lead', leadId] });
      qc.invalidateQueries({ queryKey: ['lead-intelligence', leadId] });
    },
  });

  const [briefFeedback, setBriefFeedback] = useState<string | null>(null);
  const [journeyFeedback, setJourneyFeedback] = useState<string | null>(null);

  const generatePreMeetingBriefMutation = useMutation({
    mutationFn: () => apiFetch(`/leads/${leadId}/pre-meeting-brief/generate`, { method: 'POST' }).then(async (r) => {
      if (!r.ok) {
        if (r.status === 504) throw new Error("Generation timed out. The AI is taking longer than expected. Please try again.");
        const err = await r.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to generate Pre-Meeting Brief');
      }
      return r.json();
    }),
    onMutate: () => setBriefFeedback(null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['preMeetingBrief', leadId] });
    },
    onError: (err) => setBriefFeedback(err.message),
  });

  const generateCustomerStoryMutation = useMutation({
    mutationFn: () => apiFetch(`/leads/${leadId}/customer-journey/story`, { method: 'POST' }).then(async (r) => {
      if (!r.ok) {
        if (r.status === 504) throw new Error("Generation timed out. The AI is taking longer than expected. Please try again.");
        const err = await r.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to generate Customer Story');
      }
      return r.json();
    }),
    onMutate: () => setJourneyFeedback(null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customerJourney', leadId] });
    },
    onError: (err) => setJourneyFeedback(err.message),
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

  /* ── Render ── */
  if (leadLoading) {
    return <AILoader text="Loading" fullScreen />;
  }

  const leadData      = lead?.data || {};
  const contacts      = leadData.contacts || [];
  const leadOutcomes = Array.isArray(leadData?.outcomes) ? leadData.outcomes : [];
  const defaultOutcomeSaleType = leadOutcomes.some((outcome: any) => outcome.outcome === 'won') ? 'upsales' : 'new_sales';
  const latestScore   = intelligence?.latest_score;
  const latestQual    = intelligence?.latest_qualification;
  const canMarkEligible = isSuperAdmin || (leadData.owner?.direct_manager_id != null && leadData.owner.direct_manager_id === currentUserId);
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
    link:     'Link',
    whatsapp: 'WhatsApp Conversation',
    audio:    'Audio File',
    video:    'Video File',
    transcript: 'Transcript File',
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
        budget: existing.budget ?? '',
        authority: existing.authority ?? '',
        needs: existing.needs ?? '',
        timeline: existing.timeline ?? '',
        competitor: existing.competitor ?? '',
      });
      setEditingActivity(existing);
    } else {
      setActivityForm({ activity_type: '', description: '', outcome: '', activity_date: '', next_follow_up_date: '', funnel_stage_id: '', budget: '', authority: '', needs: '', timeline: '', competitor: '' });
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

  function openLogActivityWithStage(targetStageId: number | string) {
    setActivityForm({
      activity_type: 'Other',
      description: '',
      outcome: '',
      activity_date: new Date().toISOString().slice(0, 16),
      next_follow_up_date: '',
      funnel_stage_id: String(targetStageId),
      budget: '',
      authority: '',
      needs: '',
      timeline: '',
      competitor: '',
    });
    setEditingActivity(null);
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
      budget: activityForm.budget || undefined,
      authority: activityForm.authority || undefined,
      needs: activityForm.needs || undefined,
      timeline: activityForm.timeline || undefined,
      competitor: activityForm.competitor || undefined,
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/leads">
            <span className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }))}>
              <ArrowLeft className="h-4 w-4" />
            </span>
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-3xl font-bold">{leadData.company_name}</h1>
              {leadData.brand && (
                <Badge variant="outline" className="text-xs bg-slate-100 text-slate-800 border-slate-300">
                  {leadData.brand}
                </Badge>
              )}
              {/* Prominent Eligibility Status Badge */}
              <Badge
                variant={qualificationVariant(leadData.qualification_status)}
                className="text-xs px-2.5 py-1 font-semibold uppercase tracking-wider flex items-center gap-1.5 shadow-xs"
              >
                {leadData.qualification_status === 'eligible' ? (
                  <CheckCircle className="w-3.5 h-3.5" />
                ) : leadData.qualification_status === 'potential' ? (
                  <Sparkles className="w-3.5 h-3.5 text-[var(--brand)]" />
                ) : leadData.qualification_status === 'not_eligible' || leadData.qualification_status === 'disqualified' ? (
                  <XCircle className="w-3.5 h-3.5" />
                ) : (
                  <Clock className="w-3.5 h-3.5" />
                )}
                Eligibility: {formatQualificationStatus(leadData.qualification_status)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{leadData.address}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {larkBaseFeedback && (
             <span className={`text-xs ${larkBaseFeedback.type === 'error' ? 'text-[var(--status-danger)]' : 'text-[var(--status-success)]'}`}>
               {larkBaseFeedback.msg}
             </span>
          )}
          <Button
            variant="outline"
            size="sm"
            className="bg-[var(--status-success)]/10 text-[var(--status-success)] border-[var(--status-success)]/30 hover:bg-[var(--status-success)] hover:text-white"
            onClick={() => setIsCheckinModalOpen(true)}
            title="Field Sales Offline-Ready GPS Check-in"
          >
            <MapPin className="mr-2 h-4 w-4" />
            Field Check-in
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 hover:bg-purple-600 hover:text-white"
            onClick={() => setIsCopilotOpen(true)}
            title="In-Context Sales Copilot & Strategic AI Assistant"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            AI Sales Copilot
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-border hover:bg-muted"
            onClick={() => setIsCadenceModalOpen(true)}
            title="Daftarkan lead ke Automated Sales Cadence Sequence"
          >
            <GitBranch className="mr-2 h-4 w-4 text-brand" />
            Cadence
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-[color-mix(in_oklch,var(--brand)_15%,transparent)] text-[var(--brand)] border-[var(--brand)]/30 hover:bg-[var(--brand)] hover:text-white"
            onClick={() => runIntelligenceMutation.mutate()}
            disabled={runIntelligenceMutation.isPending}
            title="Refreshes ICP match, conversion prediction, and prescriptions on the Revenue tab. This is separate from AI Screening (lead score/qualification/BANTC)."
          >
            {runIntelligenceMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BrainCircuit className="mr-2 h-4 w-4" />}
            Run Revenue Intelligence
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => syncToLarkBaseMutation.mutate()}
            disabled={syncToLarkBaseMutation.isPending}
          >
            {syncToLarkBaseMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Sync to Lark Base
          </Button>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4 flex flex-col justify-between">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">SCORE</span>
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
            <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{leadData.ai_explanation || 'No scoring explanation yet.'}</p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 flex flex-col justify-between">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">ELIGIBILITY & QUALIFICATION</span>
              {leadData.qualification_status === 'eligible' ? (
                <CheckCircle className="h-4 w-4 text-[var(--status-success)]" />
              ) : leadData.qualification_status === 'potential' ? (
                <Sparkles className="h-4 w-4 text-[var(--brand)]" />
              ) : leadData.qualification_status === 'not_eligible' || leadData.qualification_status === 'disqualified' ? (
                <XCircle className="h-4 w-4 text-[var(--status-danger)]" />
              ) : (
                <Clock className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <div className="text-2xl font-bold capitalize flex items-center gap-2">
              {formatQualificationStatus(leadData.qualification_status)}
            </div>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <Badge variant={qualificationVariant(leadData.qualification_status)}>
                {leadData.qualification_status === 'eligible'
                  ? 'Funnel: Qualified (SQL)'
                  : leadData.qualification_status === 'potential'
                    ? 'Funnel: Contacted'
                    : leadData.qualification_status === 'not_eligible' || leadData.qualification_status === 'disqualified'
                      ? 'Funnel: Nurture / Hold'
                      : 'Awaiting Assessment'}
              </Badge>
              {latestQual?.business_type && (
                <span className="text-[11px] text-muted-foreground font-medium uppercase bg-muted/50 px-1.5 py-0.5 rounded">
                  {latestQual.business_type}
                </span>
              )}
            </div>
            <p className="mt-2 text-xs text-muted-foreground line-clamp-2" title={latestQual?.qualification_reason || undefined}>
              {latestQual?.qualification_reason || (leadData.qualification_status && leadData.qualification_status !== 'pending' ? `Lead diklasifikasikan sebagai ${formatQualificationStatus(leadData.qualification_status)}.` : 'Belum dilakukan asesmen kualifikasi.')}
            </p>
          </div>
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

        <div className={`rounded-lg border bg-card p-4 ${progressData.next_follow_up?.is_overdue ? 'border-[var(--status-danger)]/40' : 'border-border'}`}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">NEXT FOLLOW-UP</span>
            <Calendar className={`h-4 w-4 ${progressData.next_follow_up?.is_overdue ? 'text-[var(--status-danger)] animate-pulse' : progressData.next_follow_up ? 'text-[var(--status-warning)]' : 'text-muted-foreground'}`} />
          </div>
          <div className="flex items-center gap-2">
            <div className={`text-sm font-bold ${progressData.next_follow_up?.is_overdue ? 'text-[var(--status-danger)]' : ''}`}>
              {progressData.next_follow_up?.due_date
                ? new Date(progressData.next_follow_up.due_date).toLocaleDateString()
                : 'Not set'}
            </div>
            {progressData.next_follow_up?.is_overdue && (
              <Badge variant="danger" className="text-[10px] uppercase h-5 px-1.5 font-bold">Overdue</Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground truncate" title={progressData.next_follow_up?.purpose || 'N/A'}>
            {progressData.next_follow_up?.purpose || 'N/A'}
          </p>
        </div>
      </div>
 
      {/* ── SALES STAGE FLOW ── */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <span className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">Sales Stage Flow</span>
        </div>
 
        {/* Chevron Progress Flow */}
        <div className="w-full overflow-x-auto pb-2 scrollbar-thin">
          <div className="flex items-center min-w-[700px] md:min-w-0">
            {funnelStages.map((stage: any, index: number) => {
              const currentStageId = leadData.funnelStage?.id || leadData.funnel_stage_id || leadData.current_funnel_stage?.id;
              const currentStageIndex = funnelStages.findIndex((s: any) => s.id === currentStageId);
              
              let status: 'done' | 'active' | 'future' = 'future';
              if (index < currentStageIndex) {
                status = 'done';
              } else if (index === currentStageIndex) {
                status = 'active';
              }
 
              // Color dot
              let dotBg = 'bg-slate-300 dark:bg-slate-700';
              if (status === 'done') dotBg = 'bg-emerald-500';
              if (status === 'active') dotBg = 'bg-orange-500 animate-pulse';
 
              // Clip path polygon calculation
              const isFirst = index === 0;
              const isLast = index === funnelStages.length - 1;
              let clipPath = 'polygon(0% 0%, calc(100% - 10px) 0%, 100% 50%, calc(100% - 10px) 100%, 0% 100%, 10px 50%)';
              if (isFirst) {
                clipPath = 'polygon(0% 0%, calc(100% - 10px) 0%, 100% 50%, calc(100% - 10px) 100%, 0% 100%)';
              } else if (isLast) {
                clipPath = 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 10px 50%)';
              }
 
              // Card styling classes
              let bgClass = 'bg-muted/50 hover:bg-muted text-muted-foreground';
              let borderClass = 'border-transparent';
              
              if (status === 'done') {
                bgClass = 'bg-[var(--status-success)]/10 hover:bg-[var(--status-success)]/15 text-[var(--status-success)]';
              } else if (status === 'active') {
                bgClass = 'bg-primary/10 text-primary ring-2 ring-primary ring-inset';
              }
 
              return (
                <div 
                  key={stage.id}
                  onClick={() => {
                    if (status !== 'active') {
                      openLogActivityWithStage(stage.id);
                    }
                  }}
                  className={`flex-1 relative h-10 flex items-center justify-center font-medium text-xs select-none transition-all cursor-pointer ${bgClass} ${borderClass} px-4 py-2`}
                  style={{ 
                    clipPath, 
                    marginLeft: isFirst ? '0px' : '-8px',
                    zIndex: funnelStages.length - index 
                  }}
                >
                  <div className="flex items-center gap-2 pl-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${dotBg}`} />
                    <span className="truncate">{stage.name}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
 
        {/* Complete Step button (moves to the next stage in sequence) */}
        {(() => {
          const currentStageId = leadData.funnelStage?.id || leadData.funnel_stage_id || leadData.current_funnel_stage?.id;
          const currentStageIndex = funnelStages.findIndex((s: any) => s.id === currentStageId);
          const nextStage = currentStageIndex !== -1 && currentStageIndex < funnelStages.length - 1 
            ? funnelStages[currentStageIndex + 1] 
            : null;

          if (!nextStage) return null;

          return (
            <div className="flex items-center justify-end pt-2 border-t border-border/50">
              <Button 
                size="sm" 
                onClick={() => openLogActivityWithStage(nextStage.id)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-xs transition-all"
              >
                Complete Step
              </Button>
            </div>
          );
        })()}
      </div>

      {!['eligible', 'potential'].includes(leadData.qualification_status ?? '') && canMarkEligible ? (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[var(--brand)]" />
                <h2 className="font-semibold">Eligibility Override</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Current qualification is <b>{formatQualificationStatus(leadData.qualification_status)}</b>, which keeps this lead out of the pipeline.{' '}
                {isSuperAdmin ? 'As a super admin, y' : "As this lead owner's direct manager, y"}ou can mark it Eligible directly.
              </p>
            </div>
            <Button onClick={() => markEligibleMutation.mutate()} disabled={markEligibleMutation.isPending}>
              {markEligibleMutation.isPending ? 'Marking...' : 'Mark as Eligible'}
            </Button>
          </div>
        </div>
      ) : null}

      {/* Tabs. Twelve of them in one flat row read as an undifferentiated list,
          so they are clustered by what the reader came to do. The labels are
          unchanged — activeTab is still the lowercased label, which ?tab= links
          and setActiveTab() calls elsewhere depend on. */}
      <div className="border-b border-border">
        <div className="flex items-stretch overflow-x-auto scroll-smooth">
          {LEAD_TAB_GROUPS.map((group, groupIndex) => (
            <div
              key={group.label}
              className={groupIndex > 0 ? 'ml-3 border-l border-border/60 pl-3' : undefined}
            >
              <span className="block px-4 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                {group.label}
              </span>
              <div className="flex">
                {group.tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={(e) => {
                      setActiveTab(tab.toLowerCase());
                      e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                    }}
                    className={`whitespace-nowrap border-b-2 px-4 pb-3 pt-1.5 text-sm font-medium transition-all duration-200 ${
                      activeTab === tab.toLowerCase()
                        ? 'border-[var(--brand)] text-foreground font-semibold'
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
          ))}
        </div>
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === 'overview' && (
        <OverviewTab
          leadId={leadId}
          leadData={leadData}
          contacts={contacts}
          progressData={progressData}
          activitiesList={activitiesList}
          formatCurrency={formatCurrency}
          openEditCompanyInfo={openEditCompanyInfo}
          setActiveTab={setActiveTab}
          setIsCadenceModalOpen={setIsCadenceModalOpen}
          setShowAddContact={setShowAddContact}
          setAddContactMode={setAddContactMode}
          setEnrichmentFeedback={setEnrichmentFeedback}
          mapsEnabled={mapsEnabled}
          mapsApiKey={mapsApiKey}
          mapCenter={mapCenter}
          geocodeFeedback={geocodeFeedback}
        />
      )}

      {/* ── TEAM TAB ── */}
      {activeTab === 'team' && (
        <div className="space-y-6">
          <CommercialTeam leadId={leadId} />
        </div>
      )}

      {/* ── ORDERS TAB ── */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          <OrderToCash leadId={leadId} />
        </div>
      )}

      {/* ── PROFESSIONAL SERVICES TAB ── */}
      {activeTab === 'professional services' && (
        <div className="space-y-6">
          <ProfessionalServicesTab leadId={Number(params.id)} />
        </div>
      )}

      {/* ── PROJECTS TAB ── */}
      {activeTab === 'projects' && (
        <div className="space-y-6">
          <ProjectPlansTab leadId={Number(params.id)} />
        </div>
      )}

      {/* ── CONTACTS TAB ── */}
      {activeTab === 'contacts' && (
        <ContactsTab
          contacts={contacts}
          lushaEligible={lushaEligible}
          lushaContactOptions={lushaContactOptions}
          onAddContact={() => {
            setAddContactMode('manual');
            setEnrichmentFeedback(null);
            setShowAddContact(true);
          }}
          onOpenLusha={() => {
            setLushaContact(lushaContactOptions[0] ?? null);
            setEnrichmentFeedback(null);
            qc.setQueryData(['lead-lusha-candidates', leadId], { data: [] });
            searchLushaMutation.reset();
            setShowEnrichModal(true);
          }}
          onSetPrimary={(id) => setPrimaryMutation.mutate(id)}
          isSetPrimaryPending={setPrimaryMutation.isPending}
          onEditContact={(contact) => setEditingContact(contact)}
          onDeleteContact={(id) => setDeletingContactId(id)}
        />
      )}

      {/* ── INTELLIGENCE TAB ── */}
      {activeTab === 'intelligence' && (
        <IntelligenceTab
          leadId={leadId}
          leadData={leadData}
          isSuperAdmin={isSuperAdmin}
          intelligence={intelligence}
          revenueIntel={revenueIntel}
          verificationData={verificationData}
          financialsData={financialsData}
          confidentiality={confidentiality}
          products={products}
          onLeadChanged={invalidateLead}
          onResolveConflict={(suggestedName) => { setOverrideValue(suggestedName); setShowConflictModal(true); }}
        />
      )}

      {/* ── REVENUE INTELLIGENCE TAB ── */}
      {activeTab === 'revenue' && (
        <RevenueTab
          revenueLoading={revenueLoading}
          revenueIntel={revenueIntel}
          leadData={leadData}
          leadOutcomes={leadOutcomes}
          defaultOutcomeSaleType={defaultOutcomeSaleType}
          predictMutation={predictMutation}
          prescribeMutation={prescribeMutation}
          formatCurrency={formatCurrency}
          formatNumber={formatNumber}
          setOutcomeForm={setOutcomeForm}
          setShowOutcomeModal={setShowOutcomeModal}
          icpReasoning={icpReasoning}
          icpBreakdown={icpBreakdown}
        />
      )}

      {/* ── ACTIVITIES TAB ── */}
      {activeTab === 'activities' && (
        <ActivitiesTab
          activitiesList={activitiesList}
          onOpenActivityModal={(activity) => openActivityModal(activity)}
          onDeleteActivity={(id) => setDeletingActivityId(id)}
        />
      )}

      {/* ── MEETINGS TAB (deprecated — use Activities) ── */}
      {activeTab === 'meetings' && (
        <MeetingsTab
          meetingsList={meetingsList}
          onNavigateToActivities={() => setActiveTab('activities')}
        />
      )}

      {/* ── TRANSCRIPTS TAB ── */}
      {activeTab === 'transcripts' && (
        <TranscriptsTab
          leadData={leadData}
          lead={lead}
          transcriptsList={transcriptsList}
          evaluationsList={evaluationsList}
          activitiesList={activitiesList}
          expandedEvalId={expandedEvalId}
          setExpandedEvalId={setExpandedEvalId}
          evaluatingTranscriptId={evaluatingTranscriptId}
          setEvaluatingTranscriptId={setEvaluatingTranscriptId}
          evaluateTranscriptMutation={evaluateTranscriptMutation}
          fetchTranscriptLinkMutation={fetchTranscriptLinkMutation}
          generateMeetingSummaryPdfMutation={generateMeetingSummaryPdfMutation}
          deleteTranscriptMutation={deleteTranscriptMutation}
          storeTranscriptMutation={storeTranscriptMutation}
          showTranscriptForm={showTranscriptForm}
          setShowTranscriptForm={setShowTranscriptForm}
          transcriptForm={transcriptForm}
          setTranscriptForm={setTranscriptForm}
          transcriptFeedback={transcriptFeedback}
          setPdfPreviewUrl={setPdfPreviewUrl}
          setShowPdfModal={setShowPdfModal}
        />
      )}

      {/* ── PRE-MEETING BRIEF TAB ── */}
      {activeTab === 'pre-meeting brief' && (
        <PreMeetingBriefTab leadId={leadId} />
      )}

      {/* ── PRESALES DISCOVERY TAB ── */}
      {activeTab === 'discovery' && (
        <DiscoveryWorkspaceTab leadId={leadId} lead={lead} />
      )}

      {/* ── Add Contact Modal ── */}
      {showAddContact && (
        <AddContactModal
          mode={addContactMode}
          setMode={(mode) => {
            setAddContactMode(mode);
            setEnrichmentFeedback(null);
          }}
          candidates={
            addContactMode === 'google'
              ? googleContactCandidates
              : addContactMode === 'linkedin'
              ? linkedinContactCandidates
              : addContactMode === 'deep'
              ? (deepContactCandidatesData?.data || [])
              : []
          }
          feedback={enrichmentFeedback}
          searching={
            addContactMode === 'google'
              ? searchGoogleContactsMutation.isPending
              : addContactMode === 'linkedin'
              ? searchLinkedinContactsMutation.isPending
              : addContactMode === 'deep'
              ? searchDeepContactsMutation.isPending
              : false
          }
          adding={
            addContactMode === 'google'
              ? addGoogleCandidateMutation.isPending
              : addContactMode === 'linkedin'
              ? addLinkedinCandidateMutation.isPending
              : addContactMode === 'deep'
              ? addDeepCandidateMutation.isPending
              : false
          }
          saving={addContactMutation.isPending}
          onSearch={() => {
            if (addContactMode === 'google') {
              searchGoogleContactsMutation.mutate();
            } else if (addContactMode === 'linkedin') {
              searchLinkedinContactsMutation.mutate();
            } else if (addContactMode === 'deep') {
              searchDeepContactsMutation.mutate();
            }
          }}
          onAddCandidate={(candidateId) => {
            if (addContactMode === 'google') {
              addGoogleCandidateMutation.mutate(candidateId);
            } else if (addContactMode === 'linkedin') {
              addLinkedinCandidateMutation.mutate(candidateId);
            } else if (addContactMode === 'deep') {
              addDeepCandidateMutation.mutate(candidateId);
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

      {/* ── Resolve Match Conflict Override Modal ── */}
      <Modal
        open={showConflictModal}
        onOpenChange={setShowConflictModal}
        title="Resolve Legal Entity Name Match Conflict"
        description="Override automatically resolved brand/legal company mapping names."
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowConflictModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => resolveConflictMutation.mutate({
                override_value: overrideValue,
                override_type: overrideType,
                justification: overrideJustification
              })}
              disabled={resolveConflictMutation.isPending || !overrideValue}
            >
              {resolveConflictMutation.isPending ? 'Resolving…' : 'Apply Override'}
            </Button>
          </>
        }
      >
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Override Type</label>
            <select
              value={overrideType}
              onChange={(e) => setOverrideType(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
            >
              <option value="legal_name">Legal Entity Name (PT/CV)</option>
              <option value="brand">Brand / Trading Name</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Override Value</label>
            <Input
              type="text"
              value={overrideValue}
              onChange={(e) => setOverrideValue(e.target.value)}
              placeholder="e.g. PT Example Indonesia Tbk"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Auditor Justification Notes</label>
            <Input
              type="text"
              value={overrideJustification}
              onChange={(e) => setOverrideJustification(e.target.value)}
              placeholder="Provide evidence sources or validation notes"
            />
          </div>
        </div>
      </Modal>

      {/* ── Edit Lead Information Modal (Unified) ── */}
      <EditLeadModal
        lead={leadData}
        open={showEditCompanyInfo}
        onOpenChange={setShowEditCompanyInfo}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ["leads", leadId] });
        }}
      />

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
            <DateTimePicker
              value={activityForm.activity_date}
              onChange={(d: Date | null) => setActivityForm((f) => ({ ...f, activity_date: d ? d.toISOString() : '' }))}
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
        <CustomerJourneyTab
          customerJourney={customerJourney}
          journeyFeedback={journeyFeedback}
          generateCustomerStoryMutation={generateCustomerStoryMutation}
          formatCurrency={formatCurrency}
        />
      )}

      {/* ── Global Process Overlay ── */}
      {(evaluateTranscriptMutation.isPending || generateMeetingSummaryPdfMutation.isPending) && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-8 text-center tracking-tight">
              {evaluateTranscriptMutation.isPending ? "Analyzing Transcript..." : "Generating Summary PDF..."}
            </h3>
            <ProgressiveFluxLoader layout="page" />
            <p className="mt-6 text-sm text-center text-muted-foreground">
              Please wait, AI is processing your request. This may take a few seconds.
            </p>
          </div>
        </div>
      )}

      {createNewModalConfig && (
        <CreateNewModal
          isOpen={createNewModalConfig.isOpen}
          onClose={() => setCreateNewModalConfig(null)}
          title={createNewModalConfig.title}
          endpoint={createNewModalConfig.endpoint}
          payloadKey={createNewModalConfig.payloadKey}
          additionalPayload={createNewModalConfig.additionalPayload}
          onSuccess={createNewModalConfig.onSuccess}
        />
      )}

      {showPdfModal && pdfPreviewUrl && (
        <Modal
          open={showPdfModal}
          onOpenChange={(open) => {
            setShowPdfModal(open);
            if (!open) setPdfPreviewUrl(null);
          }}
          title="PDF Analysis Preview"
          size="full"
        >
          <div className="flex flex-col h-[85vh]">
            <div className="flex justify-end p-2 border-b">
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  const a = document.createElement('a');
                  a.href = pdfPreviewUrl;
                  a.download = 'meeting-summary.pdf';
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                }}
              >
                <FileDown className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
            </div>
            <div className="flex-1 w-full bg-slate-100 p-4">
              <iframe
                src={pdfPreviewUrl}
                className="w-full h-full border rounded shadow"
                title="PDF Preview"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* ── FLOATING SALES COPILOT LAUNCHER ── */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => setIsCopilotOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-semibold text-xs shadow-xl hover:shadow-purple-500/30 hover:scale-105 active:scale-95 transition-all duration-200 border border-white/20 group"
          title="Buka In-Context Sales Copilot"
        >
          <Sparkles className="h-4 w-4 animate-pulse group-hover:rotate-12 transition-transform" />
          <span>Ask Sales Copilot</span>
        </button>
      </div>

      {/* ── SALES COPILOT DRAWER ── */}
      <InContextSalesCopilotDrawer
        leadId={Number(leadId)}
        leadName={leadData?.company_name || 'Lead'}
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
      />

      {/* ── ENROLL CADENCE MODAL ── */}
      <EnrollCadenceModal
        leadId={Number(leadId)}
        leadName={leadData?.company_name || 'Lead'}
        isOpen={isCadenceModalOpen}
        onClose={() => setIsCadenceModalOpen(false)}
      />

      {/* ── FIELD SALES CHECK-IN MODAL ── */}
      <FieldSalesCheckinModal
        leadId={Number(leadId)}
        leadName={leadData?.company_name || 'Lead'}
        isOpen={isCheckinModalOpen}
        onClose={() => setIsCheckinModalOpen(false)}
      />
    </div>
  );
}
