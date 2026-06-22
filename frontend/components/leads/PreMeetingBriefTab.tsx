import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiFetch';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ProgressiveFluxLoader } from '@/components/ui/progressive-flux-loader';
import {
  FileText, Plus, Target, CheckCircle, AlertTriangle, AlertCircle, RefreshCw, Printer, User, BrainCircuit, Activity, Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type PreMeetingBriefType = {
  id: number;
  meeting_type: string | null;
  input_context_json: any;
  customer_snapshot_json: any;
  industry_snapshot_json: any;
  business_category_snapshot_json: any;
  meeting_context_json: any;
  needs_pain_hypothesis_json: any;
  industry_pain_point_hypothesis_json: any;
  product_fit_hypothesis_json: any;
  product_industry_fit_json: any;
  bantc_discovery_plan_json: any;
  industry_based_bantc_questions_json: any;
  demo_strategy_json: any;
  industry_based_demo_strategy_json: any;
  stakeholder_strategy_json: any;
  risk_flags_json: string[];
  recommended_meeting_approach_json: any;
  readiness_score: number | null;
  readiness_status: string | null;
  data_completeness_score: number | null;
  industry_context_completeness_score: number | null;
  product_industry_fit_score: number | null;
  executive_brief: string | null;
  generated_at: string;
};

export function PreMeetingBriefTab({ leadId }: { leadId: string }) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<'view' | 'form'>('view');
  
  const [form, setForm] = useState({
    meeting_type: 'First Discovery Meeting',
    initial_needs: '',
    customer_objective: '',
    demo_expectation: '',
    pain_point: '',
    kpi_target: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['preMeetingBriefs', leadId],
    queryFn: () => apiFetch(`/leads/${leadId}/pre-meeting-brief?history=1`).then(r => r.json()),
  });

  const generateMutation = useMutation({
    mutationFn: async (inputs: typeof form) => {
      const res = await apiFetch(`/leads/${leadId}/pre-meeting-brief/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputs),
      });
      if (!res.ok) throw new Error('Failed to generate brief');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['preMeetingBriefs', leadId] });
      setMode('view');
    },
  });

  const briefs: PreMeetingBriefType[] = data?.data || [];
  const activeBrief = briefs.length > 0 ? briefs[0] : null;

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground"><RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" /> Loading Brief Engine...</div>;
  }

  if (mode === 'form' || (!activeBrief && mode === 'view')) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Generate Pre-Meeting Brief</h2>
            <p className="text-sm text-muted-foreground">Provide manual context to enrich the AI-generated sales readiness plan.</p>
          </div>
          {activeBrief && (
            <Button variant="ghost" onClick={() => setMode('view')}>Cancel</Button>
          )}
        </div>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Meeting Type</label>
              <Select value={form.meeting_type} onChange={e => setForm(f => ({ ...f, meeting_type: e.target.value }))}>
                <option value="First Discovery Meeting">First Discovery Meeting</option>
                <option value="Product Demo">Product Demo</option>
                <option value="Follow-up Meeting">Follow-up Meeting</option>
                <option value="Proposal Discussion">Proposal Discussion</option>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1.5 block">Initial Needs / Stated Problem</label>
              <Input placeholder="What did the customer state they need?" value={form.initial_needs} onChange={e => setForm(f => ({ ...f, initial_needs: e.target.value }))} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Customer Objective</label>
                <Input placeholder="What are they trying to achieve?" value={form.customer_objective} onChange={e => setForm(f => ({ ...f, customer_objective: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Demo Expectation</label>
                <Input placeholder="What do they expect to see?" value={form.demo_expectation} onChange={e => setForm(f => ({ ...f, demo_expectation: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Known Pain Points</label>
                <Input placeholder="Current operational challenge" value={form.pain_point} onChange={e => setForm(f => ({ ...f, pain_point: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">KPI / Business Target</label>
                <Input placeholder="Metrics they care about" value={form.kpi_target} onChange={e => setForm(f => ({ ...f, kpi_target: e.target.value }))} />
              </div>
            </div>

            <div className="pt-4 border-t border-border mt-4 flex justify-end">
              <Button onClick={() => generateMutation.mutate(form)} disabled={generateMutation.isPending}>
                {generateMutation.isPending ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <BrainCircuit className="mr-2 h-4 w-4" />}
                {generateMutation.isPending ? 'Generating Intelligence...' : 'Generate Pre-Meeting Brief'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!activeBrief) return null;

  return (
    <div className="space-y-8" id="pre-meeting-brief-container">
      {/* HEADER ACTION AREA */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Pre-Meeting Brief</h2>
          <p className="text-sm text-muted-foreground mt-1">Generated {new Date(activeBrief.generated_at).toLocaleString()}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Print / PDF
          </Button>
          <Button onClick={() => setMode('form')}>
            <RefreshCw className="mr-2 h-4 w-4" /> Regenerate
          </Button>
        </div>
      </div>

      {/* MISSING CONTEXT WARNING */}
      {activeBrief.industry_context_completeness_score === 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5 shrink-0" />
          <div className="text-sm">
            <h4 className="font-semibold text-yellow-800 dark:text-yellow-400">Missing Industry & Business Category</h4>
            <p className="text-yellow-700 dark:text-yellow-300 mt-1">
              Industry or Business Category context is missing. The product-fit accuracy, BANTC discovery plan, and demo strategy may be less accurate. We recommend updating the lead profile before full demo preparation.
            </p>
          </div>
        </div>
      )}

      {/* READINESS HEADER */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className={cn("p-6", 
          activeBrief.readiness_status === 'Ready' && "border-green-500/50 bg-green-500/5",
          activeBrief.readiness_status === 'Needs Clarification' && "border-yellow-500/50 bg-yellow-500/5",
          activeBrief.readiness_status === 'Not Ready' && "border-red-500/50 bg-red-500/5"
        )}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Readiness Status</p>
              <h3 className="text-2xl font-bold mt-1">{activeBrief.readiness_status}</h3>
            </div>
            {activeBrief.readiness_status === 'Ready' && <CheckCircle className="h-6 w-6 text-green-500" />}
            {activeBrief.readiness_status === 'Needs Clarification' && <AlertCircle className="h-6 w-6 text-yellow-500" />}
            {activeBrief.readiness_status === 'Not Ready' && <AlertTriangle className="h-6 w-6 text-red-500" />}
          </div>
        </Card>
        
        <Card className="p-6">
          <p className="text-sm font-medium text-muted-foreground">Readiness Score</p>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex-1">
              <ProgressiveFluxLoader value={activeBrief.readiness_score || 0} showLabel={false} barClassName="h-3" />
            </div>
            <span className="text-2xl font-bold">{activeBrief.readiness_score}</span>
          </div>
        </Card>

        <Card className="p-6">
          <p className="text-sm font-medium text-muted-foreground">Data Completeness</p>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex-1">
              <ProgressiveFluxLoader value={activeBrief.data_completeness_score || 0} showLabel={false} barClassName="h-3" gradient="var(--brand)" />
            </div>
            <span className="text-2xl font-bold">{activeBrief.data_completeness_score}</span>
          </div>
        </Card>
      </div>

      {/* EXECUTIVE SUMMARY */}
      {activeBrief.executive_brief && (
        <Card className="bg-brand/5 border-brand/20">
          <CardHeader>
            <CardTitle className="flex items-center text-lg text-brand">
              <Target className="mr-2 h-5 w-5" /> Executive Brief
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{activeBrief.executive_brief}</p>
          </CardContent>
        </Card>
      )}

      {/* TWO COLUMN LAYOUT */}
      <div className="grid md:grid-cols-[1fr_300px] gap-8">
        
        {/* LEFT COLUMN: MAIN CONTENT */}
        <div className="space-y-8">

          {/* PRODUCT X INDUSTRY FIT (NEW) */}
          {activeBrief.product_industry_fit_json && (
            <section>
              <h3 className="text-lg font-bold border-b pb-2 mb-4 text-brand">Initial Product x Industry Fit</h3>
              <div className="bg-card border rounded-lg p-5 space-y-4">
                <div className="flex items-center gap-4 border-b pb-4">
                  <div className="text-4xl font-bold text-brand">{activeBrief.product_industry_fit_score ?? activeBrief.product_industry_fit_json.product_industry_fit_score}%</div>
                  <div>
                    <h4 className="font-semibold">Fit Score</h4>
                    <p className="text-sm text-muted-foreground">AI assessment of how well this product solves this industry's known pain points.</p>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Why Product Fits Industry</h4>
                  <p className="text-sm">{activeBrief.product_industry_fit_json.why_product_fits_industry}</p>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Relevant Use Cases</h4>
                    <ul className="list-disc pl-4 text-sm space-y-1">
                      {(activeBrief.product_industry_fit_json.relevant_use_cases || []).map((v: string, i: number) => <li key={i}>{v}</li>)}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Features to Prioritize</h4>
                    <ul className="list-disc pl-4 text-sm space-y-1">
                      {(activeBrief.product_industry_fit_json.features_to_prioritize || []).map((v: string, i: number) => <li key={i}>{v}</li>)}
                    </ul>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Business Value to Emphasize</h4>
                  <p className="text-sm">{activeBrief.product_industry_fit_json.business_value_to_emphasize}</p>
                </div>
                <div className="bg-muted/30 p-3 rounded">
                  <h4 className="text-sm font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Pain Points to Validate First</h4>
                  <ul className="list-disc pl-4 text-sm space-y-1 text-red-700 dark:text-red-400">
                    {(activeBrief.product_industry_fit_json.pain_points_to_validate_first || []).map((v: string, i: number) => <li key={i}>{v}</li>)}
                  </ul>
                </div>
              </div>
            </section>
          )}

          {/* NEEDS & PAIN HYPOTHESIS */}
          <section>
            <h3 className="text-lg font-bold border-b pb-2 mb-4">Needs & Pain Hypothesis</h3>
            <div className="space-y-4">
              {activeBrief.needs_pain_hypothesis_json && Object.entries(activeBrief.needs_pain_hypothesis_json).map(([k, v]) => (
                <div key={k}>
                  <h4 className="text-sm font-semibold capitalize text-muted-foreground mb-1">{k.replace(/_/g, ' ')}</h4>
                  <p className="text-sm">{String(v)}</p>
                </div>
              ))}
            </div>
          </section>

          {/* INDUSTRY PAIN POINT HYPOTHESIS */}
          {activeBrief.industry_pain_point_hypothesis_json && (
            <section>
              <h3 className="text-lg font-bold border-b pb-2 mb-4">Industry Pain Point Hypothesis</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <Card className="p-4 bg-muted/30">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Common Operational Challenges</h4>
                  <ul className="list-disc pl-4 text-sm space-y-1">
                    {(activeBrief.industry_pain_point_hypothesis_json.common_operational_challenges || []).map((item: string, i: number) => <li key={i}>{item}</li>)}
                  </ul>
                </Card>
                <Card className="p-4 bg-muted/30 border-red-500/20">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Industry Risk Signals</h4>
                  <ul className="list-disc pl-4 text-sm space-y-1 text-red-700 dark:text-red-400">
                    {(activeBrief.industry_pain_point_hypothesis_json.industry_specific_risk_signals || []).map((item: string, i: number) => <li key={i}>{item}</li>)}
                  </ul>
                </Card>
              </div>
            </section>
          )}

          {/* DEMO STRATEGY OR MEETING DISCOVERY */}
          {(activeBrief.industry_based_demo_strategy_json || activeBrief.demo_strategy_json) && (
            <section>
              <h3 className="text-lg font-bold border-b pb-2 mb-4">{activeBrief.meeting_type?.includes('Demo') ? 'Demo Strategy' : 'Discovery Flow'}</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {Object.entries(activeBrief.industry_based_demo_strategy_json || activeBrief.demo_strategy_json).map(([k, v]) => (
                  <Card key={k} className="p-4 bg-muted/30">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{k.replace(/_/g, ' ')}</h4>
                    {Array.isArray(v) ? (
                      <ul className="list-disc pl-4 text-sm space-y-1">
                        {v.map((item, i) => <li key={i}>{String(item)}</li>)}
                      </ul>
                    ) : (
                      <p className="text-sm">{String(v)}</p>
                    )}
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* BANTC DISCOVERY PLAN */}
          {(activeBrief.industry_based_bantc_questions_json || activeBrief.bantc_discovery_plan_json) && (
            <section>
              <h3 className="text-lg font-bold border-b pb-2 mb-4">BANTC Discovery Plan</h3>
              <div className="space-y-6">
                {Object.entries(activeBrief.industry_based_bantc_questions_json || activeBrief.bantc_discovery_plan_json).map(([category, questions]) => {
                  if (!Array.isArray(questions) || questions.length === 0) return null;
                  return (
                    <div key={category}>
                      <Badge variant="outline" className="mb-3 uppercase tracking-widest">{category}</Badge>
                      <div className="grid gap-3">
                        {questions.map((q: any, i) => (
                          <div key={i} className="border rounded-lg p-4 bg-card text-sm">
                            <p className="font-medium text-foreground mb-2">{q.question}</p>
                            <p className="text-xs text-muted-foreground mb-3"><span className="font-semibold text-foreground/70">Why:</span> {q.why_it_matters}</p>
                            <div className="grid sm:grid-cols-2 gap-2 text-xs">
                              <div className="bg-green-500/10 text-green-700 dark:text-green-400 p-2 rounded">
                                <strong>Good:</strong> {q.strong_fit_indicator || q.ideal_answer}
                              </div>
                              <div className="bg-red-500/10 text-red-700 dark:text-red-400 p-2 rounded">
                                <strong>Risk:</strong> {q.risk_indicator || q.risk_answer}
                              </div>
                            </div>
                            {(q.relation_to_product || q.relation_to_industry) && (
                              <div className="mt-3 pt-3 border-t grid sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                                {q.relation_to_product && <div><span className="font-semibold">Product Link:</span> {q.relation_to_product}</div>}
                                {q.relation_to_industry && <div><span className="font-semibold">Industry Context:</span> {q.relation_to_industry}</div>}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

        </div>

        {/* RIGHT COLUMN: SIDEBAR DETAILS */}
        <div className="space-y-6">

          {/* INDUSTRY INTELLIGENCE */}
          {activeBrief.industry_snapshot_json && (
            <Card className="bg-blue-500/5 border-blue-500/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center text-blue-600 dark:text-blue-400"><Info className="w-4 h-4 mr-2" /> Industry Intelligence</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <strong className="block text-xs uppercase text-muted-foreground mb-1">Industry</strong>
                  <p>{activeBrief.industry_snapshot_json.industry || 'Unknown'}</p>
                </div>
                <div>
                  <strong className="block text-xs uppercase text-muted-foreground mb-1">Business Category</strong>
                  <p>{activeBrief.industry_snapshot_json.business_category || 'Unknown'}</p>
                </div>
                <div>
                  <strong className="block text-xs uppercase text-muted-foreground mb-1">Likely Business Model</strong>
                  <p>{activeBrief.industry_snapshot_json.likely_business_model || 'Unknown'}</p>
                </div>
                <div>
                  <strong className="block text-xs uppercase text-muted-foreground mb-1">Likely Buyer Persona</strong>
                  <p>{activeBrief.industry_snapshot_json.likely_buyer_persona || 'Unknown'}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* RECOMMENDED APPROACH */}
          {activeBrief.recommended_meeting_approach_json && (
            <Card className="bg-brand/5 border-brand/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center text-brand"><Activity className="w-4 h-4 mr-2" /> Recommended Approach</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <strong className="block text-xs uppercase text-muted-foreground mb-1">Opening Statement</strong>
                  <p>{activeBrief.recommended_meeting_approach_json.opening_statement}</p>
                </div>
                <div>
                  <strong className="block text-xs uppercase text-muted-foreground mb-1">Positioning Angle</strong>
                  <p>{activeBrief.recommended_meeting_approach_json.positioning_angle}</p>
                </div>
                <div>
                  <strong className="block text-xs uppercase text-muted-foreground mb-1">Recommended Next Step</strong>
                  <p>{activeBrief.recommended_meeting_approach_json.recommended_next_step_after_meeting}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* RISK FLAGS */}
          {activeBrief.risk_flags_json && activeBrief.risk_flags_json.length > 0 && (
            <Card className="border-red-500/30">
              <CardHeader className="pb-3 bg-red-500/5">
                <CardTitle className="text-sm flex items-center text-red-600"><AlertTriangle className="w-4 h-4 mr-2" /> Risk & Red Flags</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <ul className="space-y-2 text-sm">
                  {activeBrief.risk_flags_json.map((risk, i) => (
                    <li key={i} className="flex gap-2 items-start text-red-800 dark:text-red-300">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* STAKEHOLDER STRATEGY */}
          {activeBrief.stakeholder_strategy_json && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center"><User className="w-4 h-4 mr-2" /> Stakeholder Strategy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {Object.entries(activeBrief.stakeholder_strategy_json).map(([k, v]) => (
                  <div key={k}>
                    <strong className="block text-xs uppercase text-muted-foreground">{k.replace(/_/g, ' ')}</strong>
                    <p>{String(v)}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}
