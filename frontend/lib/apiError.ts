/**
 * One place that turns any failed API call into something a user can act on.
 *
 * Before this existed, fifty-odd components each parsed error bodies their own way, and
 * most of them ended at `body.message || "Failed to save"`. When the backend answered with
 * its generic fallback, the screen showed "An unexpected server error occurred." and the
 * user had no idea whether they had mistyped a field, lost their session, or hit an outage.
 *
 * The backend now classifies its own failures (see ApiErrorTranslator). This module reads
 * that shape, and covers the cases the backend never gets to answer at all: the browser
 * being offline, the proxy returning HTML, a request that never completes.
 */

export type ApiErrorInfo = {
  /** HTTP status, or 0 when the request never reached a server. */
  status: number;
  /** Machine-readable cause, e.g. VALIDATION_ERROR, FORBIDDEN, DUPLICATE_VALUE. */
  code: string;
  /** One sentence naming what went wrong. Always safe to show. */
  title: string;
  /** What the user can do about it, when we know. */
  detail?: string;
  /** Field name -> messages, for highlighting the inputs that need fixing. */
  fields: Record<string, string[]>;
  /** Support code that matches a single line in the server log. Only on real faults. */
  reference?: string;
  /** True when the request never reached the server, so retrying is the right advice. */
  isOffline: boolean;
};

/** Thrown by `throwIfApiError`, so React Query's `error` carries the full description. */
export class ApiError extends Error {
  readonly info: ApiErrorInfo;

  constructor(info: ApiErrorInfo) {
    super(info.title);
    this.name = "ApiError";
    this.info = info;
  }
}

/** Last-resort wording for statuses the backend did not describe itself. */
const STATUS_FALLBACK: Record<number, { title: string; detail?: string }> = {
  0: {
    title: "Could not reach the server.",
    detail: "Check your internet connection, then try again. Nothing was saved.",
  },
  400: { title: "The request could not be read.", detail: "Reload the page and try again." },
  401: { title: "Your session has ended.", detail: "Sign in again to continue." },
  403: {
    title: "You do not have access to this record.",
    detail: "Ask an administrator to assign it to you or to check your role.",
  },
  404: { title: "This record no longer exists.", detail: "It may have been deleted or moved to Trash." },
  409: {
    title: "Someone else changed this record while you had it open.",
    detail: "Reload the page so you do not overwrite their work, then try again.",
  },
  413: { title: "The file is too large to upload." },
  419: { title: "Your session expired.", detail: "Sign in again to continue." },
  422: { title: "Some of the information could not be saved." },
  429: { title: "Too many requests in a short time.", detail: "Wait about a minute, then try again." },
  500: {
    title: "Something went wrong on our side.",
    detail: "Reload the page to see whether it went through, and send the reference code to your administrator if it keeps happening.",
  },
  502: { title: "The server did not answer correctly.", detail: "Try again in a moment." },
  503: {
    title: "The service is temporarily unavailable.",
    detail: "This usually happens during a deployment. Try again in a minute.",
  },
  504: {
    title: "This took too long and was stopped.",
    detail: "If it was an AI analysis it keeps running in the background — reload in a few minutes.",
  },
};

function fallbackFor(status: number): { title: string; detail?: string } {
  if (STATUS_FALLBACK[status]) return STATUS_FALLBACK[status];
  if (status >= 500) return STATUS_FALLBACK[500];
  if (status >= 400) return STATUS_FALLBACK[400];
  return { title: `The request failed (${status}).` };
}

function codeForStatus(status: number): string {
  if (status === 0) return "NETWORK_ERROR";
  if (status >= 500) return "SERVER_ERROR";
  return "HTTP_ERROR";
}

/** Collapse Laravel's `{field: [msg, ...]}` into a flat, ordered list. */
export function flattenFieldErrors(fields: Record<string, string[]>): string[] {
  return Object.values(fields).flat().filter(Boolean);
}

/**
 * Read a non-OK Response into a description.
 *
 * Never throws: a body that is HTML, empty, or truncated mid-stream still produces a
 * usable message, because the status alone is enough to say something true.
 */
export async function readApiError(res: Response, fallbackTitle?: string): Promise<ApiErrorInfo> {
  let body: Record<string, unknown> | null = null;
  try {
    const text = await res.text();
    if (text) body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    // An HTML error page from the proxy, or a connection cut mid-body. The status carries
    // the meaning in that case, so there is nothing to recover here.
  }

  const fallback = fallbackFor(res.status);
  const err = (body?.error ?? {}) as {
    code?: string;
    message?: string;
    hint?: string;
    details?: Record<string, string[]>;
    reference?: string;
  };

  // Laravel puts field errors at the top level; our translator mirrors them under error.details.
  const fields = (body?.errors ?? err.details ?? {}) as Record<string, string[]>;

  const serverMessage: string | undefined =
    typeof err.message === "string" && err.message
      ? err.message
      : typeof body?.message === "string" && body.message
        ? body.message
        : undefined;

  return {
    status: res.status,
    code: err.code || codeForStatus(res.status),
    title: serverMessage || fallbackTitle || fallback.title,
    detail: err.hint || (serverMessage ? undefined : fallback.detail),
    fields: fields && typeof fields === "object" ? fields : {},
    reference: typeof err.reference === "string" ? err.reference : undefined,
    isOffline: res.status === 0,
  };
}

/**
 * The shape to use inside a React Query `mutationFn`:
 *
 *     const res = await apiFetch(url, init);
 *     await throwIfApiError(res, "This lead could not be saved.");
 *     return res.json();
 *
 * `mutation.error` is then an ApiError, and `<ErrorNotice error={mutation.error} />`
 * renders the reason, the field list and the reference code with no further work.
 */
export async function throwIfApiError(res: Response, fallbackTitle?: string): Promise<void> {
  if (res.ok) return;
  throw new ApiError(await readApiError(res, fallbackTitle));
}

/**
 * Describe anything caught in a `catch` — an ApiError, a fetch failure, or a stray throw.
 *
 * `fetch` rejects with a bare `TypeError: Failed to fetch` when the network is down or the
 * request is blocked, which is meaningless on screen; that case becomes the offline message.
 */
export function describeThrown(e: unknown, fallbackTitle = "Something went wrong."): ApiErrorInfo {
  if (e instanceof ApiError) return e.info;

  const offline = typeof navigator !== "undefined" && navigator.onLine === false;
  const isFetchFailure =
    e instanceof TypeError ||
    (e instanceof Error && /failed to fetch|network|load failed/i.test(e.message));

  if (offline || isFetchFailure) {
    return {
      status: 0,
      code: "NETWORK_ERROR",
      title: offline ? "You are offline." : STATUS_FALLBACK[0].title,
      detail: STATUS_FALLBACK[0].detail,
      fields: {},
      isOffline: true,
    };
  }

  return {
    status: 0,
    code: "UNKNOWN",
    title: e instanceof Error && e.message ? e.message : fallbackTitle,
    fields: {},
    isOffline: false,
  };
}
