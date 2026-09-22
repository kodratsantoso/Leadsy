"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  HeartPulse,
  Inbox,
  ListChecks,
  Radio,
  TrendingUp,
  WifiOff,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BackToSettings } from "@/app/settings/_components/back-to-settings";
import { apiFetch } from "@/lib/apiFetch";

type SchedulerStatus = "healthy" | "stale" | "dead" | "never_seen";

type ProgressResponse = {
  success: boolean;
  message?: string;
  total_leads: number;
  assessed_count: number;
  unassessed_count: number;
  percent_assessed: number;
  scheduler: {
    status: SchedulerStatus;
    minutes_ago: number | null;
  };
  last_hour: { success: number; partial: number; failed: number };
};

type RunStatus = "success" | "partial" | "failed";

type Run = {
  id: number;
  lead_id: number | null;
  company_name: string | null;
  status: RunStatus;
  error_message: string | null;
  lead_score: number | null;
  qualification_status: string | null;
  triggered_by: string;
  elapsed_seconds: number | null;
  created_at: string | null;
};

const SCHEDULER_META: Record<
  SchedulerStatus,
  { label: string; dot: string; ring: string; text: string; desc: string }
> = {
  healthy: {
    label: "Running on schedule",
    dot: "bg-[var(--success)]",
    ring: "ring-[var(--success)]/25",
    text: "text-[var(--success)]",
    desc: "Last run was within the last 15 minutes.",
  },
  stale: {
    label: "Lagging",
    dot: "bg-[var(--warning)]",
    ring: "ring-[var(--warning)]/25",
    text: "text-[var(--warning)]",
    desc: "It's taking longer than expected between runs. Worth watching.",
  },
  dead: {
    label: "Stopped",
    dot: "bg-[var(--danger)]",
    ring: "ring-[var(--danger)]/25",
    text: "text-[var(--danger)]",
    desc: "No run in over an hour — the scheduler process has very likely stopped. Needs a DevOps check.",
  },
  never_seen: {
    label: "Never reported in",
    dot: "bg-[var(--muted-foreground)]",
    ring: "ring-border",
    text: "text-muted-foreground",
    desc: "No run has ever been recorded on this install.",
  },
};

const RUN_META: Record<RunStatus, { label: string; icon: typeof CheckCircle2; text: string; bg: string }> = {
  success: { label: "Success", icon: CheckCircle2, text: "text-[var(--success)]", bg: "bg-[var(--success-soft)]" },
  partial: { label: "Partial", icon: AlertTriangle, text: "text-[var(--warning)]", bg: "bg-[var(--warning-soft)]" },
  failed: { label: "Failed", icon: XCircle, text: "text-[var(--danger)]", bg: "bg-[var(--danger-soft)]" },
};

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function StatTile({
  icon: Icon,
  label,
  value,
  accent,
  loading,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  accent?: string;
  loading: boolean;
}) {
  return (
    <div className="flex-1 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      {loading ? (
        <div className="mt-3 h-8 w-16 animate-pulse rounded bg-muted" />
      ) : (
        <div className={`mt-2 text-3xl font-semibold tabular-nums ${accent ?? ""}`}>{value}</div>
      )}
    </div>
  );
}

