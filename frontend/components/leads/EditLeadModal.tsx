'use client';

import { useState, useEffect } from 'react';
import { apiList } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiFetch';
import { throwIfApiError } from '@/lib/apiError';
import type {
  AppUser,
  BusinessCategory,
  FunnelStage,
  Industry,
  Lead,
  LeadChannelType,
  LeadSourceType,
  Product,
  SubIndustry,
} from '@/types/api';
import { ErrorNotice } from '@/components/ui/error-notice';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Loader2, MapPin, Building2, X, Search, Sparkles, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CreateNewModal } from '@/components/ui/CreateNewModal';
import { APIProvider, AdvancedMarker, Map } from '@vis.gl/react-google-maps';
import { useDebounce } from '@/hooks/useDebounce';
import { useNumberFormat } from "@/lib/hooks/use-number-format";
import { AiProfilingPanel, type ProfilingData } from "@/components/leads/AiProfilingPanel";
import { useToast } from "@/components/ui/toast";

/**
 * What `PUT /api/leads/{id}` accepts from this form.
 *
 * Not simply `Partial<Lead>`, for two reasons worth keeping visible:
 *  - `source_type` and `channel_type_id` are not columns on `leads`. UpdateLeadRequest
 *    validates them, then LeadController strips them off and writes them to the lead's
 *    source row instead — so they belong in the request, never in the entity.
 *  - The amounts go out as numbers but come back as strings, because Laravel's
 *    `decimal:2` cast serialises that way.
 */
/**
 * How long the UI waits for a queued profiling run, and how often it checks.
 *
 * 180s matches RunAiLeadProfilingJob::$timeout — past that the job has been killed, so
 * there is genuinely nothing left to wait for. Anything shorter reports a healthy run
 * as stuck.
 */
const AI_PROFILING_POLL_MS = 2000;
const AI_PROFILING_MAX_ATTEMPTS = 90;
/** After this long the run is unusual, but still running — say so without giving up. */
const AI_PROFILING_SLOW_AFTER_SECONDS = 45;
/** Consecutive unreadable status checks tolerated (10s) before calling the server unreachable. */
const AI_PROFILING_MAX_CONSECUTIVE_FAILURES = 5;

type LeadUpdatePayload = Partial<
  Omit<Lead, "estimated_closing_amount" | "realized_closing_amount" | "business_category_id" | "qualification_status">
> & {
  estimated_closing_amount?: number | null;
  realized_closing_amount?: number | null;
  /** Sent as the raw select value; Laravel's `exists` rule accepts a numeric string. */
  business_category_id?: string | number | null;
  qualification_status?: string | null;
  source_type?: string | null;
  channel_type_id?: number | null;
  ai_profiling_output_id?: number | null;
};

