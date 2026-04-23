"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Loader2, PauseCircle, Shield, SlidersHorizontal, XCircle } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FilterBar, FilterBarSearch } from "@/components/ui/filter-bar";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableShell,
} from "@/components/ui/table";
import { apiFetch } from "@/lib/apiFetch";

type ReviewRecord = {
  id: number;
  status: "pending" | "in_review" | "approved" | "rejected" | "overridden";
  decision?: "pending" | "approve" | "reject" | "hold" | "override_score" | null;
  recommended_status?: string | null;
  final_status?: string | null;
  justification?: string | null;
  decision_reason?: string | null;
  original_score?: number | null;
  score_override?: number | null;
  created_at?: string | null;
  reviewed_at?: string | null;
  due_at?: string | null;
  workflow?: { id: number; name: string } | null;
  lead?: { id: number; company_name: string; lead_score?: number | null; qualification_status?: string | null } | null;
  requester?: { id: number; name: string } | null;
  reviewer?: { id: number; name: string } | null;
};

function statusVariant(status?: string | null) {
  if (status === "approved") return "success";
  if (status === "rejected") return "danger";
  if (status === "in_review" || status === "overridden") return "warning";
  return "neutral";
}

function decisionVariant(decision?: string | null) {
  if (decision === "approve") return "success";
  if (decision === "reject") return "danger";
  if (decision === "hold" || decision === "override_score") return "warning";
  return "neutral";
}

function formatLabel(value?: string | null) {
  if (!value) return "Pending";
  return value.replace(/_/g, " ");
}

