"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  GripVertical,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/apiFetch";
import { cn } from "@/lib/utils";

type BantcCategory = "Budget" | "Authority" | "Need" | "Timeline" | "Competition";

export type BantcQuestion = {
  id: string;
  text: string;
  category: BantcCategory;
  order: number;
};

type GuideData = {
  questions: BantcQuestion[];
  ai_generated: boolean;
  ai_model: string | null;
  updated_at: string | null;
};

const CATEGORY_COLORS: Record<BantcCategory, string> = {
  Budget: "warning",
  Authority: "brand",
  Need: "info",
  Timeline: "success",
  Competition: "danger",
};

const ALL_CATEGORIES: BantcCategory[] = [
  "Budget",
  "Authority",
  "Need",
  "Timeline",
  "Competition",
];

function nanoid(len = 8) {
  return Math.random().toString(36).slice(2, 2 + len);
}

function reorder(arr: BantcQuestion[]): BantcQuestion[] {
  return arr.map((q, i) => ({ ...q, order: i + 1 }));
}

function errorMessageFromPayload(payload: any, fallback: string) {
  const candidate = payload?.error ?? payload?.message;

  if (typeof candidate === "string") {
    return candidate;
  }

  if (candidate && typeof candidate === "object") {
    return candidate.message ?? candidate.error ?? JSON.stringify(candidate);
  }

  return fallback;
}

