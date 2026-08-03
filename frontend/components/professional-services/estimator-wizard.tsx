"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Save, FileText, Settings, Users, ArrowRight, Check, CheckCircle2, ChevronRight, Loader2, Plus, Trash2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { 
  PsConfig, PsEstimation, PsEstimationLine, PsEstimationTemplate,
  getPsConfig, getTemplates, createEstimation 
} from "@/lib/api/professional-services";

export function EstimatorWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Data
  const [config, setConfig] = useState<PsConfig | null>(null);
  const [templates, setTemplates] = useState<PsEstimationTemplate[]>([]);
  
  // Form State
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [templateId, setTemplateId] = useState<number | "">("");
  const [complexityId, setComplexityId] = useState<number | "">("");
  const [bufferPercent, setBufferPercent] = useState<number>(10);
  const [currency, setCurrency] = useState("USD");
  const [assumptions, setAssumptions] = useState("");
  const [outOfScope, setOutOfScope] = useState("");
  const [dependencies, setDependencies] = useState("");
  const [risks, setRisks] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [lines, setLines] = useState<Partial<PsEstimationLine>[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [conf, tmpl] = await Promise.all([
          getPsConfig(),
          getTemplates()
        ]);
        setConfig(conf);
        setTemplates(tmpl);
        
        // Defaults
        if (conf?.categories?.length > 0) setCategoryId(conf.categories[0].id);
        if (conf?.complexity_levels?.length > 0) {
          const defaultCmplx = conf.complexity_levels.find((c: any) => c.multiplier === "1.00") || conf.complexity_levels[0];
          setComplexityId(defaultCmplx.id);
        }
      } catch (err: any) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const loadTemplate = async (tid: number) => {
    try {
      setLines([
        { task_name: "Requirements Gathering", base_mandays: 2, role_id: config?.roles?.[0]?.id, sort_order: 1, manual_adjustment: 0 },
        { task_name: "Design & Architecture", base_mandays: 3, role_id: config?.roles?.[0]?.id, sort_order: 2, manual_adjustment: 0 },
      ]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleTemplateChange = (val: string) => {
    const id = parseInt(val);
    setTemplateId(id);
    if (id) loadTemplate(id);
  };

  const activeComplexity = config?.complexity_levels?.find(c => c.id === complexityId);
  const multiplier = activeComplexity ? parseFloat(activeComplexity.multiplier) : 1.0;

  const calculatedLines = useMemo(() => {
    return lines.map((line) => {
      const role = config?.roles?.find(r => r.id === line.role_id);
      const rateCard = role?.rate_cards?.[0];
      const rate = rateCard ? parseFloat(rateCard.rate_per_manday) : 0;
      
      const base = parseFloat(line.base_mandays as any) || 0;
      const manual = parseFloat(line.manual_adjustment as any) || 0;
      
      const adjusted = base * multiplier;
      const buffer = adjusted * (bufferPercent / 100);
      const final = adjusted + buffer + manual;
      const fee = final * rate;

      return {
        ...line,
        rate_snapshot: rate,
        adjusted_mandays: adjusted,
        buffer_mandays: buffer,
        final_mandays: final,
        estimated_fee: fee
      };
    });
  }, [lines, multiplier, bufferPercent, config]);

  const totals = useMemo(() => {
    return calculatedLines.reduce((acc, curr) => ({
      base: acc.base + (curr.base_mandays || 0),
      adjusted: acc.adjusted + curr.adjusted_mandays,
      buffer: acc.buffer + curr.buffer_mandays,
      manual: acc.manual + (curr.manual_adjustment || 0),
      final: acc.final + curr.final_mandays,
      fee: acc.fee + curr.estimated_fee
    }), { base: 0, adjusted: 0, buffer: 0, manual: 0, final: 0, fee: 0 });
  }, [calculatedLines]);

  const roleBreakdown = useMemo(() => {
    const breakdown: Record<string, { mandays: number, fee: number }> = {};
    calculatedLines.forEach(line => {
      if (!line.role_id) return;
      const role = config?.roles?.find(r => r.id === line.role_id);
      const roleName = role ? role.name : 'Unknown';
      if (!breakdown[roleName]) breakdown[roleName] = { mandays: 0, fee: 0 };
      breakdown[roleName].mandays += line.final_mandays;
      breakdown[roleName].fee += line.estimated_fee;
    });
    return breakdown;
  }, [calculatedLines, config]);

  const validateStep = () => {
    if (step === 1) {
      if (!title || !categoryId || !complexityId) return false;
    }
    if (step === 2) {
      if (lines.length === 0) return false;
      for (const line of lines) {
        if (!line.task_name || !line.role_id) return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep()) setStep(s => s + 1);
  };
  
  const prevStep = () => setStep(s => s - 1);

  const handleSubmit = async (action: 'draft' | 'submit') => {
    if (!validateStep()) return;
    try {
      setSubmitting(true);
      const payload = {
        title,
        service_category_id: categoryId,
        template_id: templateId || null,
        complexity_level_id: complexityId,
        buffer_percentage: bufferPercent,
        currency_code: currency,
        assumptions,
        out_of_scope: outOfScope,
        dependencies,
        risks,
        internal_notes: internalNotes,
        lines: lines.map((l, i) => ({
          ...l,
          sort_order: i + 1,
          base_mandays: parseFloat(l.base_mandays as any) || 0,
          manual_adjustment: parseFloat(l.manual_adjustment as any) || 0
        }))
      };

      const res = await createEstimation(payload as any);
      router.push(`/professional-services/estimations/${res.id}`);
    } catch (e: any) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const addLine = () => {
    setLines([...lines, { task_name: "", base_mandays: 1, role_id: config?.roles?.[0]?.id, sort_order: lines.length + 1, manual_adjustment: 0 }]);
  };

  const updateLine = (index: number, field: string, value: any) => {
    const newLines = [...lines];
    (newLines[index] as any)[field] = value;
    setLines(newLines);
  };

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(amount);
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => router.back()}><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button>
          <h1 className="text-2xl font-bold">New Estimation</h1>
        </div>
      </div>

      <div className="flex items-center justify-between bg-card rounded-lg p-4 border">
        {[
          { num: 1, label: "Basic Info", icon: FileText },
          { num: 2, label: "Scope Components", icon: Settings },
          { num: 3, label: "Role Breakdown", icon: Users },
          { num: 4, label: "Assumptions", icon: FileText },
          { num: 5, label: "Review", icon: CheckCircle2 }
        ].map((s, i, arr) => (
          <div key={s.num} className="flex items-center">
            <div className={`flex items-center justify-center h-8 w-8 rounded-full border-2 ${step >= s.num ? 'bg-[color:var(--brand)] border-[color:var(--brand)] text-white' : 'border-muted-foreground text-muted-foreground'}`}>
              {step > s.num ? <Check className="h-4 w-4" /> : s.num}
            </div>
            <span className={`ml-2 text-sm font-medium hidden sm:block ${step >= s.num ? 'text-foreground' : 'text-muted-foreground'}`}>
              {s.label}
            </span>
            {i < arr.length - 1 && <div className="h-px w-8 sm:w-16 bg-border mx-4" />}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          
          {step === 1 && (
            <Card>
              <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <label className="text-sm font-medium">Estimation Title <span className="text-red-500">*</span></label>
                    <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. ERP Implementation Phase 1" />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Service Category <span className="text-red-500">*</span></label>
                    <select className="w-full h-10 px-3 border rounded-md" value={categoryId.toString()} onChange={(e) => setCategoryId(parseInt(e.target.value))}>
                      <option value="0" disabled>Select a category...</option>
                      {config?.categories?.filter(c => c.is_active).map(c => (
                        <option key={c.id} value={c.id.toString()}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Template</label>
                    <select className="w-full h-10 px-3 border rounded-md" value={templateId.toString()} onChange={(e) => handleTemplateChange(e.target.value)}>
                      <option value="0">Blank (Manual)</option>
                      {templates?.map(t => <option key={t.id} value={t.id.toString()}>{t.name}</option>)}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Complexity Level <span className="text-red-500">*</span></label>
                    <select className="w-full h-10 px-3 border rounded-md" value={complexityId.toString()} onChange={(e) => setComplexityId(parseInt(e.target.value))}>
                      <option value="0" disabled>Select complexity...</option>
                      {config?.complexity_levels?.filter(c => c.is_active).map(c => (
                        <option key={c.id} value={c.id.toString()}>{c.name} (x{c.multiplier})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Buffer Percentage (%)</label>
                    <Input type="number" min="0" max="100" value={bufferPercent} onChange={e => setBufferPercent(parseFloat(e.target.value) || 0)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Scope Components</CardTitle>
                <Button variant="outline" size="sm" onClick={addLine}><Plus className="h-4 w-4 mr-2" /> Add Task</Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="py-2 text-left w-1/3">Task Name</th>
                        <th className="py-2 text-left">Role</th>
                        <th className="py-2 text-right">Base MD</th>
                        <th className="py-2 text-right">Adj. MD</th>
                        <th className="py-2 text-right">Fee</th>
                        <th className="py-2 text-right"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {calculatedLines.map((line, i) => (
                        <tr key={i} className="border-b">
                          <td className="py-2 pr-2">
                            <Input value={line.task_name} onChange={e => updateLine(i, 'task_name', e.target.value)} placeholder="Task name" />
                          </td>
                          <td className="py-2 pr-2">
                            <select className="w-full h-9 px-2 border rounded-md" value={line.role_id?.toString()} onChange={(e) => updateLine(i, "role_id", parseInt(e.target.value))}>
                              <option value="" disabled>Select Role...</option>
                              {config?.roles?.filter(r => r.is_active).map(r => (
                                <option key={r.id} value={r.id.toString()}>{r.name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 pr-2 text-right w-24">
                            <Input type="number" min="0" step="0.5" value={line.base_mandays} onChange={e => updateLine(i, 'base_mandays', parseFloat(e.target.value))} className="text-right" />
                          </td>
                          <td className="py-2 px-2 text-right text-muted-foreground">{line.final_mandays?.toFixed(2)}</td>
                          <td className="py-2 px-2 text-right text-muted-foreground">{formatCurrency(line.estimated_fee || 0)}</td>
                          <td className="py-2 text-right">
                            <Button variant="ghost" size="icon" onClick={() => removeLine(i)} className="text-red-500 hover:text-red-700 hover:bg-red-50"><Trash2 className="h-4 w-4" /></Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <Card>
              <CardHeader><CardTitle>Role Breakdown</CardTitle></CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b"><th className="text-left py-2">Role</th><th className="text-right py-2">Total ManDays</th><th className="text-right py-2">Total Fee</th></tr>
                  </thead>
                  <tbody>
                    {Object.entries(roleBreakdown).map(([role, data]) => (
                      <tr key={role} className="border-b">
                        <td className="py-3 font-medium">{role}</td>
                        <td className="py-3 text-right">{data.mandays.toFixed(2)} MD</td>
                        <td className="py-3 text-right">{formatCurrency(data.fee)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td className="py-3 font-bold">Total</td>
                      <td className="py-3 text-right font-bold">{totals.final.toFixed(2)} MD</td>
                      <td className="py-3 text-right font-bold text-[color:var(--brand)]">{formatCurrency(totals.fee)}</td>
                    </tr>
                  </tfoot>
                </table>
              </CardContent>
            </Card>
          )}

          {step === 4 && (
            <Card>
              <CardHeader><CardTitle>Assumptions & Constraints</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Assumptions</label>
                  <textarea 
                    className="w-full min-h-[100px] p-3 rounded-md border border-input bg-transparent text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--brand)]" 
                    placeholder="List project assumptions..."
                    value={assumptions}
                    onChange={(e: any) => setAssumptions(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Out of Scope</label>
                  <textarea 
                    className="w-full min-h-[100px] p-3 rounded-md border border-input bg-transparent text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--brand)]" 
                    placeholder="List out of scope items..."
                    value={outOfScope}
                    onChange={(e: any) => setOutOfScope(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Internal Notes (Not visible to customer)</label>
                  <textarea 
                    className="w-full min-h-[100px] p-3 rounded-md border border-input bg-yellow-50 dark:bg-yellow-900/10 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--brand)]" 
                    placeholder="Internal notes..."
                    value={internalNotes}
                    onChange={(e: any) => setInternalNotes(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 5: Review */}
          {step === 5 && (
            <Card>
              <CardHeader><CardTitle>Review & Submit</CardTitle></CardHeader>
              <CardContent>
                <div className="rounded-lg border bg-muted/30 p-6 space-y-6">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Title:</span> <span className="font-medium">{title}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Category:</span> <span className="font-medium">{config?.categories?.find(c => c.id === categoryId)?.name}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Complexity:</span> <span className="font-medium">{activeComplexity?.name} (x{multiplier})</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Buffer:</span> <span className="font-medium">{bufferPercent}%</span>
                    </div>
                  </div>
                  
                  <div className="h-px bg-border w-full" />
                  
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">Financial Summary</h3>
                    <div className="grid grid-cols-2 gap-y-2 text-sm">
                      <div className="text-muted-foreground">Base ManDays:</div><div className="text-right">{totals.base.toFixed(2)}</div>
                      <div className="text-muted-foreground">Complexity Adjusted:</div><div className="text-right">{totals.adjusted.toFixed(2)}</div>
                      <div className="text-muted-foreground">Buffer ({bufferPercent}%):</div><div className="text-right">{totals.buffer.toFixed(2)}</div>
                      <div className="text-muted-foreground font-semibold">Total Final ManDays:</div><div className="text-right font-semibold">{totals.final.toFixed(2)}</div>
                      <div className="col-span-2 my-2 h-px bg-border w-full" />
                      <div className="text-muted-foreground font-bold text-lg">Total Estimated Fee:</div><div className="text-right font-bold text-lg text-[color:var(--brand)]">{formatCurrency(totals.fee)}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            <Button variant="outline" onClick={prevStep} disabled={step === 1 || submitting}>
              <ChevronLeft className="mr-2 h-4 w-4" /> Previous
            </Button>
            {step < 5 ? (
              <Button onClick={nextStep} className="bg-[color:var(--brand)] hover:bg-[color:var(--brand-dark)] text-white">
                Next <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={() => handleSubmit('submit')} disabled={submitting} className="bg-green-600 hover:bg-green-700 text-white">
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Estimation
              </Button>
            )}
          </div>

        </div>

        {/* Sticky Summary Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <Card>
              <CardHeader className="bg-muted/50 pb-4 border-b">
                <CardTitle className="text-base">Estimation Summary</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Final ManDays</p>
                  <p className="text-2xl font-bold">{totals.final.toFixed(2)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Estimated Fee</p>
                  <p className="text-2xl font-bold text-[color:var(--brand)]">{formatCurrency(totals.fee)}</p>
                </div>
                <div className="pt-4 border-t space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Base:</span><span>{totals.base.toFixed(2)} MD</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Complexity:</span><span>x{multiplier.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Buffer:</span><span>+{totals.buffer.toFixed(2)} MD</span></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
