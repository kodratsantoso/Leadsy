"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, ClipboardCopy, Download, FileText, Send, Settings, AlertTriangle, MessageSquareQuote, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { 
  PsEstimation, 
  getEstimation, 
  approveEstimation,
  createProjectPlanFromEstimation
} from "@/lib/api/professional-services";
import { TaskBreakdownEditor } from "@/components/professional-services/task-breakdown-editor";
import { ConvertToQuotationModal } from "@/components/professional-services/modals/convert-to-quotation-modal";
import { PsDocumentList } from "@/components/professional-services/ps-document-list";
import { GovernancePanel } from "@/components/professional-services/governance/governance-panel";

export default function EstimationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const toast = (o: any) => console.log(o);
  const estimationId = parseInt(params.id as string);

  const [estimation, setEstimation] = useState<PsEstimation | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [convertModalOpen, setConvertModalOpen] = useState(false);

  useEffect(() => {
    if (estimationId) loadEstimation(estimationId);
  }, [estimationId]);

  const loadEstimation = async (estId: number) => {
    try {
      setLoading(true);
      const data = await getEstimation(estId);
      setEstimation(data);
    } catch (error) {
      toast({ title: "Failed to load estimation", variant: "destructive" });
      router.push("/professional-services");
    } finally {
      setLoading(false);
    }
  };

  const handleConversionSuccess = (data: any) => {
    toast({ title: "Converted successfully", description: `Quotation ${data.quotation_number} generated.` });
    loadEstimation(estimationId);
  };

  const handleCreateProjectPlan = async () => {
    try {
      setActionLoading(true);
      const plan = await createProjectPlanFromEstimation(estimationId);
      toast({ title: "Project Plan Created", description: `Plan ${plan.project_plan_number} generated.` });
      router.push(`/professional-services/project-plans/${plan.id}`);
    } catch (error: any) {
      toast({ title: "Failed to create project plan", description: error.message || "Unknown error", variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(amount);
  };

  if (loading || !estimation) {
    return <div className="text-center text-muted-foreground py-12">Loading estimation...</div>;
  }

  const roleBreakdown: Record<string, { mandays: number, fee: number }> = {};
  estimation.lines?.forEach(line => {
    const roleName = (line as any).role?.name || "Unknown Role";
    if (!roleBreakdown[roleName]) roleBreakdown[roleName] = { mandays: 0, fee: 0 };
    roleBreakdown[roleName].mandays += (line.final_mandays || 0);
    roleBreakdown[roleName].fee += (line.estimated_fee || 0);
  });

  return (
    <div className="flex h-full flex-col p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => router.back()}><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{estimation.title}</h1>
              <Badge variant="outline">{estimation.estimation_number}</Badge>
              <Badge variant={estimation.status === 'approved' ? 'brand' : estimation.status === 'converted_to_quotation' ? 'neutral' : 'outline'} className={estimation.status === 'approved' ? 'bg-green-600 hover:bg-green-700' : ''}>
                {estimation.status.replace(/_/g, " ").toUpperCase()}
              </Badge>
            </div>
            {estimation.lead && (
              <div className="flex items-center gap-3 mt-1">
                <p className="text-muted-foreground">Lead: {estimation.lead.company_name}</p>
                {estimation.converted_quotation_id && (
                  <Button variant="link" size="sm" className="h-auto p-0 text-purple-600" onClick={() => router.push(`/leads/${estimation.lead_id}?tab=quotations`)}>
                    View Quotation <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {(estimation.status === 'approved' || estimation.status === 'signed' || estimation.status === 'converted_to_quotation') && (
            <Button onClick={handleCreateProjectPlan} disabled={actionLoading} variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200">
              <ClipboardCopy className="h-4 w-4 mr-2" /> Create Project Plan
            </Button>
          )}
          {estimation.status === 'approved' || estimation.status === 'signed' ? (
            <Button onClick={() => setConvertModalOpen(true)} disabled={actionLoading} className="bg-purple-600 hover:bg-purple-700 text-white">
              <ClipboardCopy className="h-4 w-4 mr-2" /> Convert to Quotation
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          <TaskBreakdownEditor estimationId={estimation.id} onUpdate={() => loadEstimation(estimation.id)} />

          <Card>
            <CardHeader><CardTitle>Assumptions & Notes</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {estimation.assumptions && (
                <div className="space-y-1">
                  <h4 className="font-medium text-sm flex items-center text-blue-600"><MessageSquareQuote className="h-4 w-4 mr-2" /> Assumptions</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap p-3 bg-muted/50 rounded-md">{estimation.assumptions}</p>
                </div>
              )}
              {estimation.out_of_scope && (
                <div className="space-y-1">
                  <h4 className="font-medium text-sm flex items-center text-red-600"><AlertTriangle className="h-4 w-4 mr-2" /> Out of Scope</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap p-3 bg-red-50/50 dark:bg-red-900/10 rounded-md">{estimation.out_of_scope}</p>
                </div>
              )}
              {estimation.dependencies && (
                <div className="space-y-1">
                  <h4 className="font-medium text-sm flex items-center text-orange-600"><Settings className="h-4 w-4 mr-2" /> Dependencies</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap p-3 bg-orange-50/50 dark:bg-orange-900/10 rounded-md">{estimation.dependencies}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <PsDocumentList estimationId={estimation.id} />
        </div>

        {/* Right Column - Summary & Governance */}
        <div className="space-y-6">
          <GovernancePanel estimation={estimation} onUpdate={() => loadEstimation(estimation.id)} />

          <Card>
            <CardHeader className="bg-muted/30 border-b">
              <CardTitle className="text-lg">Financial Summary</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Final ManDays</p>
                <div className="text-xl font-bold">{estimation.lines?.reduce((sum, l: any) => sum + (l.final_mandays ? Number(l.final_mandays) : 0), 0) || 0}</div>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Estimated Fee</p>
                <div className="text-xl font-bold text-[color:var(--brand)]">{formatCurrency(estimation.lines?.reduce((sum, l: any) => sum + (l.estimated_fee ? Number(l.estimated_fee) : 0), 0) || 0, estimation.currency_code)}</div>
              </div>
              
              <div className="h-px bg-border my-4" />
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Category:</span><span className="font-medium">{(estimation as any).category?.name || '-'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Complexity:</span><span className="font-medium">{(estimation as any).complexityLevel?.name || '-'} (x{estimation.complexity_multiplier})</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Buffer:</span><span className="font-medium">{estimation.buffer_percentage}%</span></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Role Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(roleBreakdown).map(([role, data]) => (
                  <div key={role} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{role}</span>
                    <div className="text-right">
                      <div>{data.mandays} MD</div>
                      <div className="text-muted-foreground text-xs">{formatCurrency(data.fee, estimation.currency_code)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {estimation && convertModalOpen && (
        <ConvertToQuotationModal
          open={convertModalOpen}
          onOpenChange={setConvertModalOpen}
          estimation={estimation}
          onSuccess={handleConversionSuccess}
        />
      )}
    </div>
  );
}