export default function QualificationReviewsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("open");
  const [decisionFilter, setDecisionFilter] = useState("");
  const [selectedReview, setSelectedReview] = useState<ReviewRecord | null>(null);
  const [decision, setDecision] = useState<"approve" | "reject" | "hold" | "override_score">("approve");
  const [reason, setReason] = useState("");
  const [finalStatus, setFinalStatus] = useState("eligible");
  const [scoreOverride, setScoreOverride] = useState("");
  const [feedback, setFeedback] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["qualification-reviews", search, statusFilter, decisionFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (decisionFilter) params.set("decision", decisionFilter);
      const response = await apiFetch(`/qualification/reviews${params.toString() ? `?${params.toString()}` : ""}`);
      return response.json();
    },
  });

  const reviews: ReviewRecord[] = data?.data ?? [];

  const counts = useMemo(() => {
    return reviews.reduce(
      (acc, review) => {
        acc.total += 1;
        if (review.status === "pending" || review.status === "in_review") acc.open += 1;
        if (review.status === "approved") acc.approved += 1;
        if (review.status === "rejected") acc.rejected += 1;
        return acc;
      },
      { total: 0, open: 0, approved: 0, rejected: 0 }
    );
  }, [reviews]);

  const decisionMutation = useMutation({
    mutationFn: async (payload: {
      id: number;
      decision: "approve" | "reject" | "hold" | "override_score";
      reason: string;
      final_status?: string;
      score_override?: number;
    }) =>
      apiFetch(`/qualification/reviews/${payload.id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["qualification-reviews"] });
      setSelectedReview(null);
      setReason("");
      setScoreOverride("");
      setFeedback("Review decision saved.");
    },
  });

  const openDecisionModal = (review: ReviewRecord, nextDecision: "approve" | "reject" | "hold" | "override_score") => {
    setSelectedReview(review);
    setDecision(nextDecision);
    setReason(review.decision_reason ?? "");
    setFinalStatus(review.recommended_status ?? "eligible");
    setScoreOverride(review.lead?.lead_score != null ? String(review.lead.lead_score) : "");
  };

  const submitDecision = () => {
    if (!selectedReview || !reason.trim()) return;

    decisionMutation.mutate({
      id: selectedReview.id,
      decision,
      reason: reason.trim(),
      final_status: decision === "approve" || decision === "reject" || decision === "hold" ? finalStatus : undefined,
      score_override: decision === "override_score" ? Number(scoreOverride) : undefined,
    });
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Human Verification Queue</CardTitle>
            <CardDescription>Only reviewed leads should progress into the pipeline. Approve, reject, hold, or override score from one governed queue.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-border bg-muted/20 p-4">
            <p className="text-xs font-medium text-muted-foreground">Open queue</p>
            <p className="mt-2 text-2xl font-semibold">{counts.open}</p>
          </div>
          <div className="rounded-2xl border border-border bg-muted/20 p-4">
            <p className="text-xs font-medium text-muted-foreground">Approved</p>
            <p className="mt-2 text-2xl font-semibold">{counts.approved}</p>
          </div>
          <div className="rounded-2xl border border-border bg-muted/20 p-4">
            <p className="text-xs font-medium text-muted-foreground">Rejected</p>
            <p className="mt-2 text-2xl font-semibold">{counts.rejected}</p>
          </div>
          <div className="rounded-2xl border border-border bg-muted/20 p-4">
            <p className="text-xs font-medium text-muted-foreground">Visible records</p>
            <p className="mt-2 text-2xl font-semibold">{counts.total}</p>
          </div>
        </CardContent>
      </Card>

      {feedback ? <Badge variant="info">{feedback}</Badge> : null}

      <FilterBar>
        <FilterBarSearch
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search lead, reviewer, or reason"
        />
        <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="open">Open queue</option>
          <option value="pending">Pending</option>
          <option value="in_review">In review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="overridden">Overridden</option>
        </Select>
        <Select value={decisionFilter} onChange={(event) => setDecisionFilter(event.target.value)} placeholder="All decisions">
          <option value="approve">Approve</option>
          <option value="reject">Reject</option>
          <option value="hold">Hold</option>
          <option value="override_score">Override score</option>
        </Select>
      </FilterBar>

      <TableShell>
        <Table>
          <TableHead>
            <tr>
              <TableHeaderCell>Lead</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Recommendation</TableHeaderCell>
              <TableHeaderCell>Requested</TableHeaderCell>
              <TableHeaderCell>Reviewer</TableHeaderCell>
              <TableHeaderCell>Reason</TableHeaderCell>
              <TableHeaderCell>Actions</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableEmpty colSpan={7}>
                <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                Loading review queue...
              </TableEmpty>
            ) : reviews.length === 0 ? (
              <TableEmpty colSpan={7}>No reviews found for the current filters.</TableEmpty>
            ) : (
              reviews.map((review) => (
                <TableRow key={review.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <Link href={review.lead?.id ? `/leads/${review.lead.id}` : "#"} className="font-medium hover:underline">
                        {review.lead?.company_name ?? "Unknown lead"}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        Score {review.score_override ?? review.lead?.lead_score ?? "—"} • {formatLabel(review.lead?.qualification_status)}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <Badge variant={statusVariant(review.status)}>{formatLabel(review.status)}</Badge>
                      <Badge variant={decisionVariant(review.decision)}>{formatLabel(review.decision)}</Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <div className="space-y-1">
                      <p>{formatLabel(review.recommended_status)}</p>
                      {review.final_status ? <p>Final: {formatLabel(review.final_status)}</p> : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <div className="space-y-1">
                      <p>{review.requester?.name ?? "System"}</p>
                      <p>{review.created_at ? new Date(review.created_at).toLocaleString() : "—"}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <div className="space-y-1">
                      <p>{review.reviewer?.name ?? "Unassigned"}</p>
                      <p>{review.reviewed_at ? new Date(review.reviewed_at).toLocaleString() : "—"}</p>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-sm text-sm text-muted-foreground">
                    {review.decision_reason ?? review.justification ?? "No reason captured."}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <Button size="xs" variant="outline" onClick={() => openDecisionModal(review, "approve")}>
                        <Check className="h-3.5 w-3.5" />
                        Approve
                      </Button>
                      <Button size="xs" variant="outline" onClick={() => openDecisionModal(review, "hold")}>
                        <PauseCircle className="h-3.5 w-3.5" />
                        Hold
                      </Button>
                      <Button size="xs" variant="outline" onClick={() => openDecisionModal(review, "override_score")}>
                        <SlidersHorizontal className="h-3.5 w-3.5" />
                        Override
                      </Button>
                      <Button size="xs" variant="destructive" onClick={() => openDecisionModal(review, "reject")}>
                        <XCircle className="h-3.5 w-3.5" />
                        Reject
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableShell>

      <Modal
        open={Boolean(selectedReview)}
        onOpenChange={(open) => {
          if (!open) setSelectedReview(null);
        }}
        title="Review Decision"
        description="Capture reviewer decision, reason, and optional score override for the audit trail."
        footer={
          <>
            <Button variant="outline" onClick={() => setSelectedReview(null)}>
              Cancel
            </Button>
            <Button onClick={submitDecision} disabled={decisionMutation.isPending || !reason.trim()}>
              {decisionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save Decision
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <div className="rounded-2xl border border-border bg-muted/20 p-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-[var(--brand)]" />
              <p className="font-medium">{selectedReview?.lead?.company_name}</p>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Current score {selectedReview?.lead?.lead_score ?? "—"} • Recommended {formatLabel(selectedReview?.recommended_status)}
            </p>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Decision</label>
            <Select value={decision} onChange={(event) => setDecision(event.target.value as typeof decision)}>
              <option value="approve">Approve</option>
              <option value="reject">Reject</option>
              <option value="hold">Hold</option>
              <option value="override_score">Override score</option>
            </Select>
          </div>

          {decision === "override_score" ? (
            <div className="grid gap-2">
              <label className="text-sm font-medium">Override score</label>
              <Input
                inputMode="numeric"
                value={scoreOverride}
                onChange={(event) => setScoreOverride(event.target.value)}
                placeholder="0-100"
              />
            </div>
          ) : (
            <div className="grid gap-2">
              <label className="text-sm font-medium">Final status</label>
              <Select value={finalStatus} onChange={(event) => setFinalStatus(event.target.value)}>
                <option value="pending">Pending</option>
                <option value="eligible">Eligible</option>
                <option value="potential">Potential</option>
                <option value="not_eligible">Not eligible</option>
              </Select>
            </div>
          )}

          <div className="grid gap-2">
            <label className="text-sm font-medium">Reason</label>
            <textarea
              className="min-h-32 rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none transition focus-visible:border-[var(--brand)] focus-visible:ring-3 focus-visible:ring-[color:var(--brand)]/15"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Explain the decision for the audit trail"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
