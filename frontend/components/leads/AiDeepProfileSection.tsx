"use client";

import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  AlertTriangle,
  BrainCircuit,
  Building2,
  CheckCircle2,
  ExternalLink,
  Factory,
  FileCheck2,
  Globe,
  HelpCircle,
  Layers,
  Loader2,
  RotateCw,
  Sparkles,
  Target,
  Users,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/apiFetch";
import { describeThrown, readApiError } from "@/lib/apiError";
import { toDisplayList, toDisplayText } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import type { ProfilingData } from "@/components/leads/AiProfilingPanel";

export interface AiDeepProfileSectionProps {
  leadId: string;
  leadData: any;
  onLeadChanged: () => void;
}

export function AiDeepProfileSection({
  leadId,
  leadData,
  onLeadChanged,
}: AiDeepProfileSectionProps) {
  const toast = useToast();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const profile: ProfilingData | null =
    leadData?.ai_profile_json && typeof leadData.ai_profile_json === "object"
      ? (leadData.ai_profile_json as ProfilingData)
      : null;

  const salesNotes = profile?.sales_notes ?? {};
  const departments = toDisplayList(salesNotes.departments_to_approach);
  const painPoints = toDisplayList(salesNotes.pain_points);
  const potentialNeeds = toDisplayList(salesNotes.potential_needs);
  const solutionAngles = toDisplayList(salesNotes.solution_angles);
  const discoveryQuestions = toDisplayList(salesNotes.discovery_questions);
  const secondaryIndustries = toDisplayList(profile?.secondary_industries);
  const productBrands = toDisplayList(profile?.product_brands);

  const discrepancies = Array.isArray(profile?.discrepancies) ? profile!.discrepancies : [];
  const sourceValidation = Array.isArray(profile?.source_validation) ? profile!.source_validation : [];
  const rawSources = Array.from(
    new Set([
      ...toDisplayList(profile?.sources),
      ...toDisplayList(profile?.evidence?.website_sources),
    ])
  );

  const entitySelectionNote = toDisplayText(profile?.entity_selection_note);
  const primarySector = toDisplayText(profile?.primary_sector);
  const verticalText = toDisplayText(profile?.vertical);
  const businessModelText = toDisplayText(profile?.business_model);
  const presalesPerspectiveText = toDisplayText(profile?.presales_perspective);
  const coreProductText = toDisplayText(profile?.core_product);
  const specializationText = toDisplayText(profile?.specialization);
  const corporateStructureText = toDisplayText(profile?.corporate_structure);
  const manufacturingCapabilityText = toDisplayText(profile?.manufacturing_capability);
  const certificationsText = toDisplayText(profile?.certifications_or_registrations);

  const hasPlaybook =
    Boolean(presalesPerspectiveText) ||
    departments.length > 0 ||
    painPoints.length > 0 ||
    potentialNeeds.length > 0 ||
    solutionAngles.length > 0 ||
    discoveryQuestions.length > 0;

  const runDeepProfileMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch(`/leads/${leadId}/ai-profiling/run`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await readApiError(res, "Gagal menjalankan AI Deep Profiling.");
        throw new Error(err.detail ? `${err.title}: ${err.detail}` : err.title);
      }
      return res.json();
    },
    onSuccess: (json) => {
      const msg = json?.message || "AI Deep Profiling berhasil diperbarui.";
      setFeedback({ type: "success", text: msg });
      toast.success(msg);
      onLeadChanged();
    },
    onError: (err: unknown) => {
      const msg = describeThrown(err).title;
      setFeedback({ type: "error", text: msg });
      toast.error(msg);
    },
  });

  const syncPlaybookMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch(`/leads/${leadId}/ai-profiling/sync-playbook`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await readApiError(res, "Gagal menyinkronkan Playbook ke Discovery.");
        throw new Error(err.detail ? `${err.title}: ${err.detail}` : err.title);
      }
      return res.json();
    },
    onSuccess: (json) => {
      const seededCount = Array.isArray(json?.data?.discovery_sections_seeded)
        ? json.data.discovery_sections_seeded.length
        : 0;
      const qCount = Number(json?.data?.questions_seeded ?? 0);
      const msg =
        seededCount > 0 || qCount > 0
          ? `Tersinkronisasi: ${seededCount} bagian Discovery & ${qCount} pertanyaan BANTC baru.`
          : "Seluruh insight sudah sinkron di Discovery Workspace & BANTC Guide.";
      setFeedback({ type: "success", text: msg });
      toast.success(msg);
      onLeadChanged();
    },
    onError: (err: unknown) => {
      const msg = describeThrown(err).title;
      setFeedback({ type: "error", text: msg });
      toast.error(msg);
    },
  });

  const confidenceLabel = toDisplayText(profile?.confidence);
  const confidenceVariant =
    confidenceLabel === "high"
      ? "success"
      : confidenceLabel === "medium"
      ? "warning"
      : "neutral";

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="border-b border-border pb-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex flex-wrap items-center gap-2 text-lg font-semibold">
              <BrainCircuit className="h-5 w-5 text-[var(--brand)]" />
              <span>AI Deep Company Profile & Presales Playbook</span>
              {confidenceLabel && (
                <Badge variant={confidenceVariant} className="uppercase">
                  {confidenceLabel} confidence
                </Badge>
              )}
              {profile?.research_status?.available && (
                <Badge variant="info">
                  <Globe className="h-3 w-3" />
                  {toDisplayText(
                    profile.research_status.pages_read ??
                      profile.research_status.source_count ??
                      rawSources.length
                  )}{" "}
                  sumber web dibaca
                </Badge>
              )}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Dossier mendalam entitas bisnis, struktur korporasi, sudut masuk solusi Presales, departemen target, serta validasi sumber publik.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {profile && hasPlaybook && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => syncPlaybookMutation.mutate()}
                disabled={syncPlaybookMutation.isPending || runDeepProfileMutation.isPending}
                className="h-8 gap-1.5 text-xs"
              >
                {syncPlaybookMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Zap className="h-3.5 w-3.5 text-[var(--brand)]" />
                )}
                <span>Sync to Discovery & BANTC</span>
              </Button>
            )}
            <Button
              type="button"
              variant={profile ? "outline" : "default"}
              size="sm"
              onClick={() => runDeepProfileMutation.mutate()}
              disabled={runDeepProfileMutation.isPending}
              className="h-8 gap-1.5 text-xs"
            >
              {runDeepProfileMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCw className="h-3.5 w-3.5" />
              )}
              <span>{profile ? "Refresh Deep Profile" : "Run AI Deep Profiling"}</span>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 pt-5">
        {feedback && (
          <div
            className={`rounded-xl border px-3.5 py-2.5 text-xs font-medium flex items-center justify-between gap-2 ${
              feedback.type === "success"
                ? "border-[color:var(--success)]/30 bg-[color:var(--success-soft)] text-[color:var(--success)]"
                : "border-[color:var(--danger)]/30 bg-[color:var(--danger-soft)] text-[color:var(--danger)]"
            }`}
          >
            <span>{feedback.text}</span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-xs underline opacity-80 hover:opacity-100"
            >
              Tutup
            </button>
          </div>
        )}

        {!profile ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/15 px-6 py-10 text-center">
            <Sparkles className="mb-3 h-8 w-8 text-[var(--brand)]" />
            <h4 className="text-sm font-semibold text-foreground">
              Belum Ada Dossier AI Deep Profiling untuk Lead Ini
            </h4>
            <p className="mt-1 max-w-lg text-xs text-muted-foreground">
              Jalankan AI Deep Profiling untuk menggali struktur korporasi, lokasi cabang & pabrik, perspektif solusi Presales, departemen target, pain points, serta daftar pertanyaan eksplorasi awal secara otomatis.
            </p>
            <Button
              type="button"
              size="sm"
              className="mt-4 gap-1.5"
              onClick={() => runDeepProfileMutation.mutate()}
              disabled={runDeepProfileMutation.isPending}
            >
              {runDeepProfileMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              <span>{runDeepProfileMutation.isPending ? "Sedang Riset Web & Profiling..." : "Mulai AI Deep Profiling Sekarang"}</span>
            </Button>
          </div>
        ) : (
          <>
            {/* Entity Selection Note & Sector Metadata */}
            {(entitySelectionNote ||
              primarySector ||
              verticalText ||
              secondaryIndustries.length > 0 ||
              productBrands.length > 0) && (
              <div className="rounded-xl border border-border/60 bg-muted/15 p-4 space-y-3">
                {entitySelectionNote && (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <strong className="text-foreground">Catatan Identifikasi Entitas:</strong>{" "}
                    {entitySelectionNote}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  {primarySector && (
                    <Badge variant="brand">Sektor: {primarySector}</Badge>
                  )}
                  {verticalText && (
                    <Badge variant="outline">Vertikal: {verticalText}</Badge>
                  )}
                  {businessModelText && (
                    <Badge variant="neutral">Model: {businessModelText}</Badge>
                  )}
                  {secondaryIndustries.map((sec, idx) => (
                    <Badge key={`sec-${idx}`} variant="outline">
                      {sec}
                    </Badge>
                  ))}
                  {productBrands.map((b, idx) => (
                    <Badge key={`brand-${idx}`} variant="info">
                      Brand: {b}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Presales Perspective Highlight */}
            {presalesPerspectiveText && (
              <article className="rounded-xl border border-[color:var(--brand)]/25 bg-[color:var(--brand)]/5 p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[color:var(--brand)]">
                  <Target className="h-4 w-4" />
                  <span>Presales Solution Architecture Perspective</span>
                </div>
                <p className="text-sm leading-relaxed text-foreground">
                  {presalesPerspectiveText}
                </p>
              </article>
            )}

            {/* Corporate & Operational Footprint Summary */}
            {(corporateStructureText ||
              manufacturingCapabilityText ||
              coreProductText ||
              specializationText ||
              certificationsText) && (
              <div className="grid gap-4 md:grid-cols-2">
                {(coreProductText || specializationText) && (
                  <article className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <Layers className="h-3.5 w-3.5 text-[var(--brand)]" />
                      <span>Core Product & Specialization</span>
                    </div>
                    {coreProductText && (
                      <p className="text-sm font-medium text-foreground">{coreProductText}</p>
                    )}
                    {specializationText && (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {specializationText}
                      </p>
                    )}
                  </article>
                )}

                {corporateStructureText && (
                  <article className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <Building2 className="h-3.5 w-3.5 text-[var(--brand)]" />
                      <span>Corporate Group & Ownership Structure</span>
                    </div>
                    <p className="text-xs leading-relaxed text-foreground">
                      {corporateStructureText}
                    </p>
                  </article>
                )}

                {manufacturingCapabilityText && (
                  <article className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <Factory className="h-3.5 w-3.5 text-[var(--brand)]" />
                      <span>Operational & Manufacturing Capability</span>
                    </div>
                    <p className="text-xs leading-relaxed text-foreground">
                      {manufacturingCapabilityText}
                    </p>
                  </article>
                )}

                {certificationsText && (
                  <article className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <FileCheck2 className="h-3.5 w-3.5 text-[var(--success)]" />
                      <span>Certifications & Regulatory Compliance</span>
                    </div>
                    <p className="text-xs leading-relaxed text-foreground">
                      {certificationsText}
                    </p>
                  </article>
                )}
              </div>
            )}

            {/* 4-Quadrant Sales & Presales Playbook */}
            {hasPlaybook && (
              <div className="grid gap-4 md:grid-cols-2">
                {/* Quadrant 1: Target Departments */}
                <article className="rounded-xl border border-border bg-background p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <Users className="h-4 w-4 text-[var(--brand)]" />
                      <span>Departments & Stakeholders to Approach</span>
                    </h4>
                    <Badge variant="neutral">{departments.length}</Badge>
                  </div>
                  {departments.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {departments.map((dept, i) => (
                        <Badge key={i} variant="brand" className="text-xs">
                          {dept}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Belum ada rekomendasi departemen spesifik.</p>
                  )}
                </article>

                {/* Quadrant 2: Inferred Pain Points */}
                <article className="rounded-xl border border-border bg-background p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <AlertTriangle className="h-4 w-4 text-[var(--warning)]" />
                      <span>Inferred Operational Pain Points</span>
                    </h4>
                    <Badge variant="warning">{painPoints.length}</Badge>
                  </div>
                  {painPoints.length > 0 ? (
                    <ul className="space-y-1.5 pl-4 list-disc text-xs text-foreground leading-relaxed">
                      {painPoints.map((pt, i) => (
                        <li key={i}>{pt}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted-foreground">Belum ada indikasi pain point terdeteksi.</p>
                  )}
                </article>

                {/* Quadrant 3: Potential Needs & Solution Angles */}
                <article className="rounded-xl border border-border bg-background p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />
                      <span>Potential Needs & Solution Angles</span>
                    </h4>
                    <Badge variant="success">{potentialNeeds.length + solutionAngles.length}</Badge>
                  </div>
                  {potentialNeeds.length > 0 || solutionAngles.length > 0 ? (
                    <div className="space-y-2.5 text-xs">
                      {potentialNeeds.length > 0 && (
                        <div>
                          <span className="font-semibold text-muted-foreground block mb-1">Kebutuhan Potensial:</span>
                          <ul className="space-y-1 pl-4 list-disc text-foreground">
                            {potentialNeeds.map((need, i) => (
                              <li key={i}>{need}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {solutionAngles.length > 0 && (
                        <div>
                          <span className="font-semibold text-muted-foreground block mb-1">Sudut Masuk Solusi (Entry Angles):</span>
                          <ul className="space-y-1 pl-4 list-disc text-foreground">
                            {solutionAngles.map((angle, i) => (
                              <li key={i}>{angle}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Belum ada sudut masuk solusi tercatat.</p>
                  )}
                </article>

                {/* Quadrant 4: Initial Discovery Questions */}
                <article className="rounded-xl border border-border bg-background p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <HelpCircle className="h-4 w-4 text-[var(--info)]" />
                      <span>Recommended Discovery Questions</span>
                    </h4>
                    <Badge variant="info">{discoveryQuestions.length}</Badge>
                  </div>
                  {discoveryQuestions.length > 0 ? (
                    <ol className="space-y-1.5 pl-4 list-decimal text-xs text-foreground leading-relaxed">
                      {discoveryQuestions.map((q, i) => (
                        <li key={i}>{q}</li>
                      ))}
                    </ol>
                  ) : (
                    <p className="text-xs text-muted-foreground">Belum ada daftar pertanyaan discovery.</p>
                  )}
                </article>
              </div>
            )}

            {/* Semantic <details> Disclosure for Discrepancies & Verified Web Sources */}
            {(discrepancies.length > 0 || sourceValidation.length > 0 || rawSources.length > 0) && (
              <details className="group rounded-xl border border-border bg-muted/15">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-xs font-semibold text-foreground">
                  <div className="flex flex-wrap items-center gap-2">
                    <span>Data Discrepancies & Verified Web Sources</span>
                    {discrepancies.length > 0 && (
                      <Badge variant="warning">{discrepancies.length} discrepancy</Badge>
                    )}
                    <Badge variant="outline">{rawSources.length} URL referensi</Badge>
                  </div>
                  <span className="text-muted-foreground transition group-open:rotate-180">▼</span>
                </summary>

                <div className="border-t border-border px-4 py-4 space-y-4 text-xs">
                  {discrepancies.length > 0 && (
                    <div className="space-y-2">
                      <span className="font-semibold uppercase tracking-wider text-[color:var(--warning)] block">
                        Catatan Perbedaan Data Publik (Discrepancies)
                      </span>
                      <div className="grid gap-2 md:grid-cols-2">
                        {discrepancies.map((d, idx) => (
                          <div
                            key={idx}
                            className="rounded-lg border border-[color:var(--warning)]/30 bg-[color:var(--warning-soft)] p-3 space-y-1"
                          >
                            {toDisplayText(d?.topic) && (
                              <p className="font-semibold text-foreground">{toDisplayText(d.topic)}</p>
                            )}
                            {toDisplayText(d?.detail) && (
                              <p className="text-muted-foreground">{toDisplayText(d.detail)}</p>
                            )}
                            {toDisplayText(d?.recommendation) && (
                              <p className="text-foreground">
                                <strong>Saran Verifikasi:</strong> {toDisplayText(d.recommendation)}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {sourceValidation.length > 0 && (
                    <div className="space-y-2">
                      <span className="font-semibold uppercase tracking-wider text-muted-foreground block">
                        Validasi Atribut per Sumber
                      </span>
                      <div className="grid gap-2 md:grid-cols-2">
                        {sourceValidation.map((sv, idx) => (
                          <div
                            key={idx}
                            className="rounded-lg border border-border bg-background p-2.5 flex items-start justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <p className="font-medium text-foreground">
                                {toDisplayText(sv?.field) || "Field"}
                              </p>
                              {toDisplayText(sv?.note) && (
                                <p className="text-muted-foreground mt-0.5">{toDisplayText(sv.note)}</p>
                              )}
                              {toDisplayText(sv?.source_url) && (
                                <a
                                  href={toDisplayText(sv.source_url)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-1 inline-flex items-center gap-1 text-[var(--brand)] hover:underline truncate max-w-full"
                                >
                                  <span className="truncate">{toDisplayText(sv.source_url)}</span>
                                  <ExternalLink className="h-3 w-3 shrink-0" />
                                </a>
                              )}
                            </div>
                            {toDisplayText(sv?.status) && (
                              <Badge variant="outline" className="shrink-0 capitalize">
                                {toDisplayText(sv.status)}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {rawSources.length > 0 && (
                    <div className="space-y-2">
                      <span className="font-semibold uppercase tracking-wider text-muted-foreground block">
                        Daftar URL Sumber Riset Web
                      </span>
                      <ul className="space-y-1.5">
                        {rawSources.map((url, idx) => (
                          <li key={idx} className="truncate">
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-[var(--brand)] hover:underline"
                            >
                              <ExternalLink className="h-3 w-3 shrink-0" />
                              <span className="truncate">{url}</span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </details>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
