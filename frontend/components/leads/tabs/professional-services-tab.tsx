"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, ArrowRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PsEstimation, getEstimationsByLead } from "@/lib/api/professional-services";

interface ProfessionalServicesTabProps {
  leadId: number;
}

export function ProfessionalServicesTab({ leadId }: ProfessionalServicesTabProps) {
  const [estimations, setEstimations] = useState<PsEstimation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEstimations = async () => {
      try {
        setLoading(true);
        const data = await getEstimationsByLead(leadId);
        setEstimations(data);
      } catch (error) {
        console.error("Failed to load estimations for lead:", error);
      } finally {
        setLoading(false);
      }
    };
    
    if (leadId) loadEstimations();
  }, [leadId]);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(amount);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Professional Services</h2>
          <p className="text-sm text-muted-foreground">Manage service estimations for this lead.</p>
        </div>
        <Button onClick={() => window.location.href = `/professional-services/estimations/new?lead_id=${leadId}`}>
          <Plus className="mr-2 h-4 w-4" /> Create Estimation
        </Button>
      </div>

      {loading ? (
        <div className="py-8 text-center text-muted-foreground">Loading estimations...</div>
      ) : (!estimations || estimations.length === 0) ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-3 mb-4">
              <ExternalLink className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg">No Estimations Yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-1">
              Create a professional services estimation to calculate project scope, mandays, and fees for this lead.
            </p>
            <Button className="mt-4" onClick={() => window.location.href = `/professional-services/estimations/new?lead_id=${leadId}`}>
              <Plus className="mr-2 h-4 w-4" /> Create First Estimation
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {estimations.map((est) => (
            <Card key={est.id} className="flex flex-col hover:border-primary/50 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <Badge variant="outline" className="mb-2">{est.estimation_number}</Badge>
                    <CardTitle className="text-base line-clamp-1" title={est.title}>{est.title}</CardTitle>
                  </div>
                  <Badge variant={est.status === 'approved' ? 'brand' : est.status === 'converted_to_quotation' ? 'neutral' : 'outline'}>
                    {est.status.replace(/_/g, " ").toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pb-4 flex-1">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs">Total ManDays</p>
                    <p className="font-medium">{est.total_final_mandays}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs">Estimated Fee</p>
                    <p className="font-medium text-[color:var(--brand)]">{formatCurrency(est.total_estimated_fee, est.currency_code)}</p>
                  </div>
                </div>
              </CardContent>
              <div className="border-t p-4 flex justify-end bg-muted/20">
                <Button variant="ghost" size="sm" onClick={() => window.location.href = `/professional-services/estimations/${est.id}`} className="hover:bg-primary/10 hover:text-primary">
                  View Details <ArrowRight className="ml-2 h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
