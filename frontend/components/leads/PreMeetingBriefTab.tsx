import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiFetch';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs } from '@/components/ui/tabs';
import { ProgressiveFluxLoader } from '@/components/ui/progressive-flux-loader';
import {
  Plus, Target, CheckCircle, AlertTriangle, AlertCircle, RefreshCw, Printer, User, BrainCircuit, Activity, Info, FileText, Check, ShieldAlert, MonitorPlay, Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type PreMeetingBriefType = {
  id: number;
  meeting_type: string | null;
  input_context_json: any;
  
  // Legacy mappings
  customer_snapshot_json?: any;
  needs_pain_hypothesis_json?: any;
  product_fit_hypothesis_json?: any;
  bantc_discovery_plan_json?: any;
  demo_strategy_json?: any;
  risk_flags_json?: string[];
  recommended_meeting_approach_json?: any;

  // New Structure
  executive_summary_json?: any;
  customer_context_json?: any;
  initial_product_intelligence_json?: any;
  initial_bantc_estimation_json?: any;
  question_guide_json?: any[];
  digitalization_resistance_json?: any;
  meeting_strategy_json?: any;
  demo_cycle_json?: any;
  pain_point_hypothesis_json?: any;
  risk_analysis_json?: any;
  readiness_json?: any;
  
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
  const [activeTab, setActiveTab] = useState('overview');
  
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
      setActiveTab('overview');
    },
  });

  const briefs: PreMeetingBriefType[] = data?.data || [];
  const activeBrief = briefs.length > 0 ? briefs[0] : null;

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground"><RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" /> Loading Presales Intelligence...</div>;
  }

  if (mode === 'form' || (!activeBrief && mode === 'view')) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Generate Pre-Meeting Brief</h2>
            <p className="text-sm text-muted-foreground">Provide manual context to enrich the AI-generated presales plan.</p>
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
                <option value="Product Demo Meeting">Product Demo Meeting</option>
                <option value="Follow-up Meeting">Follow-up Meeting</option>
                <option value="Proposal Discussion">Proposal Discussion</option>
                <option value="Closing Discussion">Closing Discussion</option>
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

  // Fallback bindings
  const execSummary = activeBrief.executive_summary_json || { summary: activeBrief.executive_brief };
  const custContext = activeBrief.customer_context_json || activeBrief.customer_snapshot_json || {};
  const bantc = activeBrief.initial_bantc_estimation_json || activeBrief.bantc_discovery_plan_json || {};
  const productIntel = activeBrief.initial_product_intelligence_json || activeBrief.product_fit_hypothesis_json || {};
  const questions = activeBrief.question_guide_json || [];
  const strategy = activeBrief.meeting_strategy_json || activeBrief.recommended_meeting_approach_json || {};
  const demoCycle = activeBrief.demo_cycle_json || activeBrief.demo_strategy_json || {};
  const painPoints = activeBrief.pain_point_hypothesis_json || activeBrief.needs_pain_hypothesis_json || {};
  const resistance = activeBrief.digitalization_resistance_json || {};
  const risks = activeBrief.risk_analysis_json || { meeting_risks: activeBrief.risk_flags_json || [] };

  return (
    <div className="space-y-6" id="pre-meeting-brief-container">
      {/* HEADER ACTION AREA */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-brand">Pre-Meeting Brief</h2>
          <p className="text-sm text-muted-foreground mt-1">For {activeBrief.meeting_type} • Generated {new Date(activeBrief.generated_at).toLocaleString()}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => alert("Follow-up task creation coming soon.")}>
            <CheckCircle className="mr-2 h-4 w-4" /> Create Task
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Export PDF
          </Button>
          <Button size="sm" onClick={() => setMode('form')}>
            <RefreshCw className="mr-2 h-4 w-4" /> Regenerate
          </Button>
        </div>
      </div>

      {/* WARNINGS */}
      {activeBrief.industry_context_completeness_score === 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5 shrink-0" />
          <div className="text-sm">
            <h4 className="font-semibold text-yellow-800 dark:text-yellow-400">Missing Industry Context</h4>
            <p className="text-yellow-700 dark:text-yellow-300 mt-1">
              Industry or Business Category context is missing. The generated strategies and question guides are based on general product fits.
            </p>
          </div>
        </div>
      )}

      {/* MAIN CONTENT TABS */}
      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab} 
        items={[
          { key: 'overview', label: 'Overview' },
          { key: 'product', label: 'Product Fit' },
          { key: 'bantc', label: 'BANTC' },
          { key: 'questions', label: 'Question Guide' },
          { key: 'strategy', label: 'Meeting & Demo' },
          { key: 'resistance', label: 'Resistance' },
          { key: 'pains', label: 'Pains & Risks' },
        ]}
      />

      <div className="pt-2">
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
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

            <Card className="bg-brand/5 border-brand/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-brand flex items-center"><Target className="w-5 h-5 mr-2"/> Executive Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed font-medium">{execSummary.summary}</p>
                {(execSummary.key_objective || execSummary.primary_challenge) && (
                  <div className="mt-4 grid sm:grid-cols-2 gap-4 text-sm bg-background/50 rounded-lg p-4 border border-brand/10">
                    {execSummary.key_objective && <div><strong className="text-brand block mb-1">Key Objective</strong> {execSummary.key_objective}</div>}
                    {execSummary.primary_challenge && <div><strong className="text-brand block mb-1">Primary Challenge</strong> {execSummary.primary_challenge}</div>}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">Customer Context</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm">{custContext.company_summary}</p>
                <div className="grid sm:grid-cols-2 gap-4 text-sm mt-4">
                  <div><strong>Industry:</strong> {custContext.industry_context || 'Unknown'}</div>
                  <div><strong>Business Category:</strong> {custContext.business_category_context || 'Unknown'}</div>
                </div>
                {custContext.missing_data && custContext.missing_data.length > 0 && (
                  <div className="mt-4 text-sm bg-yellow-500/10 p-3 rounded-md text-yellow-800 dark:text-yellow-400">
                    <strong>Missing Data:</strong> {custContext.missing_data.join(', ')}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* TAB 2: PRODUCT INTEL */}
        {activeTab === 'product' && (
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Initial Product Intelligence</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold text-sm mb-1">Product Relevance</h4>
                  <p className="text-sm text-muted-foreground">{productIntel.product_relevance || 'Not evaluated.'}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-1">Product Fit Hypothesis</h4>
                  <p className="text-sm text-muted-foreground">{productIntel.product_fit_hypothesis || 'Not evaluated.'}</p>
                </div>
                <div className="grid sm:grid-cols-2 gap-6">
                  {productIntel.relevant_use_cases && productIntel.relevant_use_cases.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Relevant Use Cases</h4>
                      <ul className="list-disc pl-5 text-sm space-y-1 text-muted-foreground">
                        {productIntel.relevant_use_cases.map((uc: string, i: number) => <li key={i}>{uc}</li>)}
                      </ul>
                    </div>
                  )}
                  {productIntel.buyer_persona_hypothesis && (
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Buyer Persona Hypothesis</h4>
                      <p className="text-sm text-muted-foreground">{productIntel.buyer_persona_hypothesis}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* TAB 3: BANTC */}
        {activeTab === 'bantc' && (
          <div className="space-y-6">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {['budget', 'authority', 'need', 'timeline', 'competitor', 'challenge'].map((bKey) => {
                const section = bantc[bKey];
                if (!section) return null;
                const confColor = section.confidence === 'High' ? 'text-green-500 bg-green-500/10' : (section.confidence === 'Medium' ? 'text-yellow-500 bg-yellow-500/10' : 'text-red-500 bg-red-500/10');
                
                return (
                  <Card key={bKey} className="flex flex-col">
                    <CardHeader className="pb-2 border-b bg-muted/20">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-base capitalize">{bKey}</CardTitle>
                        {section.confidence && <Badge variant="outline" className={confColor}>{section.confidence}</Badge>}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 flex-1 text-sm space-y-3">
                      {Object.entries(section).map(([k, v]) => {
                        if (k === 'confidence' || k === 'validation_questions') return null;
                        if (!v || (Array.isArray(v) && v.length === 0)) return null;
                        return (
                          <div key={k}>
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-0.5">{k.replace(/_/g, ' ')}</span>
                            <span>{Array.isArray(v) ? v.join(', ') : String(v)}</span>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: QUESTIONS */}
        {activeTab === 'questions' && (
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Question Guide</CardTitle>
                <Badge variant="brand">{questions.length} Questions Prepared</Badge>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {questions.map((q: any, i: number) => (
                    <div key={i} className="p-5 hover:bg-muted/10 transition-colors">
                      <div className="flex gap-2 items-center mb-3">
                        <Badge variant="outline" className={
                          q.priority === 'critical' ? 'border-red-500 text-red-500' :
                          q.priority === 'high' ? 'border-orange-500 text-orange-500' :
                          'border-border'
                        }>{q.priority}</Badge>
                        <Badge variant="neutral">{q.category}</Badge>
                        <Badge variant="neutral" className="text-xs capitalize">{q.recommended_timing}</Badge>
                        <span className="text-xs text-muted-foreground ml-auto uppercase tracking-wider">{q.source?.replace(/_/g, ' ')}</span>
                      </div>
                      
                      <h4 className="text-base font-medium mb-2">{q.question}</h4>
                      <p className="text-sm text-muted-foreground mb-4 border-l-2 pl-3 border-brand/50"><strong>Why:</strong> {q.why_this_question_matters}</p>
                      
                      <div className="grid sm:grid-cols-2 gap-3 text-sm">
                        {q.what_good_answer_indicates && (
                          <div className="bg-green-500/10 text-green-800 dark:text-green-300 p-3 rounded-md">
                            <span className="font-semibold block mb-1">Good Indicator</span> {q.what_good_answer_indicates}
                          </div>
                        )}
                        {q.what_risk_answer_indicates && (
                          <div className="bg-red-500/10 text-red-800 dark:text-red-300 p-3 rounded-md">
                            <span className="font-semibold block mb-1">Risk Indicator</span> {q.what_risk_answer_indicates}
                          </div>
                        )}
                      </div>
                      {q.follow_up_question && (
                        <div className="mt-4 text-sm">
                          <strong>Follow Up:</strong> {q.follow_up_question}
                        </div>
                      )}
                    </div>
                  ))}
                  {questions.length === 0 && <div className="p-8 text-center text-muted-foreground">No questions generated.</div>}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* TAB 5: RESISTANCE */}
        {activeTab === 'resistance' && (
          <div className="space-y-6">
            <Card className={cn(
              resistance.resistance_level === 'high' ? "border-red-500/50" : 
              resistance.resistance_level === 'medium' ? "border-yellow-500/50" : "border-green-500/50"
            )}>
              <CardHeader className="pb-3 border-b">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg flex items-center"><ShieldAlert className="w-5 h-5 mr-2"/> Digitalization Resistance Analysis</CardTitle>
                  {resistance.resistance_level && (
                    <Badge variant="outline" className="uppercase font-bold tracking-widest">{resistance.resistance_level} RESISTANCE LIKELY</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div>
                  <h4 className="font-semibold text-sm mb-1">Reasoning</h4>
                  <p className="text-sm text-muted-foreground">{resistance.reasoning || 'No specific reasoning provided.'}</p>
                </div>
                
                <div className="grid sm:grid-cols-2 gap-6">
                  {resistance.resistance_signals_to_validate && resistance.resistance_signals_to_validate.length > 0 && (
                    <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
                      <h4 className="font-semibold text-sm mb-3 text-red-600">Signals to Validate</h4>
                      <ul className="list-disc pl-4 text-sm space-y-1.5 text-red-800 dark:text-red-300">
                        {resistance.resistance_signals_to_validate.map((s: string, i: number) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                  )}
                  {resistance.digitalization_resistance_questions && resistance.digitalization_resistance_questions.length > 0 && (
                    <div className="bg-brand/5 border border-brand/20 rounded-lg p-4">
                      <h4 className="font-semibold text-sm mb-3 text-brand">Questions to Ask</h4>
                      <ul className="list-disc pl-4 text-sm space-y-1.5 text-muted-foreground">
                        {resistance.digitalization_resistance_questions.map((q: string, i: number) => <li key={i}>{q}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* TAB 6: MEETING & DEMO */}
        {activeTab === 'strategy' && (
          <div className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              
              {/* MEETING STRATEGY */}
              <Card>
                <CardHeader className="pb-3 border-b bg-muted/20">
                  <CardTitle className="text-lg flex items-center"><Activity className="w-5 h-5 mr-2"/> Meeting Strategy ({activeBrief.meeting_type})</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  {strategy.qualification_objective && (
                    <div className="bg-brand/10 text-brand-foreground p-3 rounded-md text-sm font-medium text-center">
                      Objective: {strategy.qualification_objective}
                    </div>
                  )}
                  
                  <div>
                    <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2 tracking-wider">Opening Approach</h4>
                    <p className="text-sm">{strategy.opening_approach}</p>
                  </div>
                  
                  {strategy.focus_areas && strategy.focus_areas.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2 tracking-wider">Focus Areas</h4>
                      <div className="flex flex-wrap gap-2">
                        {strategy.focus_areas.map((f: string, i: number) => <Badge key={i} variant="outline">{f}</Badge>)}
                      </div>
                    </div>
                  )}

                  {strategy.discovery_sequence && strategy.discovery_sequence.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2 tracking-wider">Discovery Sequence</h4>
                      <ol className="list-decimal pl-4 text-sm space-y-2">
                        {strategy.discovery_sequence.map((s: string, i: number) => <li key={i}>{s}</li>)}
                      </ol>
                    </div>
                  )}

                  {strategy.what_not_to_pitch_yet && (
                    <div className="bg-red-500/10 border-l-4 border-red-500 p-3 text-sm text-red-800 dark:text-red-300">
                      <strong>Do NOT pitch yet:</strong> {strategy.what_not_to_pitch_yet}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* DEMO CYCLE */}
              <Card>
                <CardHeader className="pb-3 border-b bg-muted/20">
                  <CardTitle className="text-lg flex items-center"><MonitorPlay className="w-5 h-5 mr-2"/> Demo Cycle</CardTitle>
                  {demoCycle.demo_journey_name && <p className="text-sm text-muted-foreground mt-1">Journey: {demoCycle.demo_journey_name}</p>}
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  {demoCycle.demo_flow && Array.isArray(demoCycle.demo_flow) ? (
                    <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                      {demoCycle.demo_flow.map((step: any, i: number) => (
                        <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-brand text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                            {step.step_number || i + 1}
                          </div>
                          <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-lg border border-border bg-card shadow-sm">
                            <h5 className="font-bold text-sm mb-1">{step.demo_stage_name}</h5>
                            <p className="text-xs text-muted-foreground mb-3">{step.objective}</p>
                            
                            <div className="space-y-2 text-xs">
                              <div className="bg-muted p-2 rounded"><strong>Show:</strong> {step.feature_or_module_to_show}</div>
                              <div><strong>Talk Track:</strong> <span className="italic">"{step.talk_track}"</span></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center">No specific demo flow generated for this brief.</p>
                  )}
                  
                  {demoCycle.demo_sequence_rule && (
                    <div className="mt-6 pt-6 border-t grid sm:grid-cols-2 gap-4 text-xs">
                      <div><strong className="text-green-600 block">Show First:</strong> {demoCycle.demo_sequence_rule.show_first}</div>
                      <div><strong className="text-red-600 block">Avoid Early:</strong> {demoCycle.demo_sequence_rule.avoid_showing_early}</div>
                    </div>
                  )}
                </CardContent>
              </Card>

            </div>
          </div>
        )}

        {/* TAB 7: PAINS & RISKS */}
        {activeTab === 'pains' && (
          <div className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              
              {/* PAINS */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold flex items-center"><Zap className="w-5 h-5 mr-2 text-brand"/> Pain Point Hypothesis</h3>
                
                {painPoints.confirmed_pain_points && painPoints.confirmed_pain_points.length > 0 && (
                  <Card className="border-brand/30">
                    <CardHeader className="pb-3 bg-brand/5 border-b border-brand/10">
                      <CardTitle className="text-sm">Confirmed Pain Points</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                      {painPoints.confirmed_pain_points.map((p: any, i: number) => (
                        <div key={i} className="text-sm">
                          <strong className="block mb-1">{p.pain_point}</strong>
                          <span className="text-muted-foreground">Impact: {p.business_impact}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {painPoints.inferred_pain_points && painPoints.inferred_pain_points.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3 border-b">
                      <CardTitle className="text-sm text-muted-foreground">Inferred Pain Points (Hypothesis)</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                      {painPoints.inferred_pain_points.map((p: any, i: number) => (
                        <div key={i} className="text-sm p-3 border rounded-lg bg-muted/20">
                          <div className="flex justify-between items-start mb-2">
                            <strong className="block">{p.pain_point_hypothesis}</strong>
                            <Badge variant="outline">{p.confidence} Conf</Badge>
                          </div>
                          <p className="text-muted-foreground mb-2">Why likely: {p.why_likely}</p>
                          {p.validation_question && <div className="bg-brand/5 p-2 rounded italic text-xs border border-brand/10">Q: {p.validation_question}</div>}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* RISKS */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold flex items-center"><AlertTriangle className="w-5 h-5 mr-2 text-red-500"/> Risk Analysis</h3>
                
                <Card className="border-red-500/20">
                  <CardContent className="p-0 divide-y divide-red-500/10">
                    {['meeting_risks', 'demo_risks', 'deal_risks', 'adoption_risks'].map((rKey) => {
                      const rList = risks[rKey];
                      if (!rList || rList.length === 0) return null;
                      return (
                        <div key={rKey} className="p-4">
                          <h4 className="text-xs font-bold uppercase text-red-800 dark:text-red-400 mb-2">{rKey.replace(/_/g, ' ')}</h4>
                          <ul className="list-disc pl-5 text-sm space-y-1 text-red-900/80 dark:text-red-300">
                            {rList.map((r: string, i: number) => <li key={i}>{r}</li>)}
                          </ul>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