export default function AiScreeningMonitorPage() {
  const {
    data: progress,
    isLoading: progressLoading,
  } = useQuery<ProgressResponse>({
    queryKey: ["ai-screening-progress"],
    queryFn: async () => {
      const res = await apiFetch("/leads/ai-screening/progress");
      return res.json();
    },
    refetchInterval: 8000,
  });

  const { data: runsData, isLoading: runsLoading } = useQuery<{ success: boolean; data: Run[] }>({
    queryKey: ["ai-screening-recent-runs"],
    queryFn: async () => {
      const res = await apiFetch("/leads/ai-screening/recent-runs?limit=40");
      return res.json();
    },
    refetchInterval: 8000,
  });

  const connected = progress?.success === true;
  const runs = connected ? runsData?.data ?? [] : [];
  const schedulerStatus: SchedulerStatus = connected ? progress.scheduler.status : "never_seen";
  const schedulerMeta = SCHEDULER_META[schedulerStatus];
  const isLive = schedulerStatus === "healthy";

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      <div className="space-y-1.5">
        <BackToSettings />
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">AI Screening Monitor</h1>
          {isLive && (
            <span className="flex items-center gap-1.5 rounded-full bg-[var(--success-soft)] px-2.5 py-1 text-xs font-medium text-[var(--success)]">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--success)] opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
              </span>
              Live
            </span>
          )}
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Whether the background AI screening pipeline is actually running, and exactly what happened for each lead it
          touched — success, partial, or failed.
        </p>
      </div>

      {!progressLoading && !connected && (
        <div className="flex items-start gap-3 rounded-xl border border-[var(--warning)]/30 bg-[var(--warning-soft)] p-4">
          <WifiOff className="mt-0.5 h-5 w-5 shrink-0 text-[var(--warning)]" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Monitoring service isn't responding yet</p>
            <p className="text-sm text-muted-foreground">
              This page can't reach the monitoring endpoints on the server. If a backend deploy is in progress, this will
              resolve on its own — refresh in a few minutes.
              {progress?.message ? (
                <>
                  {" "}
                  <span className="font-mono text-xs text-muted-foreground/80">({progress.message})</span>
                </>
              ) : null}
            </p>
          </div>
        </div>
      )}

      {/* Overview */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <StatTile icon={ListChecks} label="Total leads" value={connected ? String(progress.total_leads) : "—"} loading={progressLoading} />
        <StatTile
          icon={CheckCircle2}
          label="Assessed"
          value={connected ? String(progress.assessed_count) : "—"}
          accent="text-[var(--success)]"
          loading={progressLoading}
        />
        <StatTile
          icon={Inbox}
          label="Unassessed"
          value={connected ? String(progress.unassessed_count) : "—"}
          accent="text-[var(--warning)]"
          loading={progressLoading}
        />
      </div>

      {/* Backlog progress */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Backlog progress</span>
          </div>
          <span className="text-sm font-semibold tabular-nums text-foreground">
            {connected ? `${progress.percent_assessed}%` : progressLoading ? "" : "—"}
          </span>
        </div>
        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-[var(--brand)] transition-all duration-700"
            style={{ width: `${connected ? progress.percent_assessed : 0}%` }}
          />
        </div>
      </div>

      {/* Scheduler health */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className={`flex items-center gap-3 border-b border-border p-5 ring-1 ring-inset ${schedulerMeta.ring}`}>
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${schedulerMeta.dot}/15`}>
            <HeartPulse className={`h-4.5 w-4.5 ${schedulerMeta.text}`} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">Background scheduler</span>
              <span className={`h-1.5 w-1.5 rounded-full ${schedulerMeta.dot}`} />
              <span className={`text-sm font-medium ${schedulerMeta.text}`}>{schedulerMeta.label}</span>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">{schedulerMeta.desc}</p>
          </div>
          <div className="hidden shrink-0 text-right text-sm sm:block">
            <div className="text-muted-foreground">Last run</div>
            <div className="font-medium tabular-nums">
              {connected && progress.scheduler.minutes_ago != null ? `${progress.scheduler.minutes_ago}m ago` : "never"}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x divide-border text-center">
          <div className="p-4">
            <div className="text-lg font-semibold tabular-nums text-[var(--success)]">{connected ? progress.last_hour.success : "—"}</div>
            <div className="text-xs text-muted-foreground">success (1h)</div>
          </div>
          <div className="p-4">
            <div className="text-lg font-semibold tabular-nums text-[var(--warning)]">{connected ? progress.last_hour.partial : "—"}</div>
            <div className="text-xs text-muted-foreground">partial (1h)</div>
          </div>
          <div className="p-4">
            <div className="text-lg font-semibold tabular-nums text-[var(--danger)]">{connected ? progress.last_hour.failed : "—"}</div>
            <div className="text-xs text-muted-foreground">failed (1h)</div>
          </div>
        </div>
      </div>

      {/* Recent runs */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <Radio className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-foreground">Recent screening runs</span>
        </div>

        {runsLoading ? (
          <div className="space-y-3 p-5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : runs.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-14 text-center text-sm text-muted-foreground">
            <Clock className="h-6 w-6" />
            No screening runs recorded yet. They'll show up here as soon as the scheduler processes a lead.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {runs.map((run) => {
              const meta = RUN_META[run.status];
              const Icon = meta.icon;
              const isProblem = run.status !== "success";
              return (
                <div key={run.id} className="flex flex-col gap-2 px-5 py-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${meta.bg}`}>
                        <Icon className={`h-3.5 w-3.5 ${meta.text}`} />
                      </span>
                      <span className="truncate text-sm font-medium text-foreground">
                        {run.company_name ?? `Lead #${run.lead_id}`}
                      </span>
                      {isProblem && (
                        <Badge variant={run.status === "failed" ? "danger" : "warning"} className="shrink-0">
                          {meta.label}
                        </Badge>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                      <span className="tabular-nums">{run.elapsed_seconds != null ? `${run.elapsed_seconds}s` : "—"}</span>
                      <span className="hidden sm:inline">{run.triggered_by}</span>
                      <span className="tabular-nums">{timeAgo(run.created_at)}</span>
                    </div>
                  </div>
                  {isProblem && run.error_message && (
                    <p className={`ml-[34px] rounded-md ${meta.bg} px-3 py-2 text-xs ${meta.text}`}>{run.error_message}</p>
                  )}
                  {run.status === "success" && (
                    <p className="ml-[34px] text-xs text-muted-foreground">
                      Score {run.lead_score ?? "—"} · {run.qualification_status ?? "—"}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
