"use client";

import React from "react";
import { Loader2, AlertCircle, CheckCircle2, ChevronRight, Bookmark } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface SourceEvidence {
  website_sources?: string[];
  maps_sources?: string[];
  other_sources?: string[];
}

interface ProfilingData {
  company_name?: string;
  brand?: string;
  website?: string;
  address?: string;
  phone?: string;
  email?: string;
  industry?: string;
  industry_id?: number | string;
  sub_industry?: string;
  sub_industry_id?: number | string;
  business_category?: string;
  business_category_id?: number | string;
  company_size?: string;
  customer_story?: string;
  confidence?: "low" | "medium" | "high";
  evidence?: SourceEvidence;
  lat?: number;
  lng?: number;
}

interface AiProfilingPanelProps {
  status: "idle" | "researching" | "ready_for_review" | "failed";
  data: ProfilingData | null;
  onApply: (data: ProfilingData) => void;
  onClose: () => void;
}

export const AiProfilingPanel: React.FC<AiProfilingPanelProps> = ({
  status,
  data,
  onApply,
  onClose,
}) => {
  if (status === "idle") return null;

  return (
    <div className="border border-[var(--border)] rounded-xl p-4 bg-muted/40 my-2 space-y-4">
      <div className="flex items-center justify-between border-b pb-2">
        <h3 className="text-sm font-semibold flex items-center gap-2 text-[var(--brand)]">
          <Bookmark className="h-4 w-4" />
          AI Lead Profiler Research
        </h3>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-6 px-2 text-xs">
          Dismiss
        </Button>
      </div>

      {status === "researching" && (
        <div className="flex flex-col items-center justify-center py-6 space-y-2">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--brand)]" />
          <p className="text-sm text-muted-foreground animate-pulse">
            Researching public websites, Google Places, and mapping taxonomies...
          </p>
        </div>
      )}

      {status === "failed" && (
        <div className="flex items-center gap-3 text-destructive py-2 bg-destructive/10 p-3 rounded-lg border border-destructive/20 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Research Failed</p>
            <p className="text-xs text-muted-foreground">Unable to gather profiling details for this company name.</p>
          </div>
        </div>
      )}

      {status === "ready_for_review" && data && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Verification confidence:</span>
            <Badge variant={data.confidence === "high" ? "success" : data.confidence === "medium" ? "warning" : "neutral"}>
              {data.confidence ? data.confidence.toUpperCase() : "MEDIUM"}
            </Badge>
          </div>

          <div className="grid gap-3 text-xs">
            {data.company_name && (
              <div className="flex justify-between border-b pb-1">
                <span className="font-medium text-muted-foreground">Company Name</span>
                <span className="text-right font-semibold">{data.company_name}</span>
              </div>
            )}
            {data.brand && (
              <div className="flex justify-between border-b pb-1">
                <span className="font-medium text-muted-foreground">Brand</span>
                <span className="text-right">{data.brand}</span>
              </div>
            )}
            {data.website && (
              <div className="flex justify-between border-b pb-1">
                <span className="font-medium text-muted-foreground">Website</span>
                <span className="text-right text-[var(--brand)] break-all">{data.website}</span>
              </div>
            )}
            {data.address && (
              <div className="flex justify-between border-b pb-1">
                <span className="font-medium text-muted-foreground">Address</span>
                <span className="text-right max-w-[70%] line-clamp-2">{data.address}</span>
              </div>
            )}
            {data.industry && (
              <div className="flex justify-between border-b pb-1">
                <span className="font-medium text-muted-foreground">Industry</span>
                <span className="text-right font-semibold">{Array.isArray(data.industry) ? data.industry.join(', ') : data.industry}</span>
              </div>
            )}
            {data.sub_industry && (
              <div className="flex justify-between border-b pb-1">
                <span className="font-medium text-muted-foreground">Sub-Industry</span>
                <span className="text-right">{Array.isArray(data.sub_industry) ? data.sub_industry.join(', ') : data.sub_industry}</span>
              </div>
            )}
            {data.business_category && (
              <div className="flex justify-between border-b pb-1">
                <span className="font-medium text-muted-foreground">Business Category</span>
                <span className="text-right">{Array.isArray(data.business_category) ? data.business_category.join(', ') : data.business_category}</span>
              </div>
            )}
            {data.company_size && (
              <div className="flex justify-between border-b pb-1">
                <span className="font-medium text-muted-foreground">Company Size</span>
                <span className="text-right">{data.company_size} employees</span>
              </div>
            )}
          </div>

          {data.customer_story && (
            <div className="bg-muted p-2 rounded text-xs space-y-1">
              <span className="font-medium text-muted-foreground">Brief Company / Brand Story:</span>
              <p className="italic text-foreground line-clamp-3">{data.customer_story}</p>
            </div>
          )}

          {data.evidence && (data.evidence.website_sources?.length || data.evidence.maps_sources?.length) ? (
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Sources & Citations</span>
              <div className="flex flex-wrap gap-1">
                {data.evidence.website_sources?.map((s, idx) => (
                  <span key={idx} className="bg-muted px-1.5 py-0.5 rounded text-[10px] truncate max-w-[150px] border">
                    {s}
                  </span>
                ))}
                {data.evidence.maps_sources?.map((s, idx) => (
                  <span key={idx} className="bg-muted px-1.5 py-0.5 rounded text-[10px] truncate max-w-[150px] border">
                    Google Maps
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button size="sm" onClick={() => onApply(data)} className="w-full flex items-center justify-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Apply Profiling Data
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
