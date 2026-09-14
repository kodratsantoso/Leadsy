"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Layers, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { apiFetch } from "@/lib/apiFetch";

type IndustrySummaryRow = {
  industry_id: number | null;
  name: string;
  count: number;
};

export default function LeadsByIndustryPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["leads-industry-summary"],
    queryFn: async () => {
      const response = await apiFetch("/leads/industry-summary");
      return response.json();
    },
  });

  const rows: IndustrySummaryRow[] = Array.isArray(data?.data) ? data.data : [];

  return (
    <div className="space-y-6 p-6">
      <div>
        <Link
          href="/leads"
          className="inline-flex items-center text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mb-1.5"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1" />
          Kembali ke Leads
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Layers className="h-6 w-6 text-[color:var(--brand)]" />
          Leads by Industry
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pilih satu industri untuk melihat semua leads yang tergolong di dalamnya.
        </p>
      </div>

      <Card className="divide-y divide-border overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">No leads found.</div>
        ) : (
          rows.map((row) => {
            const href = row.industry_id !== null ? `/leads/industry/${row.industry_id}` : `/leads/industry/unassigned`;
            return (
              <Link
                key={row.industry_id ?? "unassigned"}
                href={href}
                className="flex items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-accent/30"
              >
                <div className="flex items-center gap-3">
                  <Layers
                    className={
                      row.industry_id === null
                        ? "h-4 w-4 text-muted-foreground"
                        : "h-4 w-4 text-[color:var(--brand)]"
                    }
                  />
                  <span className="text-sm font-medium">{row.name}</span>
                  <Badge variant={row.industry_id === null ? "outline" : "neutral"}>{row.count}</Badge>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            );
          })
        )}
      </Card>
    </div>
  );
}
