"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  HeartPulse,
  Loader2,
  RadioTower,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BackToSettings } from "@/app/settings/_components/back-to-settings";
import { apiFetch } from "@/lib/apiFetch";

type SchedulerStatus = "healthy" | "stale" | "dead" | "never_seen";

type ProgressResponse = {
  success: boolean;
  total_leads: number;
  assessed_count: number;
  unassessed_count: number;
  percent_assessed: number;
  scheduler: {
    status: SchedulerStatus;
    minutes_ago: number | null;
    detail: Record<string, any> | null;
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
  stages_executed: string[] | null;
  lead_score: number | null;
  qualification_status: string | null;
  triggered_by: string;
  elapsed_seconds: number | null;
  created_at: string | null;
};

const SCHEDULER_META: Record<SchedulerStatus, { label: string; badge: "success" | "warning" | "danger" | "outline"; desc: string }> = {
  healthy: { label: "Running", badge: "success", desc: "The background scheduler ran within the last 15 minutes — on schedule." },
  stale: { label: "Lagging", badge: "warning", desc: "It's been longer than expected since the last run. May just be a slow tick — worth watching." },
  dead: { label: "Stopped", badge: "danger", desc: "No run in over an hour. The scheduler container has very likely stopped — this needs a DevOps check." },
  never_seen: { label: "Never seen", badge: "outline", desc: "This install has never recorded a run at all. The scheduler may not be deployed yet." },
};

const RUN_META: Record<RunStatus, { label: string; icon: typeof CheckCircle2; badge: "success" | "warning" | "danger" }> = {
  success: { label: "Success", icon: CheckCircle2, badge: "success" },
  partial: { label: "Partial", icon: AlertTriangle, badge: "warning" },
  failed: { label: "Failed", icon: XCircle, badge: "danger" },
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

export default function AiScreeningMonitorPage() {
  const { data: progress, isLoading: progressLoading } = useQuery<ProgressResponse>({
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

  const runs = runsData?.data ?? [];
  const schedulerStatus = progress?.scheduler?.status ?? "never_seen";
  const schedulerMeta = SCHEDULER_META[schedulerStatus];
  const isLive = schedulerStatus === "healthy";

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <BackToSettings />
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">AI Screening Monitor</h1>
          {isLive && (
            <span className="flex items-center gap-1.5 text-xs text-[var(--success)]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--success)] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--success)]" />
              </span>
              live
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Real-time visibility into whether the background AI screening pipeline is actually running, and exactly what happened
          — success, partial, or failed — for each lead it touches.
        </p>
      </div>

      {/* Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total leads</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {progressLoading ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : progress?.total_leads ?? "—"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Assessed</CardDescription>
            <CardTitle className="text-3xl tabular-nums text-[var(--success)]">
              {progressLoading ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : progress?.assessed_count ?? "—"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Unassessed</CardDescription>
            <CardTitle className="text-3xl tabular-nums text-[var(--warning)]">
              {progressLoading ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : progress?.unassessed_count ?? "—"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Backlog progress</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{progress ? `${progress.percent_assessed}%` : "—"}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-[var(--brand)] transition-all duration-500"
                style={{ width: `${progress?.percent_assessed ?? 0}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scheduler health */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div className="flex items-center gap-2">
            <HeartPulse className="h-4.5 w-4.5 text-muted-foreground" />
            <CardTitle className="text-base">Background scheduler</CardTitle>
          </div>
          <Badge variant={schedulerMeta.badge}>{schedulerMeta.label}</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{schedulerMeta.desc}</p>
          <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Last run: </span>
              <span className="font-medium tabular-nums">
                {progress?.scheduler?.minutes_ago != null ? `${progress.scheduler.minutes_ago}m ago` : "never"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Last hour — success: </span>
              <span className="font-medium text-[var(--success)] tabular-nums">{progress?.last_hour?.success ?? 0}</span>
            </div>
            <div>
              <span className="text-muted-foreground">partial: </span>
              <span className="font-medium text-[var(--warning)] tabular-nums">{progress?.last_hour?.partial ?? 0}</span>
            </div>
            <div>
              <span className="text-muted-foreground">failed: </span>
              <span className="font-medium text-[var(--danger)] tabular-nums">{progress?.last_hour?.failed ?? 0}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent runs */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-3">
          <RadioTower className="h-4.5 w-4.5 text-muted-foreground" />
          <CardTitle className="text-base">Recent screening runs</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {runsLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading recent activity...
            </div>
          ) : runs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
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
                  <div
                    key={run.id}
                    className={`flex flex-col gap-2 px-5 py-3 ${isProblem ? "bg-[var(--danger-soft)]/40" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <Icon className={`h-4 w-4 shrink-0 ${isProblem ? "text-[var(--danger)]" : "text-[var(--success)]"}`} />
                        <span className="truncate text-sm font-medium">{run.company_name ?? `Lead #${run.lead_id}`}</span>
                        <Badge variant={meta.badge} className="shrink-0">{meta.label}</Badge>
                      </div>
                      <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                        <span className="tabular-nums">{run.elapsed_seconds != null ? `${run.elapsed_seconds}s` : "—"}</span>
                        <span>{run.triggered_by}</span>
                        <span className="tabular-nums">{timeAgo(run.created_at)}</span>
                      </div>
                    </div>
                    {isProblem && run.error_message && (
                      <p className="rounded-md bg-[var(--danger-soft)] px-3 py-2 text-xs text-[var(--danger)]">
                        {run.error_message}
                      </p>
                    )}
                    {run.status === "success" && (
                      <p className="text-xs text-muted-foreground">
                        Score {run.lead_score ?? "—"} · {run.qualification_status ?? "—"}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
