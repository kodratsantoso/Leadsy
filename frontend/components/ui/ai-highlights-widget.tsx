"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, Info, CheckCircle, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  entityType?: string;
  entityId?: number;
};

export function AiHighlightsWidget({ entityType, entityId }: Props) {
  const qc = useQueryClient();

  const queryKey = ["ai-highlights", entityType, entityId];
  let url = "/api/ai-highlights";
  if (entityType && entityId) {
    url += `?entity_type=${entityType}&entity_id=${entityId}`;
  }

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => apiFetch(url).then((res) => res.json()),
  });

  const resolveMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/ai-highlights/${id}/resolve`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  const highlights = data?.data || [];
  if (highlights.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4 text-amber-500" />
        <h3 className="text-sm font-semibold uppercase tracking-wide">AI Intelligence Highlights</h3>
      </div>
      <div className="grid gap-3">
        {highlights.map((highlight: any) => {
          const typeColor = 
            highlight.highlight_type === "risk" ? "border-rose-500/20 bg-rose-500/5 text-rose-600" :
            highlight.highlight_type === "opportunity" ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-600" :
            highlight.highlight_type === "data_gap" ? "border-amber-500/20 bg-amber-500/5 text-amber-600" :
            "border-blue-500/20 bg-blue-500/5 text-blue-600";

          const Icon = 
            highlight.highlight_type === "risk" ? AlertTriangle :
            highlight.highlight_type === "opportunity" ? Zap :
            highlight.highlight_type === "data_gap" ? Info :
            Info;

          return (
            <div key={highlight.id} className={cn("flex flex-col sm:flex-row sm:items-start gap-4 p-4 rounded-xl border", typeColor)}>
              <div className="mt-0.5 shrink-0">
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold uppercase tracking-wide">{highlight.highlight_type.replace('_', ' ')}</p>
                  <span className="text-[10px] font-semibold bg-background/50 px-2 py-0.5 rounded border border-border">
                    {highlight.severity} severity
                  </span>
                </div>
                <p className="text-sm opacity-90 leading-relaxed">{highlight.description}</p>
                {highlight.suggested_action && (
                  <p className="text-xs font-semibold mt-2 pt-2 border-t border-current/10">
                    Action: {highlight.suggested_action}
                  </p>
                )}
              </div>
              <div className="shrink-0 mt-2 sm:mt-0">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full sm:w-auto h-8 text-xs bg-background/50 hover:bg-background border-current/20 hover:border-current/50"
                  onClick={() => resolveMutation.mutate(highlight.id)}
                  disabled={resolveMutation.isPending}
                >
                  {resolveMutation.isPending ? <Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> : <CheckCircle className="h-3 w-3 mr-1.5" />}
                  Resolve
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
