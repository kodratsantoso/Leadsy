"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Loader2, Globe, Check, X } from "lucide-react";

type Props = {
  product: any;
};

function formatValue(val: any) {
  if (!val) return "—";
  try {
    const parsed = JSON.parse(val);
    if (Array.isArray(parsed)) {
      return (
        <ul className="list-disc list-inside space-y-1">
          {parsed.map((item: any, i: number) => (
            <li key={i}>{String(item)}</li>
          ))}
        </ul>
      );
    }
    if (typeof parsed === "object") {
      return <pre className="whitespace-pre-wrap text-[10px]">{JSON.stringify(parsed, null, 2)}</pre>;
    }
    return String(parsed);
  } catch {
    return String(val);
  }
}

export function ProductScrapeAndCompare({ product }: Props) {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const { data: latestComparison, isLoading: loadingComparison } = useQuery({
    queryKey: ["product-comparison", product.id],
    queryFn: () => apiFetch(`/api/products/${product.id}/latest-comparison`).then(res => res.json()).catch(() => null),
  });

  const scrapeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch(`/api/products/${product.id}/scrape-and-compare`, { method: "POST" });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Unknown server error" }));
        throw new Error(errorData.message || "Failed to scrape product");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-comparison", product.id] });
      setShowModal(true);
    },
    onError: (err: any) => {
      console.error("Failed to scrape product", err);
      setErrorMsg(err.message || "An error occurred while scraping the product.");
    }
  });

  const approveMutation = useMutation({
    mutationFn: (comparisonId: number) => apiFetch(`/api/products/${product.id}/comparisons/${comparisonId}/approve`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-comparison", product.id] });
      qc.invalidateQueries({ queryKey: ["products"] });
      setShowModal(false);
    }
  });

  const rejectMutation = useMutation({
    mutationFn: (comparisonId: number) => apiFetch(`/api/products/${product.id}/comparisons/${comparisonId}/reject`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-comparison", product.id] });
      setShowModal(false);
    }
  });

  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setErrorMsg("");
              if (latestComparison && latestComparison.status === 'draft') {
                setShowModal(true);
              } else {
                scrapeMutation.mutate();
              }
            }}
            disabled={scrapeMutation.isPending || !product.website_url}
            className="border-[color:var(--brand)] text-[color:var(--brand)] hover:bg-[color:var(--brand)]/10"
          >
            {scrapeMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Globe className="h-4 w-4 mr-2" />}
            {latestComparison?.status === 'draft' ? "Review Pending Changes" : "Scrape & Compare"}
          </Button>
          {!product.website_url && (
            <span className="text-xs text-muted-foreground">Add a website URL to the product to enable scraping.</span>
          )}
        </div>
        {errorMsg && (
          <span className="text-xs text-destructive font-medium">{errorMsg}</span>
        )}
      </div>

      <Modal
        open={showModal}
        onOpenChange={setShowModal}
        title="Product Specification Comparison"
        description="Review the AI-detected changes between the current CRM data and the scraped website."
        size="xl"
      >
        {latestComparison && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Confidence Score</p>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-32 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-[color:var(--brand)]" style={{ width: `${latestComparison.confidence_score}%` }} />
                  </div>
                  <span className="text-xs font-bold">{latestComparison.confidence_score}%</span>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">Scraped at: {new Date(latestComparison.created_at).toLocaleString()}</span>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-semibold uppercase tracking-wide">Suggested Updates</h4>
              {latestComparison.update_suggestions?.length > 0 ? (
                <div className="space-y-3">
                  {latestComparison.update_suggestions.map((sug: any) => (
                    <div key={sug.id} className="border border-border rounded-lg p-4 bg-muted/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase">{sug.field_name}</span>
                        <span className="text-[10px] uppercase font-semibold px-2 py-1 rounded bg-muted/50 border border-border">
                          {sug.change_type}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Current</p>
                          <div className="text-rose-500 line-through opacity-80">
                            {formatValue(sug.current_value)}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Suggested</p>
                          <div className="text-emerald-500">
                            {formatValue(sug.suggested_value)}
                          </div>
                        </div>
                      </div>
                      {sug.reason && (
                        <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border/50">
                          <span className="font-semibold text-foreground">Reason:</span> {sug.reason}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No significant changes detected.</p>
              )}
            </div>

            {latestComparison.status === 'draft' && (
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button variant="outline" onClick={() => rejectMutation.mutate(latestComparison.id)} disabled={rejectMutation.isPending}>
                  {rejectMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <X className="h-4 w-4 mr-2" />}
                  Reject All
                </Button>
                <Button onClick={() => approveMutation.mutate(latestComparison.id)} disabled={approveMutation.isPending}>
                  {approveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                  Approve & Apply
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
