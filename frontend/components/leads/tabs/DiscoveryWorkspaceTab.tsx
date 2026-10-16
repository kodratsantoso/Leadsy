"use client";

import { useEffect, useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sparkles,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  Building2,
  Cpu,
  Users,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Edit3,
  Check,
} from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { ErrorNotice } from "@/components/ui/error-notice";
import { cn } from "@/lib/utils";

type ProvenanceType = "confirmed" | "assumption" | "ai_suggested" | "unspecified";

type StandardSectionMeta = {
  label: string;
  category: "business" | "technical" | "governance" | "risk";
  required: boolean;
  description: string;
};

type ChecklistItem = {
  key: string;
  label: string;
  category: string;
  required: boolean;
  description?: string;
  status: "completed" | "incomplete";
  provenance: ProvenanceType;
  value?: any;
};

type DiscoveryEvaluation = {
  score: number;
  is_ready_for_solution_design: boolean;
  completed_count: number;
  total_count: number;
  missing_required: string[];
  checklist: ChecklistItem[];
  provenance_counts: {
    confirmed: number;
    assumption: number;
    ai_suggested: number;
    unspecified: number;
  };
  bantc_status: {
    budget: string | null;
    authority: string | null;
    needs: string | null;
    timeline: string | null;
    competitor: string | null;
    sources: Record<string, string>;
  };
};

type DiscoveryResponse = {
  data: {
    id: number | null;
    lead_id: number;
    sections: Record<string, string>;
    field_sources: Record<string, ProvenanceType>;
    qualification_status: "unqualified" | "in_progress" | "qualified" | "disqualified";
    completeness_score: number;
    last_validated_at: string | null;
    updated_at: string | null;
  };
  evaluation: DiscoveryEvaluation;
  standard_sections: Record<string, StandardSectionMeta>;
};

interface DiscoveryWorkspaceTabProps {
  leadId: number | string;
  lead?: any;
}

const CATEGORY_META = {
  business: {
    label: "Business Context & Goals",
    icon: Building2,
    badgeVariant: "brand" as const,
  },
  technical: {
    label: "Technical & Systems Architecture",
    icon: Cpu,
    badgeVariant: "info" as const,
  },
  governance: {
    label: "Stakeholders & Governance",
    icon: Users,
    badgeVariant: "neutral" as const,
  },
  risk: {
    label: "Assumptions, Dependencies & Open Questions",
    icon: AlertTriangle,
    badgeVariant: "warning" as const,
  },
};

