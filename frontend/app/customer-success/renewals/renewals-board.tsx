"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, AlertTriangle, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getRenewalOpportunities, RenewalOpportunity, RenewalUrgency, RenewalOpportunityType } from "@/lib/api/customer-success";

const URGENCY_VARIANT: Record<RenewalUrgency, "neutral" | "warning" | "danger"> = {
  normal: "neutral",
  high: "warning",
  critical: "danger",
};

const TYPE_LABEL: Record<RenewalOpportunityType, string> = {
  renewal: "Renewal",
  upsell: "Upsell",
  cross_sell: "Cross-Sell",
};

function formatCurrency(amount: number | null | undefined) {
  if (amount === null || amount === undefined) return "-";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export function RenewalsBoard() {
  const [opportunities, setOpportunities] = useState<RenewalOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getRenewalOpportunities()
      .then(setOpportunities)
      .catch(e => { console.error(e); setError("Failed to load renewal opportunities."); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
        <AlertTriangle className="w-4 h-4" /> {error}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{opportunities.length} Opportunities</CardTitle>
      </CardHeader>
      <CardContent>
        {opportunities.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground border rounded-md border-dashed">
            No renewal or cross-sell opportunities identified yet.
          </div>
        ) : (
          <div className="border rounded-md">
            <div className="flex items-center justify-between p-3 bg-muted/50 border-b text-sm font-medium">
              <div className="flex-1">Customer</div>
              <div className="w-28">Type</div>
              <div className="w-32 text-right">Contract End</div>
              <div className="w-24 text-right">Est. Value</div>
              <div className="w-24 text-right">Urgency</div>
              <div className="w-8" />
            </div>
            <div className="divide-y">
              {opportunities.map(o => (
                <Link
                  key={o.id}
                  href={`/customer-success/${o.lead_id}`}
                  className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{o.lead?.company_name ?? `Lead #${o.lead_id}`}</p>
                    {o.reasoning && <p className="text-xs text-muted-foreground truncate">{o.reasoning}</p>}
                  </div>
                  <div className="w-28 text-sm">{TYPE_LABEL[o.opportunity_type]}</div>
                  <div className="w-32 text-right text-sm text-muted-foreground">
                    {o.current_contract_end ? new Date(o.current_contract_end).toLocaleDateString() : "-"}
                  </div>
                  <div className="w-24 text-right text-sm">{formatCurrency(o.estimated_value)}</div>
                  <div className="w-24 text-right">
                    <Badge variant={URGENCY_VARIANT[o.urgency]}>{o.urgency}</Badge>
                  </div>
                  <div className="w-8 flex justify-end">
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