function QuestionRow({
  question,
  index,
  total,
  onChange,
  onDelete,
  onMove,
}: {
  question: BantcQuestion;
  index: number;
  total: number;
  onChange: (id: string, patch: Partial<BantcQuestion>) => void;
  onDelete: (id: string) => void;
  onMove: (from: number, to: number) => void;
}) {
  const [showCatPicker, setShowCatPicker] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showCatPicker) return;

    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShowCatPicker(false);
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showCatPicker]);

  const catVariant = (CATEGORY_COLORS[question.category] ?? "neutral") as any;

  return (
    <div className="group flex items-start gap-2 rounded-xl border border-border bg-background p-3 transition-colors hover:border-[color:var(--brand)]/30">
      <div className="flex flex-col gap-0.5 pt-0.5">
        <button
          type="button"
          disabled={index === 0}
          onClick={() => onMove(index, index - 1)}
          className="rounded p-0.5 text-muted-foreground/40 hover:text-muted-foreground disabled:opacity-20"
          title="Move up"
          aria-label="Move question up"
        >
          <GripVertical className="h-4 w-4 rotate-180" />
        </button>
        <button
          type="button"
          disabled={index === total - 1}
          onClick={() => onMove(index, index + 1)}
          className="rounded p-0.5 text-muted-foreground/40 hover:text-muted-foreground disabled:opacity-20"
          title="Move down"
          aria-label="Move question down"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </div>

      <span className="mt-1.5 min-w-[20px] text-xs font-bold tabular-nums text-muted-foreground/60">
        {index + 1}.
      </span>

      <textarea
        value={question.text}
        onChange={(e) => onChange(question.id, { text: e.target.value })}
        rows={2}
        className="flex-1 resize-none rounded-lg border-0 bg-transparent py-0.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0"
        placeholder="Enter a BANTC discovery question..."
      />

      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setShowCatPicker((v) => !v)}
          className="flex items-center gap-1 rounded-md transition-opacity hover:opacity-80"
        >
          <Badge variant={catVariant} className="whitespace-nowrap text-[10px]">
            {question.category}
          </Badge>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>

        {showCatPicker && (
          <div className="absolute right-0 top-7 z-30 min-w-[150px] rounded-xl border border-border bg-card shadow-xl">
            {ALL_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  onChange(question.id, { category: cat });
                  setShowCatPicker(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-muted/50",
                  cat === question.category && "font-semibold text-[color:var(--brand)]"
                )}
              >
                <Badge variant={(CATEGORY_COLORS[cat] ?? "neutral") as any} className="text-[10px]">
                  {cat}
                </Badge>
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => onDelete(question.id)}
        className="mt-0.5 rounded p-1 text-muted-foreground/40 opacity-0 transition-opacity hover:text-[color:var(--status-danger)] group-hover:opacity-100"
        title="Delete question"
        aria-label="Delete question"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function LeadBantcQuestionGuide({ leadId }: { leadId: number | string }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<BantcQuestion[] | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [lastAiModel, setLastAiModel] = useState<string | null>(null);
  const [justGenerated, setJustGenerated] = useState(false);

  const { data, isLoading } = useQuery<GuideData>({
    queryKey: ["lead-bantc-questions", leadId],
    queryFn: async () => {
      const r = await apiFetch(`/leads/${leadId}/bantc-questions`);
      const j = await r.json();
      return j.data as GuideData;
    },
  });

  useEffect(() => {
    if (data && draft === null) {
      setDraft(data.questions.length > 0 ? [...data.questions] : null);
    }
  }, [data, draft]);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const r = await apiFetch(`/leads/${leadId}/bantc-questions/generate`, { method: "POST" });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(errorMessageFromPayload(j, `Failed (${r.status})`));
      }
      return r.json() as Promise<{ data: BantcQuestion[]; ai_model: string | null }>;
    },
    onSuccess: ({ data: questions, ai_model }) => {
      setDraft(questions);
      setLastAiModel(ai_model);
      setIsDirty(true);
      setJustGenerated(true);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (questions: BantcQuestion[]) => {
      const r = await apiFetch(`/leads/${leadId}/bantc-questions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questions,
          ai_generated: justGenerated || (data?.ai_generated ?? false),
          ai_model: lastAiModel ?? data?.ai_model ?? null,
        }),
      });

      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(errorMessageFromPayload(j, `Save failed (${r.status})`));
      }

      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead-bantc-questions", leadId] });
      setIsDirty(false);
      setJustGenerated(false);
    },
  });

  const updateQuestion = (id: string, patch: Partial<BantcQuestion>) => {
    setDraft((prev) => prev ? prev.map((q) => q.id === id ? { ...q, ...patch } : q) : prev);
    setIsDirty(true);
  };

  const deleteQuestion = (id: string) => {
    setDraft((prev) => prev ? reorder(prev.filter((q) => q.id !== id)) : prev);
    setIsDirty(true);
  };

  const addQuestion = () => {
    const newQ: BantcQuestion = {
      id: nanoid(),
      text: "",
      category: "Need",
      order: (draft?.length ?? 0) + 1,
    };
    setDraft((prev) => [...(prev ?? []), newQ]);
    setIsDirty(true);
  };

  const moveQuestion = (from: number, to: number) => {
    if (!draft) return;
    const next = [...draft];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setDraft(reorder(next));
    setIsDirty(true);
  };

  const handleSave = () => {
    if (!draft) return;
    saveMutation.mutate(draft);
  };

  const savedAt = data?.updated_at ? new Date(data.updated_at).toLocaleString() : null;
  const isEmpty = !draft || draft.length === 0;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[color:var(--brand)]/10">
              <Sparkles className="h-3.5 w-3.5 text-[color:var(--brand)]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold leading-none">Customer BANTC Question Guide</h3>
              {savedAt && !isDirty && (
                <p className="mt-0.5 text-[10px] text-muted-foreground">Last saved {savedAt}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isDirty && (
              <span className="rounded-full bg-[color-mix(in_oklch,var(--status-warning)_15%,transparent)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--status-warning)]">
                Unsaved changes
              </span>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending || saveMutation.isPending}
              className="gap-1.5 border-[color:var(--brand)] text-[color:var(--brand)] hover:bg-[color:var(--brand)]/5"
            >
              {generateMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {generateMutation.isPending ? "Generating..." : draft && draft.length > 0 ? "Regenerate" : "Generate with AI"}
            </Button>

            {isDirty && (
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={saveMutation.isPending || isEmpty}
                className="gap-1.5"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                {saveMutation.isPending ? "Saving..." : "Save"}
              </Button>
            )}
          </div>
        </div>

        {justGenerated && !saveMutation.isSuccess && (
          <div className="flex items-start gap-2 rounded-lg border border-[color:var(--brand)]/20 bg-[color-mix(in_oklch,var(--brand)_8%,transparent)] px-3 py-2.5">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--brand)]" />
            <p className="text-xs text-[color:var(--brand)]">
              AI generated {draft?.length ?? 0} BANTC questions
              {lastAiModel ? ` using ${lastAiModel}` : ""}. Review and edit before saving.
            </p>
            <button
              type="button"
              onClick={() => setJustGenerated(false)}
              className="ml-auto text-[color:var(--brand)]/60 hover:text-[color:var(--brand)]"
              aria-label="Dismiss generated notice"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {generateMutation.isError && (
          <p className="rounded-lg border border-[color:var(--status-danger)]/30 bg-[color-mix(in_oklch,var(--status-danger)_8%,transparent)] px-3 py-2 text-xs text-[color:var(--status-danger)]">
            {(generateMutation.error as Error).message}
          </p>
        )}
        {saveMutation.isError && (
          <p className="rounded-lg border border-[color:var(--status-danger)]/30 bg-[color-mix(in_oklch,var(--status-danger)_8%,transparent)] px-3 py-2 text-xs text-[color:var(--status-danger)]">
            {(saveMutation.error as Error).message}
          </p>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : isEmpty ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 py-10 text-center">
            <Sparkles className="mx-auto mb-3 h-7 w-7 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">No BANTC question guide yet</p>
            <p className="mt-1 px-4 text-xs text-muted-foreground/70">
              Click <strong>Generate with AI</strong> to create customer-specific Budget, Authority, Need, Timeline, and Competition questions. Save only when you want to use it.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {draft?.map((q, idx) => (
              <QuestionRow
                key={q.id}
                question={q}
                index={idx}
                total={draft.length}
                onChange={updateQuestion}
                onDelete={deleteQuestion}
                onMove={moveQuestion}
              />
            ))}
          </div>
        )}

        {!isEmpty && (
          <button
            type="button"
            onClick={addQuestion}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-[color:var(--brand)]/40 hover:text-[color:var(--brand)]"
          >
            <Plus className="h-3.5 w-3.5" />
            Add question manually
          </button>
        )}

        {!isEmpty && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {ALL_CATEGORIES.map((cat) => (
              <Badge key={cat} variant={(CATEGORY_COLORS[cat] ?? "neutral") as any} className="text-[10px]">
                {cat}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