export function DiscoveryWorkspaceTab({ leadId, lead }: DiscoveryWorkspaceTabProps) {
  const qc = useQueryClient();
  const toast = useToast();

  const [sections, setSections] = useState<Record<string, string>>({});
  const [fieldSources, setFieldSources] = useState<Record<string, ProvenanceType>>({});
  const [qualificationStatus, setQualificationStatus] = useState<string>("in_progress");
  const [isDirty, setIsDirty] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const [bantc, setBantc] = useState<{
    budget: string;
    authority: string;
    needs: string;
    timeline: string;
    competitor: string;
  }>({
    budget: "",
    authority: "",
    needs: "",
    timeline: "",
    competitor: "",
  });
  const [isEditingBantc, setIsEditingBantc] = useState(false);

  const { data, isLoading, error, refetch } = useQuery<DiscoveryResponse>({
    queryKey: ["lead-discovery", leadId],
    queryFn: async () => {
      const res = await apiFetch(`/leads/${leadId}/discovery`);
      if (!res.ok) {
        throw new Error(`Failed to load discovery workspace (${res.status})`);
      }
      return res.json();
    },
  });

  useEffect(() => {
    if (data?.data) {
      setSections(data.data.sections || {});
      setFieldSources(data.data.field_sources || {});
      setQualificationStatus(data.data.qualification_status || "in_progress");
      if (data.evaluation?.bantc_status) {
        setBantc({
          budget: data.evaluation.bantc_status.budget || "",
          authority: data.evaluation.bantc_status.authority || "",
          needs: data.evaluation.bantc_status.needs || "",
          timeline: data.evaluation.bantc_status.timeline || "",
          competitor: data.evaluation.bantc_status.competitor || "",
        });
      }
      setIsDirty(false);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch(`/leads/${leadId}/discovery`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sections,
          field_sources: fieldSources,
          qualification_status: qualificationStatus,
          bantc,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.message || `Save failed (${res.status})`);
      }

      return res.json();
    },
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["lead-discovery", leadId] });
      qc.invalidateQueries({ queryKey: ["lead", leadId] });
      setIsDirty(false);
      setIsEditingBantc(false);
      toast.success(
        "Discovery Workspace Saved",
        `Completeness score updated to ${updated.evaluation?.score ?? 0}%.`
      );
    },
    onError: (err: any) => {
      toast.error("Save Failed", err?.message || "Could not persist discovery record.");
    },
  });

  const handleSectionChange = (key: string, value: string) => {
    setSections((prev) => ({ ...prev, [key]: value }));
    // If not set yet, set default provenance to confirmed if user types
    if (!fieldSources[key]) {
      setFieldSources((prev) => ({ ...prev, [key]: "confirmed" }));
    }
    setIsDirty(true);
  };

  const handleProvenanceChange = (key: string, provenance: ProvenanceType) => {
    setFieldSources((prev) => ({ ...prev, [key]: provenance }));
    setIsDirty(true);
  };

  const standardSections = data?.standard_sections || {};
  const evaluation = data?.evaluation;

  // Group sections by category
  const groupedSections = useMemo(() => {
    const groups: Record<string, Array<{ key: string; meta: StandardSectionMeta }>> = {
      business: [],
      technical: [],
      governance: [],
      risk: [],
    };

    Object.entries(standardSections).forEach(([key, meta]) => {
      if (groups[meta.category]) {
        groups[meta.category].push({ key, meta });
      }
    });

    return groups;
  }, [standardSections]);

  const scoreBadgeVariant = (score: number) => {
    if (score >= 80) return "success" as const;
    if (score >= 50) return "warning" as const;
    return "neutral" as const;
  };

  const provenanceBadge = (prov: string | ProvenanceType | undefined) => {
    switch (prov) {
      case "confirmed":
      case "manual":
        return { label: "Confirmed Fact", variant: "success" as const };
      case "assumption":
        return { label: "Assumption", variant: "warning" as const };
      case "ai":
      case "ai_suggested":
        return { label: "AI Extracted", variant: "brand" as const };
      default:
        return { label: "Unspecified", variant: "neutral" as const };
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-6">
        <ErrorNotice error={error} fallbackTitle="Failed to load discovery workspace" onRetry={() => refetch()} />
      </div>
    );
  }

  const score = evaluation?.score ?? 0;
  const isReady = evaluation?.is_ready_for_solution_design ?? false;

  return (
    <div className="space-y-6">
      {/* Top Header & Status Bar */}
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl">Presales Discovery & Qualification</CardTitle>
              <Badge variant={scoreBadgeVariant(score)} className="text-xs font-semibold">
                {score}% Complete
              </Badge>
              {isReady ? (
                <Badge variant="success" className="gap-1 text-xs">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Ready for Solution Design
                </Badge>
              ) : (
                <Badge variant="neutral" className="gap-1 text-xs">
                  <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  Gaps to Resolve
                </Badge>
              )}
            </div>
            <CardDescription className="mt-1">
              Structured customer objectives, current systems, non-functional requirements, and risks to establish traceable solution architecture.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Qualification:</span>
              <Select
                value={qualificationStatus}
                onChange={(e) => {
                  setQualificationStatus(e.target.value);
                  setIsDirty(true);
                }}
                className="h-9 w-36 text-xs"
              >
                <option value="in_progress">In Progress</option>
                <option value="qualified">Qualified</option>
                <option value="unqualified">Unqualified</option>
                <option value="disqualified">Disqualified</option>
              </Select>
            </div>

            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !isDirty}
              className="gap-2"
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isDirty ? "Save Changes" : "Saved"}
            </Button>
          </div>
        </CardHeader>

        {/* Provenance breakdown metrics */}
        <CardContent className="border-t border-border pt-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/20 p-3">
              <CheckCircle2 className="h-4 w-4 text-[color:var(--status-success)]" />
              <div>
                <p className="text-xs text-muted-foreground">Confirmed Facts</p>
                <p className="text-sm font-semibold">{evaluation?.provenance_counts.confirmed ?? 0} items</p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/20 p-3">
              <AlertTriangle className="h-4 w-4 text-[color:var(--status-warning)]" />
              <div>
                <p className="text-xs text-muted-foreground">Assumptions</p>
                <p className="text-sm font-semibold">{evaluation?.provenance_counts.assumption ?? 0} items</p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/20 p-3">
              <Sparkles className="h-4 w-4 text-[color:var(--brand)]" />
              <div>
                <p className="text-xs text-muted-foreground">AI Draft Suggestions</p>
                <p className="text-sm font-semibold">{evaluation?.provenance_counts.ai_suggested ?? 0} items</p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/20 p-3">
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Missing / Gaps</p>
                <p className="text-sm font-semibold">{evaluation?.missing_required.length ?? 0} required</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* BANTC Live Synchronized & Editable Qualification Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">BANTC Commercial Qualification & Clarification</CardTitle>
              <Badge variant="outline" className="text-[11px]">
                Synchronized with Lead Profile
              </Badge>
              {isEditingBantc && (
                <Badge variant="brand" className="text-[10px]">
                  Editing Mode
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={isEditingBantc ? "default" : "outline"}
                size="xs"
                onClick={() => setIsEditingBantc((v) => !v)}
              >
                <Edit3 className="mr-1.5 h-3.5 w-3.5" />
                {isEditingBantc ? "View Snapshot" : "Edit BANTC"}
              </Button>
            </div>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Synchronized single source of truth for commercial qualification. AI extractions from meeting transcripts can be reviewed, edited, or confirmed directly below.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              {
                key: "budget" as const,
                label: "Budget",
                icon: "💰",
                placeholder: "e.g. Rp 500 Juta - Rp 1 Milyar",
              },
              {
                key: "authority" as const,
                label: "Authority",
                icon: "👑",
                placeholder: "e.g. CTO & Procurement Head",
              },
              {
                key: "needs" as const,
                label: "Needs",
                icon: "🎯",
                placeholder: "e.g. ERP overhaul & WhatsApp API",
              },
              {
                key: "timeline" as const,
                label: "Timeline",
                icon: "📅",
                placeholder: "e.g. Deployment Q1 2027",
              },
              {
                key: "competitor" as const,
                label: "Competitor",
                icon: "⚔️",
                placeholder: "e.g. Vendor Incumbent / SAP / Lark",
              },
            ].map((col) => {
              const rawSource = evaluation?.bantc_status?.sources?.[col.key];
              const sourceLabel = rawSource || "auto";
              const isAi = rawSource === "ai" || rawSource === "ai_suggested";

              return (
                <div
                  key={col.key}
                  className={cn(
                    "rounded-xl border p-3 transition-colors",
                    isEditingBantc ? "border-brand/40 bg-card" : "border-border bg-muted/10"
                  )}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                      <span>{col.icon}</span>
                      <span>{col.label}</span>
                    </span>
                    <Badge variant={provenanceBadge(rawSource).variant} className="text-[10px]">
                      {isAi ? "AI Meeting" : (rawSource === "manual" ? "Confirmed" : sourceLabel)}
                    </Badge>
                  </div>

                  {isEditingBantc ? (
                    <div className="mt-2 space-y-1.5">
                      <Textarea
                        rows={3}
                        className="text-xs resize-none min-h-[72px]"
                        value={bantc[col.key]}
                        onChange={(e) => {
                          setBantc((prev) => ({ ...prev, [col.key]: e.target.value }));
                          setIsDirty(true);
                        }}
                        placeholder={col.placeholder}
                      />
                    </div>
                  ) : (
                    <div className="mt-1.5">
                      <p className="text-sm font-medium line-clamp-3" title={bantc[col.key] || undefined}>
                        {bantc[col.key] || (
                          <span className="text-xs italic text-muted-foreground">Not defined yet</span>
                        )}
                      </p>
                      {isAi && bantc[col.key] && (
                        <div className="mt-2 flex items-center justify-between border-t border-border/50 pt-1.5">
                          <span className="text-[10px] text-muted-foreground">From transcript</span>
                          <button
                            type="button"
                            className="text-[10px] font-semibold text-[color:var(--brand)] hover:underline"
                            onClick={() => setIsEditingBantc(true)}
                          >
                            Clarify / Edit
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Category filter tabs */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={activeCategory === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveCategory("all")}
        >
          All Sections ({Object.keys(standardSections).length})
        </Button>
        {Object.entries(CATEGORY_META).map(([catKey, catMeta]) => {
          const Icon = catMeta.icon;
          const count = groupedSections[catKey]?.length || 0;
          return (
            <Button
              key={catKey}
              variant={activeCategory === catKey ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveCategory(catKey)}
              className="gap-1.5"
            >
              <Icon className="h-3.5 w-3.5" />
              {catMeta.label} ({count})
            </Button>
          );
        })}
      </div>

      {/* Discovery Section Forms */}
      <div className="space-y-6">
        {Object.entries(groupedSections).map(([catKey, sectionList]) => {
          if (activeCategory !== "all" && activeCategory !== catKey) return null;
          const catMeta = CATEGORY_META[catKey as keyof typeof CATEGORY_META];
          const Icon = catMeta.icon;

          return (
            <Card key={catKey}>
              <CardHeader className="border-b border-border py-4">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-[color:var(--brand)]" />
                  <CardTitle className="text-base">{catMeta.label}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="divide-y divide-border p-0">
                {sectionList.map(({ key, meta }) => {
                  const currentValue = sections[key] || "";
                  const currentProvenance = fieldSources[key] || "unspecified";
                  const isMissing = meta.required && !currentValue.trim();

                  return (
                    <div key={key} className="space-y-2 p-5 transition-colors hover:bg-muted/5">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <label className="text-sm font-semibold">{meta.label}</label>
                            {meta.required ? (
                              <Badge variant="danger" className="text-[10px]">
                                Required
                              </Badge>
                            ) : (
                              <Badge variant="neutral" className="text-[10px]">
                                Optional
                              </Badge>
                            )}
                            {isMissing && (
                              <span className="text-xs text-[color:var(--status-danger)] font-medium">
                                • Gap to complete
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{meta.description}</p>
                        </div>

                        {/* Provenance selector */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Provenance:</span>
                          <Select
                            value={currentProvenance}
                            onChange={(e) => handleProvenanceChange(key, e.target.value as ProvenanceType)}
                            className="h-8 w-44 text-xs"
                          >
                            <option value="confirmed">Confirmed Fact</option>
                            <option value="assumption">Assumption</option>
                            <option value="ai_suggested">AI Suggested</option>
                            <option value="unspecified">Unspecified</option>
                          </Select>
                        </div>
                      </div>

                      <Textarea
                        rows={3}
                        value={currentValue}
                        onChange={(e) => handleSectionChange(key, e.target.value)}
                        placeholder={`Enter ${meta.label.toLowerCase()}...`}
                        className={cn(
                          "mt-2 text-sm",
                          isMissing && "border-[color:var(--status-danger)]/40 focus-visible:border-[color:var(--status-danger)]"
                        )}
                      />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
