"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BrainCircuit,
  Building2,
  ClipboardList,
  Loader2,
  ShieldOff,
  Sparkles,
  TestTube2,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { BackToSettings } from "@/app/settings/_components/back-to-settings";
import { LeadPicker, type PickedLead } from "@/components/settings/ai-testing/LeadPicker";
import { PreMeetingScreeningModal } from "@/components/leads/PreMeetingScreeningModal";
import { apiFetch } from "@/lib/apiFetch";
import { runAiScreening } from "@/lib/aiScreeningPipeline";
import { useAuthStore } from "@/store/useAuthStore";

const TABS = [
  { key: "single", label: "Single Lead Debug", icon: TestTube2 },
  { key: "bulk", label: "Bulk Backfill", icon: Sparkles },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const STATUS_BADGE: Record<string, { variant: "success" | "warning" | "danger" | "outline"; label: string }> = {
  completed: { variant: "success", label: "Completed" },
  processing: { variant: "warning", label: "Processing" },
  failed: { variant: "danger", label: "Failed" },
};

function AiStatusBadge({ status }: { status?: string | null }) {
  const meta = status ? STATUS_BADGE[status] : undefined;
  if (!meta) {
    return <Badge variant="outline">Pending</Badge>;
  }
  return (
    <Badge variant={meta.variant} className="items-center gap-1.5">
      {status === "processing" && <Loader2 className="h-3 w-3 animate-spin" />}
      {meta.label}
    </Badge>
  );
}

function RerunButton({
  label,
  icon: Icon,
  onRun,
  pending,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onRun: () => void;
  pending: boolean;
}) {
  return (
    <Button variant="outline" size="sm" onClick={onRun} disabled={pending} className="justify-start">
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
      {label}
    </Button>
  );
}

function SingleLeadDebugTab() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<PickedLead | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const { data: leadDetail, refetch: refetchLead } = useQuery({
    queryKey: ["ai-testing-lead-detail", selected?.id],
    queryFn: () => apiFetch(`/leads/${selected!.id}`).then((r) => r.json()),
    enabled: !!selected,
  });
  const leadData = leadDetail?.data ?? {};

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["ai-testing-lead-detail", selected?.id] });
    refetchLead();
  };

  const useRerunMutation = (endpoint: string, successLabel: string) =>
    useMutation({
      mutationFn: async () => {
        const res = await apiFetch(`/leads/${selected!.id}${endpoint}`, { method: "POST" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.message || json?.error || `Failed: ${endpoint}`);
        return json;
      },
      onSuccess: () => {
        setFeedback({ type: "success", msg: `${successLabel} dispatched.` });
        invalidate();
      },
      onError: (err: any) => setFeedback({ type: "error", msg: err.message }),
    });

  const enrichMutation = useRerunMutation("/enrich/retry", "Enrichment");
  const verificationMutation = useRerunMutation("/verification/run", "Company Verification");
  const profilingMutation = useRerunMutation("/run-profiling-strategy", "Profiling & Strategy + Product Matching");
  const rescoreMutation = useRerunMutation("/rescore", "Scoring + ICP + Qualification");
  const analysisMutation = useRerunMutation("/revenue-analysis", "Lead Analysis");
  const bantcMutation = useRerunMutation("/bantc-questions/generate", "BANTC Questions");

  const [pipelineRunning, setPipelineRunning] = useState(false);
  const runFullPipeline = async () => {
    if (!selected) return;
    setPipelineRunning(true);
    setFeedback({ type: "success", msg: "Starting full 9-stage pipeline..." });
    try {
      const outcome = await runAiScreening(selected.id, {
        onProgress: (elapsedSeconds) =>
          setFeedback({ type: "success", msg: `Running full 8-stage pipeline... (${elapsedSeconds}s elapsed)` }),
      });

      if (outcome.status === "completed") {
        setFeedback({
          type: "success",
          msg: `Full pipeline completed. Score: ${outcome.data?.lead_score ?? "—"} (${outcome.data?.qualification_status ?? "—"}).`,
        });
      } else if (outcome.status === "failed") {
        throw new Error(outcome.error);
      } else {
        setFeedback({ type: "error", msg: "Pipeline timed out after 10 minutes; it may still complete in the background." });
      }
      invalidate();
    } catch (err: any) {
      setFeedback({ type: "error", msg: err.message });
    } finally {
      setPipelineRunning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Single Lead Debug</CardTitle>
          <CardDescription>
            Search a lead and re-run any of the 9 Pre-Meeting AI functions individually, or the full pipeline at once.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <LeadPicker selected={selected} onSelect={(lead) => { setSelected(lead); setFeedback(null); }} />

        {selected && (
          <>
            <div className="flex items-center justify-between rounded-2xl border border-border bg-[color:var(--surface-subtle)] p-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Current AI Pre-Meeting Analysis Status</p>
                <p className="mt-1 text-sm font-semibold">{leadData.company_name}</p>
              </div>
              <AiStatusBadge status={leadData.ai_processing_status} />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <RerunButton label="Re-run Enrichment" icon={Sparkles} onRun={() => enrichMutation.mutate()} pending={enrichMutation.isPending} />
              <RerunButton label="Re-run Company Verification" icon={Building2} onRun={() => verificationMutation.mutate()} pending={verificationMutation.isPending} />
              <RerunButton label="Re-run Profiling & Strategy + Product Matching" icon={BrainCircuit} onRun={() => profilingMutation.mutate()} pending={profilingMutation.isPending} />
              <RerunButton label="Re-run Scoring + ICP + Qualification" icon={Zap} onRun={() => rescoreMutation.mutate()} pending={rescoreMutation.isPending} />
              <RerunButton label="Re-run Lead Analysis" icon={Zap} onRun={() => analysisMutation.mutate()} pending={analysisMutation.isPending} />
              <RerunButton label="Re-run BANTC Questions" icon={ClipboardList} onRun={() => bantcMutation.mutate()} pending={bantcMutation.isPending} />
            </div>

            <Button onClick={runFullPipeline} disabled={pipelineRunning} className="w-full gap-2 bg-[var(--brand)] text-white hover:opacity-90">
              {pipelineRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              {pipelineRunning ? "Running Full Pipeline..." : "Run Full Pipeline (All 9 Functions)"}
            </Button>

            {feedback && (
              <p className={`text-xs ${feedback.type === "success" ? "text-[var(--status-success)]" : "text-[var(--status-danger)]"}`}>
                {feedback.msg}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function BulkBackfillTab() {
  const qc = useQueryClient();
  const [screeningOpen, setScreeningOpen] = useState(false);
  const [screeningMode, setScreeningMode] = useState<"unassessed" | "selected">("unassessed");
  const [batch, setBatch] = useState<PickedLead[]>([]);
  const [picker, setPicker] = useState<PickedLead | null>(null);

  const { data: unassessedCount = 0, refetch: refetchUnassessedCount } = useQuery({
    queryKey: ["unassessed-leads-count"],
    queryFn: async () => {
      const res = await apiFetch("/leads/ai-screening/unassessed-count");
      const json = await res.json();
      return json?.unassessed_count ?? 0;
    },
  });

  const addToBatch = (lead: PickedLead | null) => {
    if (!lead) return;
    setBatch((prev) => (prev.some((l) => l.id === lead.id) ? prev : [...prev, lead]));
    setPicker(null);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Screen Unassessed Leads</CardTitle>
            <CardDescription>
              Run the full 9-stage Pre-Meeting AI pipeline for older leads created before this automation existed.
            </CardDescription>
          </div>
          <Button
            className="bg-[color-mix(in_oklch,var(--brand)_12%,transparent)] text-[var(--brand)] border-[var(--brand)]/30 hover:bg-[var(--brand)] hover:text-white font-medium"
            variant="outline"
            onClick={() => {
              setScreeningMode("unassessed");
              setScreeningOpen(true);
            }}
          >
            <Sparkles className="h-4 w-4 mr-1.5" />
            Screen Unassessed ({unassessedCount})
          </Button>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Screen Selected Leads</CardTitle>
            <CardDescription>Pick specific leads to (re)screen through the full pipeline.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <LeadPicker selected={picker} onSelect={addToBatch} />

          {batch.length > 0 && (
            <div className="space-y-1.5">
              {batch.map((lead) => (
                <div key={lead.id} className="flex items-center justify-between rounded-xl border border-border bg-[color:var(--surface-subtle)] px-3 py-2 text-sm">
                  <span className="truncate">{lead.company_name} <span className="text-muted-foreground">#{lead.id}</span></span>
                  <button
                    type="button"
                    onClick={() => setBatch((prev) => prev.filter((l) => l.id !== lead.id))}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <Button
            variant="outline"
            className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-600 hover:text-white dark:text-emerald-400 font-medium"
            disabled={batch.length === 0}
            onClick={() => {
              setScreeningMode("selected");
              setScreeningOpen(true);
            }}
          >
            <Sparkles className="h-4 w-4 mr-1.5" />
            Screen Selected ({batch.length})
          </Button>
        </CardContent>
      </Card>

      <PreMeetingScreeningModal
        open={screeningOpen}
        onOpenChange={setScreeningOpen}
        targetCount={screeningMode === "unassessed" ? unassessedCount : batch.length}
        mode={screeningMode}
        selectedLeadIds={batch.map((l) => l.id)}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ["leads"] });
          refetchUnassessedCount();
          if (screeningMode === "selected") setBatch([]);
        }}
      />
    </div>
  );
}

export default function AiTestingConsolePage() {
  const authUser = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<TabKey>("single");

  if (authUser?.role?.name !== "super_admin") {
    return (
      <div className="space-y-4 p-6">
        <BackToSettings />
        <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-border bg-card py-20 text-center">
          <ShieldOff className="h-8 w-8 text-muted-foreground" />
          <p className="font-semibold">Access Denied</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            The AI Testing Console is restricted to superadmins.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <div className="space-y-1">
            <BackToSettings />
            <CardTitle>AI Testing Console</CardTitle>
            <CardDescription>
              Debug and re-run the Pre-Meeting AI pipeline for individual leads, or backfill older leads in bulk.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <Tabs value={tab} onValueChange={setTab} items={TABS.map((t) => ({ key: t.key, label: t.label, icon: t.icon }))} />
        </CardContent>
      </Card>

      {tab === "single" && <SingleLeadDebugTab />}
      {tab === "bulk" && <BulkBackfillTab />}
    </div>
  );
}
