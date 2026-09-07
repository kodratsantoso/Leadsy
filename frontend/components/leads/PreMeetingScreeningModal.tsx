"use client";

import React, { useState } from "react";
import { Sparkles, Loader2, CheckCircle2, AlertTriangle, Zap } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/apiFetch";

interface PreMeetingScreeningModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetCount: number;
  mode: "unassessed" | "selected";
  selectedLeadIds?: number[];
  onSuccess: () => void;
}

export function PreMeetingScreeningModal({
  open,
  onOpenChange,
  targetCount,
  mode,
  selectedLeadIds = [],
  onSuccess,
}: PreMeetingScreeningModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedMessage, setCompletedMessage] = useState<string | null>(null);

  const handleStartScreening = async () => {
    setLoading(true);
    setError(null);
    setCompletedMessage(null);

    try {
      let res: Response;
      if (mode === "unassessed") {
        res = await apiFetch("/leads/ai-screening/bulk-unassessed", {
          method: "POST",
        });
      } else {
        res = await apiFetch("/leads/ai-screening/bulk-selected", {
          method: "POST",
          body: JSON.stringify({ lead_ids: selectedLeadIds }),
        });
      }

      const json = await res.json();
      if (res.ok && json?.success) {
        setCompletedMessage(
          json.message || `Successfully queued ${json.dispatched_count} leads for AI Pre-Meeting Screening.`
        );
        onSuccess();
      } else {
        setError(json?.error || json?.message || "Failed to dispatch AI screening jobs.");
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred during dispatch.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={(v) => {
        if (!loading) {
          setError(null);
          setCompletedMessage(null);
          onOpenChange(v);
        }
      }}
      title="⚡ AI Pre-Meeting Screening & Qualification"
      description="Superadmin one-click pipeline to map and qualify lead meeting eligibility."
      size="lg"
    >
      <div className="space-y-5 p-2">
        {completedMessage ? (
          <div className="flex flex-col items-center justify-center text-center py-6 space-y-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            <h4 className="text-base font-semibold text-foreground">Screening Dispatched!</h4>
            <p className="text-sm text-muted-foreground max-w-md">{completedMessage}</p>
            <Button
              className="mt-2"
              onClick={() => {
                setError(null);
                setCompletedMessage(null);
                onOpenChange(false);
              }}
            >
              Close
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-4 p-4 rounded-2xl border border-[var(--brand)]/20 bg-[color-mix(in_oklch,var(--brand)_6%,transparent)]">
              <Zap className="h-8 w-8 text-[var(--brand)] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-foreground">5-Stage Sequential Pipeline</h4>
                  <Badge variant="brand">Superadmin</Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Evaluates entity legitimacy, matches ICP & product fit, inspects inbound buying intent, assigns BANTC eligibility (Eligible / Potential / Unqualified), and generates a pre-meeting strategy brief.
                </p>
              </div>
            </div>

            <div className="border border-border rounded-xl p-4 space-y-3 bg-card/60">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Target Leads to Screen:</span>
                <span className="font-bold text-foreground">{targetCount} Leads</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Execution Mode:</span>
                <Badge variant="neutral">{mode === "unassessed" ? "All Unassessed Leads" : "Selected Leads Batch"}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Execution Strategy:</span>
                <span className="text-xs text-foreground font-medium">Asynchronous Worker Queue</span>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-destructive bg-destructive/10 border border-destructive/20 rounded-xl p-3 text-xs">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <Button variant="ghost" disabled={loading} onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                disabled={loading || targetCount === 0}
                onClick={handleStartScreening}
                className="gap-2 bg-[var(--brand)] text-white hover:opacity-90"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Dispatching Queue...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Run AI Screening ({targetCount})
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
