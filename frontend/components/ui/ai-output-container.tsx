"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Loader2, History, Check, Edit2, Info, User, Clock, AlertTriangle } from "lucide-react";

type Props = {
  outputId: number;
};

export function AiOutputContainer({ outputId }: Props) {
  const qc = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editedJsonStr, setEditedJsonStr] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  const { data: output, isLoading } = useQuery({
    queryKey: ["ai-output", outputId],
    queryFn: () => apiFetch(`/api/ai-outputs/${outputId}/history`).then((res) => res.json()),
  });

  const updateMutation = useMutation({
    mutationFn: (newJson: any) =>
      apiFetch(`/api/ai-outputs/${outputId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edited_output_json: newJson }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-output", outputId] });
      setIsEditing(false);
    },
    onError: (err: any) => {
      console.error("Failed to update AI output", err);
    },
  });

  const approveMutation = useMutation({
    mutationFn: () => apiFetch(`/api/ai-outputs/${outputId}/approve`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-output", outputId] });
    },
  });

  if (isLoading) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  if (!output) return null;

  const handleSave = () => {
    try {
      const parsed = JSON.parse(editedJsonStr);
      updateMutation.mutate(parsed);
    } catch (e) {
      console.error("Invalid JSON format", e);
      setEditedJsonStr("INVALID JSON: " + editedJsonStr);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
      <div className="bg-[color:var(--brand)]/10 px-4 py-3 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-[color:var(--brand)]" />
          <h4 className="text-sm font-semibold text-[color:var(--brand)]">AI Generated Output</h4>
          <span className="text-[10px] uppercase bg-[color:var(--brand)] text-white px-2 py-0.5 rounded-full font-bold ml-2">
            {output.status}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs font-semibold"
            onClick={() => setShowHistory(!showHistory)}
          >
            <History className="h-3 w-3 mr-1.5" />
            History ({output.versions?.length || 0})
          </Button>
          {!isEditing && output.status !== 'approved' && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs border-[color:var(--brand)] text-[color:var(--brand)] hover:bg-[color:var(--brand)]/10"
              onClick={() => {
                setEditedJsonStr(JSON.stringify(output.current_output_json, null, 2));
                setIsEditing(true);
              }}
            >
              <Edit2 className="h-3 w-3 mr-1.5" />
              Edit Output
            </Button>
          )}
          {output.status !== 'approved' && (
            <Button
              size="sm"
              className="h-8 text-xs"
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending || isEditing}
            >
              {approveMutation.isPending ? <Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> : <Check className="h-3 w-3 mr-1.5" />}
              Approve
            </Button>
          )}
        </div>
      </div>

      <div className="p-4 bg-muted/10">
        {isEditing ? (
          <div className="space-y-3">
            <div className="flex items-center text-xs text-amber-500 font-bold bg-amber-500/10 p-2 rounded border border-amber-500/20">
              <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
              WARNING: Editing raw JSON directly. Ensure valid format.
            </div>
            <Textarea
              className="font-mono text-xs min-h-[300px] bg-background"
              value={editedJsonStr}
              onChange={(e) => setEditedJsonStr(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}
                Save Edit
              </Button>
            </div>
          </div>
        ) : (
          <pre className="text-xs font-mono bg-background p-4 rounded-md border border-border overflow-x-auto">
            {JSON.stringify(output.current_output_json, null, 2)}
          </pre>
        )}

        {showHistory && output.versions && output.versions.length > 0 && (
          <div className="mt-6 pt-4 border-t border-border">
            <h5 className="text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <History className="h-4 w-4" />
              Version History
            </h5>
            <div className="space-y-4 border-l-2 border-border ml-2 pl-4">
              {output.versions.map((ver: any, i: number) => (
                <div key={ver.id} className="relative">
                  <div className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-[color:var(--brand)] ring-4 ring-background" />
                  <div className="bg-background rounded-lg border border-border p-3 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold bg-muted px-2 py-0.5 rounded">v{ver.version_number}</span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(ver.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 mb-3">
                      <p className="text-xs flex items-center gap-1">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span className="font-semibold">{ver.changed_by?.name || "System"}</span>
                        <span className="text-muted-foreground mx-1">•</span>
                        <span className="text-muted-foreground">{ver.change_type}</span>
                      </p>
                      <p className="text-xs font-medium text-muted-foreground">{ver.change_summary}</p>
                    </div>
                    <details className="text-xs">
                      <summary className="cursor-pointer text-[color:var(--brand)] font-semibold hover:underline">View Snapshot</summary>
                      <pre className="mt-2 text-[10px] p-2 bg-muted rounded overflow-x-auto">
                        {JSON.stringify(ver.output_json, null, 2)}
                      </pre>
                    </details>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