export function EditLeadModal({
  lead,
  open,
  onOpenChange,
  onSuccess
}: {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();

  const [companyForm, setCompanyForm] = useState({
    company_name: '', legal_name: '', brand: '', ownership_type: '', year_established: '',
    address: '', lat: '', lng: '',
    industry_id: '', sub_industry_id: '', phone: '', whatsapp: '', email: '', website: '',
    company_size_estimate: '', operational_scope: '', branch_count: '', customer_story: '',
    business_category_id: '', product_id: '',
    estimated_closing_amount: '', realized_closing_amount: '',
    source_type: '', channel_type_id: '', funnel_stage_id: '',
    qualification_status: '', parent_lead_id: '',
    owner_id: '', presales_owner_id: '', am_owner_id: '', csm_owner_id: ''
  });

  const [createNewModalConfig, setCreateNewModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    endpoint: string;
    additionalPayload?: Record<string, unknown>;
    onSuccess?: (newItem: { id: number; name?: string; slug?: string }) => void;
  }>({ isOpen: false, title: '', endpoint: '' });

  // Map state
  const [locationSearch, setLocationSearch] = useState("");
  const [locationFeedback, setLocationFeedback] = useState("");
  const [locationCenter, setLocationCenter] = useState({ lat: -6.2088, lng: 106.8456 });
  const [profilingStatus, setProfilingStatus] = useState<"idle" | "researching" | "ready_for_review" | "failed" | "timeout" | "applied">("idle");
  const [profilingData, setProfilingData] = useState<ProfilingData | null>(null);
  const [profilingOutputId, setProfilingOutputId] = useState<number | null>(null);
  const [appliedProfileJson, setAppliedProfileJson] = useState<ProfilingData | null>(null);
  const [profilingRetrying, setProfilingRetrying] = useState(false);
  const [profilingElapsed, setProfilingElapsed] = useState(0);
  const [profilingFailureReason, setProfilingFailureReason] = useState<"ai" | "unreachable">("ai");
  const [profilingErrorMessage, setProfilingErrorMessage] = useState<string | null>(null);

  const retryAiProfilingSync = async () => {
    setProfilingRetrying(true);
    setProfilingErrorMessage(null);
    try {
      const res = await apiFetch("/leads/ai-profiling/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: companyForm.company_name.trim(),
          website: companyForm.website?.trim() || undefined,
          lead_id: lead?.id,
          sync: true,
        }),
      });
      const json = await res.json();
      if (json.success && json.data?.status === "ready_for_review") {
        setProfilingStatus("ready_for_review");
        setProfilingOutputId(json.data.id ?? null);
        setProfilingData(json.data.current_output_json);
        setProfilingErrorMessage(null);
      } else {
        setProfilingStatus("failed");
        setProfilingErrorMessage(json.data?.current_output_json?.error || json.data?.error || json.message || "Gagal menjalankan profiling.");
      }
    } catch (err: any) {
      setProfilingStatus("failed");
      setProfilingErrorMessage(err?.message || "Koneksi ke server terputus.");
    } finally {
      setProfilingRetrying(false);
    }
  };
  const [validationError, setValidationError] = useState<string>("");

  // Parent lead search
  const [parentLeadSearch, setParentLeadSearch] = useState(lead?.parent_lead?.company_name || "");
  const [debouncedParentSearch] = useDebounce(parentLeadSearch, 300);
  const { normalizeAmountInput, formatAmountInput } = useNumberFormat();

  useEffect(() => {
    if (open && lead) {
      setCompanyForm({
        company_name: lead.company_name || '',
        legal_name: lead.legal_name || '',
        brand: lead.brand || '',
        ownership_type: lead.ownership_type || '',
        year_established: lead.year_established || '',
        address: lead.address || '',
        lat: lead.lat?.toString() || '',
        lng: lead.lng?.toString() || '',
        industry_id: lead.industry_id?.toString() || '',
        sub_industry_id: lead.sub_industry_id?.toString() || '',
        phone: lead.phone || '',
        whatsapp: lead.whatsapp || '',
        email: lead.email || '',
        website: lead.website || '',
        company_size_estimate: lead.company_size_estimate || '',
        operational_scope: lead.operational_scope || '',
        branch_count: lead.branch_count != null ? String(lead.branch_count) : '',
        customer_story: lead.customer_story || '',
        business_category_id: lead.business_category_id?.toString() || '',
        product_id: lead.product_id?.toString() || '',
        estimated_closing_amount: lead.estimated_closing_amount?.toString() || '',
        realized_closing_amount: lead.realized_closing_amount?.toString() || '',
        source_type: lead.sources?.[0]?.source_type || '',
        channel_type_id: lead.sources?.[0]?.channel_type_id?.toString() || '',
        funnel_stage_id: lead.funnel_stage_id?.toString() || '',
        qualification_status: lead.qualification_status || 'pending',
        parent_lead_id: lead.parent_lead_id?.toString() || '',
        owner_id: lead.owner_id?.toString() || '',
        presales_owner_id: lead.presales_owner_id?.toString() || '',
        am_owner_id: lead.am_owner_id?.toString() || '',
        csm_owner_id: lead.csm_owner_id?.toString() || ''
      });
      setAppliedProfileJson(null);
      setProfilingOutputId(null);
      setLocationSearch("");
      setLocationFeedback("");
      setParentLeadSearch(lead?.parent_lead?.company_name || "");
      if (lead.lat && lead.lng) {
        setLocationCenter({ lat: Number(lead.lat), lng: Number(lead.lng) });
      }
    }
  }, [open, lead]);

  // Queries
  const { data: publicSettingsData } = useQuery({
    queryKey: ['public-settings'],
    queryFn: () => apiFetch('/settings/public').then((r) => r.json()),
    enabled: open
  });
  const settings = publicSettingsData?.data || {};
  const mapsApiKey = settings.GOOGLE_MAPS_BROWSER_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const mapsEnabled = settings.GOOGLE_MAPS_ENABLED === undefined || settings.GOOGLE_MAPS_ENABLED === true || settings.GOOGLE_MAPS_ENABLED === "true";

  const { data: businessCategoriesData } = useQuery({
    queryKey: ['business-categories'],
    queryFn: () => apiFetch('/business-categories').then(res => res.json()),
    enabled: open
  });
  const { data: industriesData } = useQuery({
    queryKey: ['industries'],
    queryFn: () => apiFetch('/industries').then((r) => r.json()),
    enabled: open
  });
  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: () => apiFetch('/products').then((r) => r.json()),
    enabled: open
  });
  const { data: leadSourcesData } = useQuery({
    queryKey: ['lead-source-types'],
    queryFn: () => apiFetch('/settings/lead-sources').then((r) => r.json()),
    enabled: open
  });
  const { data: funnelStagesData } = useQuery({
    queryKey: ['funnel-stages'],
    queryFn: () => apiFetch('/funnel/stages').then((r) => r.json()),
    enabled: open
  });
  const { data: assignableUsersData } = useQuery({
    queryKey: ['lead-assignable-users'],
    queryFn: () => apiFetch('/leads/assignable-users').then((r) => r.json()),
    enabled: open
  });

  const { data: parentLeadSearchData, isFetching: parentLeadSearching } = useQuery({
    queryKey: ['leads-search', debouncedParentSearch],
    queryFn: () => apiFetch(`/leads?search=${encodeURIComponent(debouncedParentSearch || '')}&per_page=5`).then((r) => r.json()),
    enabled: open && (debouncedParentSearch?.length || 0) >= 2,
  });

  const allIndustries = apiList<Industry>(industriesData);
  const products = apiList<Product>(productsData);
  const businessCategories = apiList<BusinessCategory>(businessCategoriesData);
  const leadSources = apiList<LeadSourceType>(leadSourcesData);
  const funnelStages = apiList<FunnelStage>(funnelStagesData);
  
  const usersList = apiList<AppUser>(assignableUsersData);
  const salesUsers = usersList.filter((u) => ["sales_exec", "sales_manager", "admin", "super_admin"].includes(u.role?.name ?? ""));
  const presalesUsers = usersList.filter((u) => ["presales", "admin", "super_admin"].includes(u.role?.name ?? ""));
  const amUsers = usersList.filter((u) => ["account_manager", "admin", "super_admin"].includes(u.role?.name ?? ""));
  const csmUsers = usersList.filter((u) => ["csm", "admin", "super_admin"].includes(u.role?.name ?? ""));

  const parentLeadResults = apiList<Lead>(parentLeadSearchData);
  
  const activeLeadSources = leadSources.filter((s) => s.is_active);
  const selectedLeadSource = activeLeadSources.find((s) => s.slug === companyForm.source_type);
  const activeLeadChannels: LeadChannelType[] = (selectedLeadSource?.channels ?? []).filter((c) => c.is_active);
  const selectedIndustrySubIndustries: SubIndustry[] =
    allIndustries.find((i) => String(i.id) === companyForm.industry_id)?.sub_industries ?? [];

  // Mutations
  const updateLeadMutation = useMutation({
    mutationFn: async (payload: LeadUpdatePayload) => {
      // submitCompanyInfo already returns early without a lead; this keeps the closure
      // honest rather than asserting non-null.
      if (!lead) throw new Error('No lead is open to save.');
      const res = await apiFetch(`/leads/${lead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      await throwIfApiError(res, "This lead could not be saved.");
      return res.json();
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['leads'] });
      await qc.invalidateQueries({ queryKey: ['lead'] });
      if (lead?.id) {
        await qc.invalidateQueries({ queryKey: ['lead', lead.id] });
        await qc.invalidateQueries({ queryKey: ['lead', String(lead.id)] });
        await qc.invalidateQueries({ queryKey: ['leads', lead.id] });
        await qc.invalidateQueries({ queryKey: ['leads', String(lead.id)] });
        await qc.refetchQueries({ queryKey: ['lead', lead.id] });
        await qc.refetchQueries({ queryKey: ['lead', String(lead.id)] });
      }
      await qc.refetchQueries({ queryKey: ['leads'] });
      onSuccess?.();
      onOpenChange(false);
    }
  });

  const submitCompanyInfo = () => {
    setValidationError("");
    if (!lead) return;
    if (!companyForm.company_name.trim()) {
      setValidationError("Company Name is required.");
      return;
    }
    updateLeadMutation.mutate({
      company_name: companyForm.company_name.trim(),
      legal_name: companyForm.legal_name.trim() || null,
      brand: companyForm.brand.trim() || null,
      ownership_type: companyForm.ownership_type.trim() || null,
      year_established: companyForm.year_established.trim() || null,
      address: companyForm.address.trim() || null,
      lat: companyForm.lat ? Number(companyForm.lat) : null,
      lng: companyForm.lng ? Number(companyForm.lng) : null,
      industry_id: companyForm.industry_id ? Number(companyForm.industry_id) : null,
      sub_industry_id: companyForm.sub_industry_id ? Number(companyForm.sub_industry_id) : null,
      phone: companyForm.phone.trim() || null,
      whatsapp: companyForm.whatsapp.trim() || null,
      email: companyForm.email.trim() || null,
      website: companyForm.website.trim() ? (companyForm.website.trim().startsWith('http') ? companyForm.website.trim() : `https://${companyForm.website.trim()}`) : null,
      company_size_estimate: companyForm.company_size_estimate || null,
      operational_scope: companyForm.operational_scope.trim() || null,
      branch_count: companyForm.branch_count ? Number(companyForm.branch_count) : null,
      customer_story: companyForm.customer_story.trim() || null,
      ...(appliedProfileJson ? { ai_profile_json: appliedProfileJson as Record<string, unknown> } : {}),
      ...(profilingOutputId ? { ai_profiling_output_id: profilingOutputId } : {}),
      business_category_id: companyForm.business_category_id || null,
      product_id: companyForm.product_id ? Number(companyForm.product_id) : null,
      estimated_closing_amount: companyForm.estimated_closing_amount ? Number(companyForm.estimated_closing_amount) : null,
      realized_closing_amount: companyForm.realized_closing_amount ? Number(companyForm.realized_closing_amount) : null,
      source_type: companyForm.source_type || null,
      channel_type_id: companyForm.channel_type_id ? Number(companyForm.channel_type_id) : null,
      funnel_stage_id: companyForm.funnel_stage_id ? Number(companyForm.funnel_stage_id) : null,
      qualification_status: companyForm.qualification_status || null,
      parent_lead_id: companyForm.parent_lead_id ? Number(companyForm.parent_lead_id) : null,
      owner_id: companyForm.owner_id ? Number(companyForm.owner_id) : null,
      presales_owner_id: companyForm.presales_owner_id ? Number(companyForm.presales_owner_id) : null,
      am_owner_id: companyForm.am_owner_id ? Number(companyForm.am_owner_id) : null,
      csm_owner_id: companyForm.csm_owner_id ? Number(companyForm.csm_owner_id) : null,
    });
  };

  const handleLocationSearch = async () => {
    const query = locationSearch.trim() || companyForm.address.trim() || companyForm.company_name.trim();
    if (!query) {
      setLocationFeedback("Enter an address or company location to search.");
      return;
    }
    setLocationFeedback("Searching location...");
    try {
      const response = await apiFetch(`/maps/geocode?query=${encodeURIComponent(query)}`);
      const json = await response.json();
      if (!response.ok || !json?.data) {
        setLocationFeedback(json?.error || "Location not found.");
        return;
      }
      setCompanyForm((current) => ({
        ...current,
        lat: String(json.data.lat),
        lng: String(json.data.lng),
        address: current.address || json.data.formatted_address || ""
      }));
      setLocationCenter({ lat: json.data.lat, lng: json.data.lng });
      setLocationFeedback("Location selected.");
    } catch {
      setLocationFeedback("Error searching location.");
    }
  };

  return (
    <>
      <Modal
        open={open}
        onOpenChange={onOpenChange}
        title="Edit Lead Information"
        description="Update all lead details — company info, sales data, and relationship."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={submitCompanyInfo}
              disabled={updateLeadMutation.isPending}
            >
              {updateLeadMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />}
              Save Changes
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          <ErrorNotice
            error={updateLeadMutation.error}
            fallbackTitle="This lead could not be saved."
            onRetry={() => {
              if (updateLeadMutation.variables) updateLeadMutation.mutate(updateLeadMutation.variables);
            }}
          />
          {validationError && (
            <Badge variant="danger" className="justify-start rounded-lg px-3 py-2 text-left w-full">
              {validationError}
            </Badge>
          )}
          
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">1. Company & Attributes</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Company Name <span className="text-[var(--status-danger)]">*</span>
                </label>
                <div className="flex gap-2">
                  <Input
                    value={companyForm.company_name}
                    onChange={(e) => setCompanyForm((f) => ({ ...f, company_name: e.target.value }))}
                    placeholder="e.g. PT. Asahimas Flat Glass"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={profilingStatus === "researching" || !companyForm.company_name.trim()}
                    onClick={async () => {
                      setProfilingStatus("researching");
                      setProfilingData(null);
                      setProfilingErrorMessage(null);
                      setProfilingElapsed(0);
                      setProfilingFailureReason("ai");
                      try {
                        const res = await apiFetch("/leads/ai-profiling/start", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            company_name: companyForm.company_name.trim(),
                            website: companyForm.website?.trim() || undefined,
                            lead_id: lead?.id,
                          }),
                        });
                        const json = await res.json();
                        if (json.success && json.data) {
                          let currentData = json.data;
                          setProfilingOutputId(currentData.id ?? null);
                          // Poll for as long as the job itself is allowed to run.
                          //
                          // This used to give up after 40s (20 x 2s) — shorter than the
                          // job's normal runtime. AiLeadProfilingService puts a profiling
                          // call at "~20-60s historically" and the job's own $timeout is
                          // 180s, so a perfectly healthy queue routinely blew past the
                          // frontend's patience and the user was told it looked stuck.
                          // Now the give-up point means what it says: the job is past the
                          // deadline it set for itself.
                          let attempts = 0;
                          let consecutiveFailures = 0;
                          const maxAttempts = AI_PROFILING_MAX_ATTEMPTS;
                          const interval = setInterval(async () => {
                            attempts++;
                            setProfilingElapsed(attempts * (AI_PROFILING_POLL_MS / 1000));
                            const statusRes = await apiFetch(`/leads/ai-profiling/${currentData.id}/status`);
                            const statusJson = await statusRes.json();
                            if (statusJson.success && statusJson.data) {
                              consecutiveFailures = 0;
                              currentData = statusJson.data;
                              if (currentData.status === "ready_for_review") {
                                clearInterval(interval);
                                setProfilingStatus("ready_for_review");
                                setProfilingData(currentData.current_output_json);
                                setProfilingErrorMessage(null);
                              } else if (currentData.status === "failed") {
                                clearInterval(interval);
                                setProfilingFailureReason("ai");
                                setProfilingStatus("failed");
                                setProfilingErrorMessage(currentData.current_output_json?.error || currentData.error || null);
                              } else if (attempts >= maxAttempts) {
                                clearInterval(interval);
                                setProfilingStatus("timeout");
                              }
                            } else {
                              // One unreadable poll is not a failed run. The backend
                              // restarts on every deploy, and a status check that lands in
                              // that window used to end the whole thing and tell the user
                              // their company name was the problem. The job itself is
                              // unaffected by any of this — it is running on the server.
                              consecutiveFailures++;
                              if (consecutiveFailures >= AI_PROFILING_MAX_CONSECUTIVE_FAILURES) {
                                clearInterval(interval);
                                setProfilingFailureReason("unreachable");
                                setProfilingStatus("failed");
                                setProfilingErrorMessage(statusJson?.message || "Koneksi ke server terputus.");
                              }
                            }
                          }, AI_PROFILING_POLL_MS);
                        } else {
                          setProfilingFailureReason("unreachable");
                          setProfilingStatus("failed");
                          setProfilingErrorMessage(json?.message || "Gagal memulai request profiling.");
                        }
                      } catch (err: any) {
                        setProfilingFailureReason("unreachable");
                        setProfilingStatus("failed");
                        setProfilingErrorMessage(err?.message || "Koneksi ke server terputus.");
                      }
                    }}
                  >
                    {profilingStatus === "researching" && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                    AI Profiling Start
                  </Button>

                </div>
                <AiProfilingPanel
                  status={profilingStatus}
                  elapsedSeconds={profilingElapsed}
                  failureReason={profilingFailureReason}
                  errorMessage={profilingErrorMessage}
                  slow={profilingElapsed >= AI_PROFILING_SLOW_AFTER_SECONDS}
                  data={profilingData}
                  retryingSync={profilingRetrying}
                  onRetrySync={retryAiProfilingSync}
                  onClose={() => {
                    setProfilingStatus("idle");
                    setProfilingData(null);
                    setProfilingErrorMessage(null);
                  }}
                  onApply={async (pData) => {
                    const resolveIndustryId = () => {
                      if (pData.industry_id) return String(pData.industry_id);
                      const name = (pData.industry_name || pData.industry || "").toLowerCase().trim();
                      if (!name) return companyForm.industry_id;
                      const found = allIndustries.find(
                        (i) => i.name.toLowerCase() === name || (i as any).slug?.toLowerCase() === name
                      );
                      return found ? String(found.id) : companyForm.industry_id;
                    };

                    const resolvedIndId = resolveIndustryId();

                    const resolveSubIndustryId = (indId: string) => {
                      if (pData.sub_industry_id) return String(pData.sub_industry_id);
                      const name = (pData.sub_industry_name || pData.sub_industry || "").toLowerCase().trim();
                      if (!name) return companyForm.sub_industry_id;
                      const ind = allIndustries.find((i) => String(i.id) === indId);
                      const found = ind?.sub_industries?.find(
                        (s) => s.name.toLowerCase() === name || (s as any).slug?.toLowerCase() === name
                      );
                      return found ? String(found.id) : companyForm.sub_industry_id;
                    };

                    const resolveBusinessCategoryId = () => {
                      if (pData.business_category_id) return String(pData.business_category_id);
                      const raw = String(pData.business_category_name || pData.business_category || "").trim();
                      if (!raw) return companyForm.business_category_id;
                      const codeMatch = raw.match(/^\[?([A-Za-z0-9_-]{2,15})\]?\s*(.*)$/);
                      const name = raw.toLowerCase();
                      const cleanAfterCode = codeMatch?.[2]?.trim().toLowerCase() || "";
                      const codeCandidate = codeMatch?.[1]?.trim().toLowerCase() || "";
                      const found = businessCategories.find(
                        (c) =>
                          c.name.toLowerCase() === name ||
                          (cleanAfterCode && c.name.toLowerCase() === cleanAfterCode) ||
                          (codeCandidate && (c.code || "").toLowerCase() === codeCandidate) ||
                          (c as any).slug?.toLowerCase() === name
                      );
                      return found ? String(found.id) : companyForm.business_category_id;
                    };

                    const resolvedSubId = resolveSubIndustryId(resolvedIndId);
                    const resolvedCatId = resolveBusinessCategoryId();

                    const parsedBranches = (() => {
                      if (typeof pData.branch_count === "number") return String(pData.branch_count);
                      if (typeof pData.branch_count === "string") {
                        const m = pData.branch_count.match(/\d+/);
                        if (m) return m[0];
                      }
                      if (Array.isArray(pData.office_locations) && pData.office_locations.length > 0) {
                        return String(pData.office_locations.length);
                      }
                      return companyForm.branch_count;
                    })();

                    const updatedForm = {
                      ...companyForm,
                      company_name: pData.company_name || companyForm.company_name,
                      legal_name: pData.legal_name || pData.company_name || companyForm.legal_name,
                      brand: pData.brand || companyForm.brand,
                      ownership_type: pData.ownership_type || companyForm.ownership_type,
                      year_established: pData.year_established ? String(pData.year_established) : companyForm.year_established,
                      address: pData.address || companyForm.address,
                      phone: pData.phone || companyForm.phone,
                      whatsapp: pData.whatsapp || companyForm.whatsapp,
                      email: pData.email || companyForm.email,
                      website: pData.website || companyForm.website,
                      lat: pData.lat ? String(pData.lat) : companyForm.lat,
                      lng: pData.lng ? String(pData.lng) : companyForm.lng,
                      industry_id: resolvedIndId,
                      sub_industry_id: resolvedSubId,
                      business_category_id: resolvedCatId,
                      company_size_estimate: pData.company_size || pData.company_size_estimate || companyForm.company_size_estimate,
                      operational_scope: pData.operational_area_type || companyForm.operational_scope,
                      branch_count: parsedBranches,
                      customer_story: pData.customer_story || companyForm.customer_story,
                    };

                    setAppliedProfileJson(pData);
                    setCompanyForm(updatedForm);

                    if (pData.lat && pData.lng) {
                      setLocationCenter({ lat: Number(pData.lat), lng: Number(pData.lng) });
                    }

                    // If editing an existing lead, persist directly to DB so data is never lost!
                    if (lead?.id) {
                      try {
                        const payload = {
                          company_name: updatedForm.company_name.trim(),
                          legal_name: updatedForm.legal_name.trim() || null,
                          brand: updatedForm.brand.trim() || null,
                          ownership_type: updatedForm.ownership_type.trim() || null,
                          year_established: updatedForm.year_established.trim() || null,
                          address: updatedForm.address.trim() || null,
                          lat: updatedForm.lat ? Number(updatedForm.lat) : null,
                          lng: updatedForm.lng ? Number(updatedForm.lng) : null,
                          industry_id: updatedForm.industry_id ? Number(updatedForm.industry_id) : null,
                          sub_industry_id: updatedForm.sub_industry_id ? Number(updatedForm.sub_industry_id) : null,
                          phone: updatedForm.phone.trim() || null,
                          whatsapp: updatedForm.whatsapp.trim() || null,
                          email: updatedForm.email.trim() || null,
                          website: updatedForm.website.trim() ? (updatedForm.website.trim().startsWith('http') ? updatedForm.website.trim() : `https://${updatedForm.website.trim()}`) : null,
                          company_size_estimate: updatedForm.company_size_estimate || null,
                          operational_scope: updatedForm.operational_scope.trim() || null,
                          branch_count: updatedForm.branch_count ? Number(updatedForm.branch_count) : null,
                          customer_story: updatedForm.customer_story.trim() || null,
                          ai_profile_json: pData,
                          ai_profiling_output_id: profilingOutputId,
                          business_category_id: updatedForm.business_category_id || null,
                          product_id: updatedForm.product_id ? Number(updatedForm.product_id) : null,
                          estimated_closing_amount: updatedForm.estimated_closing_amount ? Number(updatedForm.estimated_closing_amount) : null,
                          realized_closing_amount: updatedForm.realized_closing_amount ? Number(updatedForm.realized_closing_amount) : null,
                          source_type: updatedForm.source_type || null,
                          channel_type_id: updatedForm.channel_type_id ? Number(updatedForm.channel_type_id) : null,
                          funnel_stage_id: updatedForm.funnel_stage_id ? Number(updatedForm.funnel_stage_id) : null,
                          qualification_status: updatedForm.qualification_status || null,
                          parent_lead_id: updatedForm.parent_lead_id ? Number(updatedForm.parent_lead_id) : null,
                          owner_id: updatedForm.owner_id ? Number(updatedForm.owner_id) : null,
                          presales_owner_id: updatedForm.presales_owner_id ? Number(updatedForm.presales_owner_id) : null,
                          am_owner_id: updatedForm.am_owner_id ? Number(updatedForm.am_owner_id) : null,
                          csm_owner_id: updatedForm.csm_owner_id ? Number(updatedForm.csm_owner_id) : null,
                        };

                        const res = await apiFetch(`/leads/${lead.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(payload),
                        });

                        if (res.ok) {
                          qc.invalidateQueries({ queryKey: ['leads'] });
                          qc.invalidateQueries({ queryKey: ['lead', lead.id] });
                          qc.invalidateQueries({ queryKey: ['lead', String(lead.id)] });
                          toast.success("AI Deep Profile, lokasi cabang, & Presales Playbook berhasil disimpan!");
                          setProfilingStatus("applied");
                          return;
                        }
                      } catch (err: any) {
                        console.error("Auto-save profiling error", err);
                      }
                    }

                    setProfilingStatus("applied");
                    toast.success("AI profiling applied to form! Click 'Save Changes' to finalize.");
                  }}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Legal Entity Name
                </label>
                <Input
                  value={companyForm.legal_name}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, legal_name: e.target.value }))}
                  placeholder="e.g. PT Asahimas Flat Glass Tbk"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Brand
                </label>
                <Input
                  value={companyForm.brand}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, brand: e.target.value }))}
                  placeholder="e.g. Asahimas"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Ownership Type
                </label>
                <Input
                  value={companyForm.ownership_type}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, ownership_type: e.target.value }))}
                  placeholder="Swasta / BUMN / PMA / Tbk"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Year Est.
                  </label>
                  <Input
                    value={companyForm.year_established}
                    onChange={(e) => setCompanyForm((f) => ({ ...f, year_established: e.target.value }))}
                    placeholder="e.g. 1971"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Operational Scope
                  </label>
                  <Input
                    value={companyForm.operational_scope}
                    onChange={(e) => setCompanyForm((f) => ({ ...f, operational_scope: e.target.value }))}
                    placeholder="Nasional / Regional"
                  />
                </div>
              </div>
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

              <div className="sm:col-span-2 space-y-3 rounded-xl border border-border bg-[color:var(--surface-subtle)] p-3">
                <div className="flex flex-col gap-2 md:flex-row">
                  <Input
                    value={locationSearch}
                    onChange={(event) => setLocationSearch(event.target.value)}
                    placeholder="Search address, building, or area"
                  />
                  <Button type="button" onClick={handleLocationSearch}>
                    <MapPin className="h-4 w-4 mr-2" />
                    Search Location
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {locationFeedback ? <Badge variant="info">{locationFeedback}</Badge> : null}
                  <span className="text-xs text-muted-foreground">
                    {companyForm.lat && companyForm.lng
                      ? `${companyForm.lat}, ${companyForm.lng}`
                      : "No coordinates selected"}
                  </span>
                </div>
                <div className="h-[180px] overflow-hidden rounded-xl border border-border bg-background">
                  {mapsEnabled && mapsApiKey ? (
                    <APIProvider apiKey={mapsApiKey}>
                      <Map
                        mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "DEMO_MAP_ID"}
                        center={locationCenter}
                        defaultCenter={locationCenter}
                        defaultZoom={companyForm.lat && companyForm.lng ? 15 : 11}
                        gestureHandling="greedy"
                        disableDefaultUI={true}
                      >
                        {companyForm.lat && companyForm.lng ? (
                          <AdvancedMarker position={locationCenter}>
                            <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-background bg-[color:var(--brand)] text-white shadow-lg">
                              <MapPin className="h-4 w-4" />
                            </div>
                          </AdvancedMarker>
                        ) : null}
                      </Map>
                    </APIProvider>
                  ) : (
                    <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
                      Maps unavailable. Configure Google Maps API Key in Public Settings.
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Industry</label>
                <Select
                  value={companyForm.industry_id}
                  onChange={(e) => {
                    if (e.target.value === '__CREATE_NEW__') {
                      setCreateNewModalConfig({
                        isOpen: true,
                        title: 'Create New Industry',
                        endpoint: '/industries',
                        onSuccess: (newItem) => {
                          qc.invalidateQueries({ queryKey: ['industries'] });
                          setCompanyForm((f) => ({ ...f, industry_id: String(newItem.id), sub_industry_id: '' }));
                        }
                      });
                    } else {
                      setCompanyForm((f) => ({ ...f, industry_id: e.target.value, sub_industry_id: '' }));
                    }
                  }}
                  placeholder="— Select industry —"
                >
                  {allIndustries.map((ind) => (
                    <option key={ind.id} value={String(ind.id)}>{ind.name}</option>
                  ))}
                  <option value="__CREATE_NEW__" className="font-bold text-[var(--brand)]">+ Create New...</option>
                </Select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Sub-Industry</label>
                <Select
                  value={companyForm.sub_industry_id}
                  onChange={(e) => {
                    if (e.target.value === '__CREATE_NEW__') {
                      setCreateNewModalConfig({
                        isOpen: true,
                        title: 'Create New Sub-Industry',
                        endpoint: `/industries/${companyForm.industry_id}/sub-industries`,
                        onSuccess: (newItem) => {
                          qc.invalidateQueries({ queryKey: ['industries'] });
                          setCompanyForm((f) => ({ ...f, sub_industry_id: String(newItem.id) }));
                        }
                      });
                    } else {
                      setCompanyForm((f) => ({ ...f, sub_industry_id: e.target.value }));
                    }
                  }}
                  placeholder="— Select sub-industry —"
                  disabled={!companyForm.industry_id}
                >
                  {selectedIndustrySubIndustries.map((sub) => (
                    <option key={sub.id} value={String(sub.id)}>{sub.name}</option>
                  ))}
                  {companyForm.industry_id && (
                    <option value="__CREATE_NEW__" className="font-bold text-[var(--brand)]">+ Create New...</option>
                  )}
                </Select>
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
              
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Business Category / #LOB</label>
                <Select
                  value={companyForm.business_category_id}
                  onChange={(e) => {
                    if (e.target.value === '__CREATE_NEW__') {
                      setCreateNewModalConfig({
                        isOpen: true,
                        title: 'Create New Business Category',
                        endpoint: '/business-categories',
                        additionalPayload: companyForm.industry_id
                          ? { industry_id: Number(companyForm.industry_id) }
                          : undefined,
                        onSuccess: (newItem) => {
                          qc.invalidateQueries({ queryKey: ['business-categories'] });
                          setCompanyForm((f) => ({ ...f, business_category_id: String(newItem.id) }));
                        }
                      });
                    } else {
                      setCompanyForm((f) => ({ ...f, business_category_id: e.target.value }));
                    }
                  }}
                  placeholder="— Select category —"
                >
                  {businessCategories
                    .filter(
                      (cat) =>
                        !companyForm.industry_id ||
                        !cat.industry_id ||
                        String(cat.industry_id) === String(companyForm.industry_id) ||
                        String(cat.id) === String(companyForm.business_category_id)
                    )
                    .map((cat) => (
                      <option key={cat.id} value={String(cat.id)}>
                        {cat.code ? `[${cat.code}] ` : ''}{cat.name}
                      </option>
                    ))}
                  <option value="__CREATE_NEW__" className="font-bold text-[var(--brand)]">+ Create New...</option>
                </Select>
                {(() => {
                  const activeCat = businessCategories.find(
                    (c) => String(c.id) === String(companyForm.business_category_id)
                  );
                  if (!activeCat) return null;
                  if (activeCat.channel_role === 'direct_b2c') {
                    return (
                      <p className="mt-1.5 text-xs text-[color:var(--info)]">
                        Segmen B2C / Private Client — Nama klien individu atau kediaman pribadi diperbolehkan.
                      </p>
                    );
                  }
                  if (activeCat.channel_role === 'partner_influencer') {
                    return (
                      <p className="mt-1.5 text-xs text-[color:var(--brand)]">
                        Business Partner / Influencer — Membuka peluang spesifikasi proyek lintas segmen.
                      </p>
                    );
                  }
                  if (activeCat.channel_role === 'indirect_contract') {
                    return (
                      <p className="mt-1.5 text-xs text-[color:var(--warning)]">
                        Indirect Contract / Leasing — Penjualan melalui manajemen kontrak atau lembaga pembiayaan.
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">2. Contact Info</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Company Phone</label>
                <Input
                  type="tel"
                  value={companyForm.phone}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+62 31 7882383"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">WhatsApp</label>
                <Input
                  type="tel"
                  value={companyForm.whatsapp}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, whatsapp: e.target.value }))}
                  placeholder="+62 811 9876 543"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Company Email</label>
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
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">3. Sales & Status</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Estimated Closing Amount</label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={formatAmountInput(companyForm.estimated_closing_amount)}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, estimated_closing_amount: normalizeAmountInput(e.target.value) }))}
                  placeholder={`e.g. ${formatAmountInput("15000000")}`}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Realized Closing Amount</label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={formatAmountInput(companyForm.realized_closing_amount)}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, realized_closing_amount: normalizeAmountInput(e.target.value) }))}
                  placeholder={`e.g. ${formatAmountInput("12000000")}`}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Initial Product</label>
                <Select
                  value={companyForm.product_id}
                  onChange={(e) => {
                    if (e.target.value === '__CREATE_NEW__') {
                      setCreateNewModalConfig({
                        isOpen: true,
                        title: 'Create New Product',
                        endpoint: '/products',
                        onSuccess: (newItem) => {
                          qc.invalidateQueries({ queryKey: ['products'] });
                          setCompanyForm((f) => ({ ...f, product_id: String(newItem.id) }));
                        }
                      });
                    } else {
                      setCompanyForm((f) => ({ ...f, product_id: e.target.value }));
                    }
                  }}
                  placeholder="— Select product —"
                >
                  {products.map((p) => (
                    <option key={p.id} value={String(p.id)}>{p.name}</option>
                  ))}
                  <option value="__CREATE_NEW__" className="font-bold text-[var(--brand)]">+ Create New...</option>
                </Select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Funnel Stage</label>
                <Select
                  value={companyForm.funnel_stage_id}
                  onChange={(e) => {
                    if (e.target.value === '__CREATE_NEW__') {
                      setCreateNewModalConfig({
                        isOpen: true,
                        title: 'Create New Funnel Stage',
                        endpoint: '/funnel/stages',
                        onSuccess: (newItem) => {
                          qc.invalidateQueries({ queryKey: ['funnel-stages'] });
                          setCompanyForm((f) => ({ ...f, funnel_stage_id: String(newItem.id) }));
                        }
                      });
                    } else {
                      setCompanyForm((f) => ({ ...f, funnel_stage_id: e.target.value }));
                    }
                  }}
                  placeholder="— Unassigned —"
                >
                  {funnelStages.map((stage) => (
                    <option key={stage.id} value={String(stage.id)}>{stage.name}</option>
                  ))}
                  <option value="__CREATE_NEW__" className="font-bold text-[var(--brand)]">+ Create New...</option>
                </Select>
              </div>
              
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Qualification</label>
                <Select
                  value={companyForm.qualification_status}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, qualification_status: e.target.value }))}
                  placeholder="— Status —"
                >
                  <option value="pending">Pending</option>
                  <option value="eligible">Eligible</option>
                  <option value="potential">Potential</option>
                  <option value="not_eligible">Not Eligible</option>
                </Select>
              </div>
              
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Lead Source</label>
                <Select
                  value={companyForm.source_type}
                  onChange={(e) => {
                    if (e.target.value === '__CREATE_NEW__') {
                      setCreateNewModalConfig({
                        isOpen: true,
                        title: 'Create New Lead Source',
                        endpoint: '/settings/lead-sources',
                        onSuccess: (newItem) => {
                          qc.invalidateQueries({ queryKey: ['lead-source-types'] });
                          setCompanyForm((f) => ({ ...f, source_type: newItem.slug ?? '', channel_type_id: '' }));
                        }
                      });
                    } else {
                      setCompanyForm((f) => ({ ...f, source_type: e.target.value, channel_type_id: '' }));
                    }
                  }}
                  placeholder="— Select source —"
                >
                  {activeLeadSources.map((src) => (
                    <option key={src.id} value={src.slug}>{src.name}</option>
                  ))}
                  <option value="__CREATE_NEW__" className="font-bold text-[var(--brand)]">+ Create New...</option>
                </Select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Lead Channel</label>
                <Select
                  value={companyForm.channel_type_id}
                  onChange={(e) => {
                    if (e.target.value === '__CREATE_NEW__') {
                      setCreateNewModalConfig({
                        isOpen: true,
                        title: 'Create New Lead Channel',
                        endpoint: '/settings/lead-channels',
                        additionalPayload: selectedLeadSource ? { lead_source_type_id: selectedLeadSource.id } : undefined,
                        onSuccess: (newItem) => {
                          qc.invalidateQueries({ queryKey: ['lead-source-types'] });
                          setCompanyForm((f) => ({ ...f, channel_type_id: String(newItem.id) }));
                        }
                      });
                    } else {
                      setCompanyForm((f) => ({ ...f, channel_type_id: e.target.value }));
                    }
                  }}
                  placeholder={companyForm.source_type ? "— Select channel —" : "— Select a source first —"}
                  disabled={!companyForm.source_type}
                >
                  {activeLeadChannels.map((ch) => (
                    <option key={ch.id} value={String(ch.id)}>{ch.name}</option>
                  ))}
                  {companyForm.source_type && (
                    <option value="__CREATE_NEW__" className="font-bold text-[var(--brand)]">+ Create New...</option>
                  )}
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">4. Ownership Roles</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Sales Owner</label>
                <Select
                  value={companyForm.owner_id || ""}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, owner_id: e.target.value }))}
                >
                  <option value="">-- Lead Pool --</option>
                  {salesUsers.map((u) => (
                    <option key={u.id} value={String(u.id)}>{u.name}</option>
                  ))}
                  {salesUsers.length === 0 && <option value="" disabled>Loading users...</option>}
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Presales Owner</label>
                <Select
                  value={companyForm.presales_owner_id || ""}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, presales_owner_id: e.target.value }))}
                >
                  <option value="">-- Unassigned --</option>
                  {presalesUsers.map((u) => (
                    <option key={u.id} value={String(u.id)}>{u.name}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Account Manager</label>
                <Select
                  value={companyForm.am_owner_id || ""}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, am_owner_id: e.target.value }))}
                >
                  <option value="">-- Unassigned --</option>
                  {amUsers.map((u) => (
                    <option key={u.id} value={String(u.id)}>{u.name}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">CSM Owner</label>
                <Select
                  value={companyForm.csm_owner_id || ""}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, csm_owner_id: e.target.value }))}
                >
                  <option value="">-- Unassigned --</option>
                  {csmUsers.map((u) => (
                    <option key={u.id} value={String(u.id)}>{u.name}</option>
                  ))}
                </Select>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">5. Group Company</p>
            <div className="grid gap-2">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Subsidiary of (Parent Company)</label>
              {companyForm.parent_lead_id ? (
                <div className="flex items-center gap-2 rounded-lg border border-[var(--brand)]/30 bg-[color-mix(in_oklch,var(--brand)_8%,transparent)] px-3 py-2">
                  <Building2 className="h-4 w-4 shrink-0 text-[var(--brand)]" />
                  <span className="flex-1 text-sm font-medium">
                    {parentLeadResults.find((r) => String(r.id) === companyForm.parent_lead_id)?.company_name
                      ?? lead?.parent_lead?.company_name
                      ?? `Lead #${companyForm.parent_lead_id}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => { setCompanyForm(f => ({ ...f, parent_lead_id: '' })); setParentLeadSearch(''); }}
                    className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={parentLeadSearch}
                    onChange={(e) => setParentLeadSearch(e.target.value)}
                    placeholder="Search company name…"
                    className="pl-9"
                  />
                  {parentLeadSearching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  {parentLeadResults.length > 0 && (
                    <div className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-card shadow-lg">
                      {parentLeadResults
                        .filter((r) => String(r.id) !== String(lead?.id))
                        .map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => { setCompanyForm(f => ({ ...f, parent_lead_id: String(r.id) })); setParentLeadSearch(''); }}
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

      <CreateNewModal
        isOpen={createNewModalConfig.isOpen}
        onClose={() => setCreateNewModalConfig(c => ({ ...c, isOpen: false }))}
        title={createNewModalConfig.title}
        endpoint={createNewModalConfig.endpoint}
        additionalPayload={createNewModalConfig.additionalPayload}
        onSuccess={createNewModalConfig.onSuccess || (() => {})}
      />
    </>
  );
}
