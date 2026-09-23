import { apiFetch } from "@/lib/apiFetch";

/**
 * Dispatches the Pre-Meeting AI Screening pipeline for one lead and polls until
 * it settles.
 *
 * This used to be copy-pasted in three places (the Lead Detail page, the AI
 * Testing Console and the bulk screening modal) and had already drifted — two
 * copies disagreed on whether the pipeline has 8 or 9 stages, and only one of
 * them tolerated a transient polling error.
 */

/** 300 * 2s = 10 minutes, matching RunPreMeetingAiScreeningJob's own 600s timeout. */
export const AI_SCREENING_MAX_ATTEMPTS = 300;
export const AI_SCREENING_POLL_INTERVAL_MS = 2000;

export type AiScreeningOutcome =
  | { status: "completed"; data: any; elapsedSeconds: number }
  | { status: "failed"; error: string; elapsedSeconds: number }
  | { status: "timeout"; elapsedSeconds: number }
  | { status: "stopped"; elapsedSeconds: number };

export type RunAiScreeningOptions = {
  /** Called every `progressEvery` polls so callers can render elapsed time. */
  onProgress?: (elapsedSeconds: number, attempt: number) => void;
  /** Polled before each wait; return true to abandon without failing. */
  shouldStop?: () => boolean;
  pollIntervalMs?: number;
  maxAttempts?: number;
  progressEvery?: number;
};

/**
 * Throws if the job could not be dispatched at all — callers already wrap this
 * in try/catch. A pipeline that starts and then fails, times out or is stopped
 * comes back as an outcome instead, since those are normal results to render.
 */
export async function runAiScreening(
  leadId: string | number,
  options: RunAiScreeningOptions = {}
): Promise<AiScreeningOutcome> {
  const {
    onProgress,
    shouldStop,
    pollIntervalMs = AI_SCREENING_POLL_INTERVAL_MS,
    maxAttempts = AI_SCREENING_MAX_ATTEMPTS,
    progressEvery = 5,
  } = options;

  const dispatchRes = await apiFetch(`/leads/${leadId}/ai-screening/dispatch`, { method: "POST" });
  const dispatchJson = await dispatchRes.json().catch(() => ({}));
  if (!dispatchRes.ok || !dispatchJson?.success) {
    throw new Error(
      dispatchJson?.error || dispatchJson?.message || `Failed to start screening (${dispatchRes.status})`
    );
  }

  const startedAt = Date.now();
  const elapsed = () => Math.round((Date.now() - startedAt) / 100) / 10;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (shouldStop?.()) return { status: "stopped", elapsedSeconds: elapsed() };

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));

    if (onProgress && attempt % progressEvery === 0) onProgress(elapsed(), attempt);

    try {
      const statusRes = await apiFetch(`/leads/${leadId}/ai-screening/status`);
      if (!statusRes.ok) continue;

      const statusJson = await statusRes.json();
      if (statusJson.status === "completed") {
        return { status: "completed", data: statusJson.data ?? null, elapsedSeconds: elapsed() };
      }
      if (statusJson.status === "failed") {
        return {
          status: "failed",
          error: statusJson.error || "AI Screening failed on server.",
          elapsedSeconds: elapsed(),
        };
      }
    } catch (pollError) {
      // A dropped poll is not a failed pipeline; keep waiting unless this was
      // the last attempt, in which case the timeout below reports it.
      if (attempt >= maxAttempts) break;
    }
  }

  return { status: "timeout", elapsedSeconds: elapsed() };
}
