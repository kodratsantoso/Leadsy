"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Save, FileText, Settings, Users, ArrowRight, Check, CheckCircle2, ChevronRight, Loader2, Plus, Trash2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import {
  PsConfig, PsEstimation, PsEstimationLine, PsEstimationTemplate,
  getPsConfig, getTemplates, getTemplate, createEstimation
} from "@/lib/api/professional-services";
import { fetchLead, Lead } from "@/lib/api/leads";
import { useNumberFormat } from "@/lib/hooks/use-number-format";

export function EstimatorWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leadIdParam = searchParams.get("lead_id");
  const leadId = leadIdParam ? parseInt(leadIdParam) : null;
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Data
  const [config, setConfig] = useState<PsConfig | null>(null);
  const [templates, setTemplates] = useState<PsEstimationTemplate[]>([]);
  const [lead, setLead] = useState<Lead | null>(null);
  
  // Form State
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [templateId, setTemplateId] = useState<number | "">("");
  const [complexityId, setComplexityId] = useState<number | "">("");
  const [bufferPercent, setBufferPercent] = useState<number>(10);
  const [currency, setCurrency] = useState("USD");
  const { setting: currencySetting } = useNumberFormat();
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
          getTemplates(),
          ...(leadId ? [fetchLead(String(leadId)).then(setLead)] : [])
        ]);
        setConfig(conf);
        setTemplates(tmpl);

        // Defaults
        if (conf?.categories?.length > 0) setCategoryId(conf.categories[0].id);
        if (conf?.complexity_levels?.length > 0) {
          const defaultCmplx = conf.complexity_levels.find((c: any) => c.multiplier === "1.00") || conf.complexity_levels[0];
          setComplexityId(defaultCmplx.id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [leadId]);

  // Default the estimation's currency to the tenant's configured currency,
  // instead of a hardcoded "USD", once it's loaded.
  useEffect(() => {
    if (currencySetting?.currency_code) {
      setCurrency(currencySetting.currency_code);
    }
  }, [currencySetting?.currency_code]);

  const loadTemplate = async (tid: number) => {
    try {
      const template = await getTemplate(tid);
      const components = (template.components ?? []).filter(c => !c.is_optional);
      setLines(
        components
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((c, i) => ({
            task_name: c.task_name,
            description: c.description ?? undefined,
            base_mandays: c.base_mandays,
            role_id: c.role_id ?? config?.roles?.[0]?.id,
            sort_order: i + 1,
            manual_adjustment: 0,
            deliverable: c.deliverable ?? undefined,
          }))
      );
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
        lead_id: leadId || undefined,
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
    } catch (e) {
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
    <div className="w-full space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="h-8 px-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
            </Button>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">New Estimation</h1>
            {leadId && (
              <Badge variant="outline" className="bg-brand/10 text-brand border-brand/20 font-medium">
                Linked to lead: {lead ? lead.company_name : `#${leadId}`}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Configure professional service scope, complexity matrix, role breakdown, and financial summary.
          </p>
        </div>
      </div>

      {/* Stepper Bar */}
      <div className="flex items-center justify-between bg-card rounded-xl p-4 border border-border shadow-xs overflow-x-auto gap-2">
        {[
          { num: 1, label: "Basic Info", icon: FileText },
          { num: 2, label: "Scope Components", icon: Settings },
          { num: 3, label: "Role Breakdown", icon: Users },
          { num: 4, label: "Assumptions", icon: FileText },
          { num: 5, label: "Review & Submit", icon: CheckCircle2 }
        ].map((s, i, arr) => (
          <div key={s.num} className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => step > s.num ? setStep(s.num) : null}
              className={`flex items-center transition-colors ${step > s.num ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
            >
              <div
                className={`flex items-center justify-center h-8 w-8 rounded-full border-2 text-xs font-semibold transition-all ${
                  step === s.num
                    ? 'bg-[color:var(--brand)] border-[color:var(--brand)] text-white shadow-xs'
                    : step > s.num
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'border-muted-foreground/30 text-muted-foreground'
                }`}
              >
                {step > s.num ? <Check className="h-4 w-4" /> : s.num}
              </div>
              <span
                className={`ml-2.5 text-xs font-medium hidden md:inline-block ${
                  step >= s.num ? 'text-foreground font-semibold' : 'text-muted-foreground'
                }`}
              >
                {s.label}
              </span>
            </button>
            {i < arr.length - 1 && <div className="h-px w-6 sm:w-12 lg:w-16 bg-border mx-3 sm:mx-4" />}
          </div>
        ))}
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
        {/* Left Form Area */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-6">
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Enter project details, service category, template, and complexity.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">Estimation Title <span className="text-destructive">*</span></label>
                    <Input
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="e.g. ERP Implementation Phase 1"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Service Category <span className="text-destructive">*</span></label>
                    <select
                      className="w-full h-10 px-3 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-brand shadow-xs"
                      value={categoryId.toString()}
                      onChange={(e) => setCategoryId(parseInt(e.target.value))}
                    >
                      <option value="0" disabled>Select a category...</option>
                      {config?.categories?.filter(c => c.is_active).map(c => (
                        <option key={c.id} value={c.id.toString()}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Template</label>
                    <select
                      className="w-full h-10 px-3 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-brand shadow-xs"
                      value={templateId.toString()}
                      onChange={(e) => handleTemplateChange(e.target.value)}
                    >
                      <option value="0">Blank (Manual)</option>
                      {templates?.map(t => <option key={t.id} value={t.id.toString()}>{t.name}</option>)}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Complexity Level <span className="text-destructive">*</span></label>
                    <select
                      className="w-full h-10 px-3 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-brand shadow-xs"
                      value={complexityId.toString()}
                      onChange={(e) => setComplexityId(parseInt(e.target.value))}
                    >
                      <option value="0" disabled>Select complexity...</option>
                      {config?.complexity_levels?.filter(c => c.is_active).map(c => (
                        <option key={c.id} value={c.id.toString()}>{c.name} (x{c.multiplier})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Buffer Percentage (%)</label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={bufferPercent}
                      onChange={e => setBufferPercent(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Scope Components</CardTitle>
                  <CardDescription>Define deliverable tasks, assign engineering roles, and estimate man-days.</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={addLine}>
                  <Plus className="h-4 w-4 mr-2" /> Add Task
                </Button>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl border border-border overflow-hidden bg-card shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          <th className="py-3 px-4 text-left w-2/5">Task Name</th>
                          <th className="py-3 px-3 text-left w-1/4">Role</th>
                          <th className="py-3 px-3 text-right">Base MD</th>
                          <th className="py-3 px-3 text-right">Adj. MD</th>
                          <th className="py-3 px-3 text-right">Fee</th>
                          <th className="py-3 px-3 text-right w-12"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {calculatedLines.map((line, i) => (
                          <tr key={i} className="border-b border-border hover:bg-muted/20 transition-colors">
                            <td className="py-2.5 px-4">
                              <Input
                                value={line.task_name}
                                onChange={e => updateLine(i, 'task_name', e.target.value)}
                                placeholder="Task name / deliverable"
                              />
                            </td>
                            <td className="py-2.5 px-3">
                              <select
                                className="w-full h-9 px-2.5 text-xs bg-card border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-brand"
                                value={line.role_id?.toString()}
                                onChange={(e) => updateLine(i, "role_id", parseInt(e.target.value))}
                              >
                                <option value="" disabled>Select Role...</option>
                                {config?.roles?.filter(r => r.is_active).map(r => (
                                  <option key={r.id} value={r.id.toString()}>{r.name}</option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2.5 px-3 text-right w-24">
                              <Input
                                type="number"
                                min="0"
                                step="0.5"
                                value={line.base_mandays}
                                onChange={e => updateLine(i, 'base_mandays', parseFloat(e.target.value))}
                                className="text-right"
                              />
                            </td>
                            <td className="py-2.5 px-3 text-right text-muted-foreground font-medium tabular-nums">
                              {line.final_mandays?.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3 text-right text-muted-foreground font-medium tabular-nums">
                              {formatCurrency(line.estimated_fee || 0)}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeLine(i)}
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Role Breakdown</CardTitle>
                <CardDescription>Aggregated resource requirements and associated fees by engineering role.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl border border-border overflow-hidden bg-card shadow-xs">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <th className="text-left py-3 px-4">Role</th>
                        <th className="text-right py-3 px-4">Total ManDays</th>
                        <th className="text-right py-3 px-4">Total Fee</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(roleBreakdown).map(([role, data]) => (
                        <tr key={role} className="border-b border-border hover:bg-muted/20 transition-colors">
                          <td className="py-3 px-4 font-medium text-foreground">{role}</td>
                          <td className="py-3 px-4 text-right tabular-nums">{data.mandays.toFixed(2)} MD</td>
                          <td className="py-3 px-4 text-right tabular-nums font-semibold">{formatCurrency(data.fee)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/20 font-bold">
                        <td className="py-3 px-4 text-foreground">Total</td>
                        <td className="py-3 px-4 text-right tabular-nums">{totals.final.toFixed(2)} MD</td>
                        <td className="py-3 px-4 text-right tabular-nums text-[color:var(--brand)]">{formatCurrency(totals.fee)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 4 && (
            <Card>
              <CardHeader>
                <CardTitle>Assumptions & Constraints</CardTitle>
                <CardDescription>Document project dependencies, scope boundaries, and internal delivery notes.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Assumptions</label>
                  <textarea
                    className="w-full min-h-[100px] p-3 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-brand shadow-xs"
                    placeholder="List project assumptions..."
                    value={assumptions}
                    onChange={(e: any) => setAssumptions(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Out of Scope</label>
                  <textarea
                    className="w-full min-h-[100px] p-3 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-brand shadow-xs"
                    placeholder="List out of scope items..."
                    value={outOfScope}
                    onChange={(e: any) => setOutOfScope(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Internal Notes (Not visible to customer)</label>
                  <textarea
                    className="w-full min-h-[100px] p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-brand shadow-xs"
                    placeholder="Internal team notes..."
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
              <CardHeader>
                <CardTitle>Review & Submit</CardTitle>
                <CardDescription>Review the final project parameters before creating the estimation.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl border border-border bg-card p-6 space-y-6 shadow-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                      <span className="text-xs uppercase tracking-wider text-muted-foreground block font-semibold mb-1">Title</span>
                      <span className="font-medium text-foreground">{title || "Untitled Estimation"}</span>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                      <span className="text-xs uppercase tracking-wider text-muted-foreground block font-semibold mb-1">Category</span>
                      <span className="font-medium text-foreground">{config?.categories?.find(c => c.id === categoryId)?.name || "-"}</span>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                      <span className="text-xs uppercase tracking-wider text-muted-foreground block font-semibold mb-1">Complexity Level</span>
                      <span className="font-medium text-foreground">{activeComplexity?.name} (Multiplier: x{multiplier})</span>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                      <span className="text-xs uppercase tracking-wider text-muted-foreground block font-semibold mb-1">Buffer Rate</span>
                      <span className="font-medium text-foreground">{bufferPercent}%</span>
                    </div>
                  </div>

                  <div className="h-px bg-border w-full" />

                  <div className="space-y-3">
                    <h3 className="font-semibold text-base text-foreground">Financial Summary</h3>
                    <div className="grid grid-cols-2 gap-y-2 text-sm p-4 rounded-xl bg-muted/20 border border-border">
                      <div className="text-muted-foreground">Base ManDays:</div>
                      <div className="text-right font-medium tabular-nums">{totals.base.toFixed(2)} MD</div>
                      <div className="text-muted-foreground">Complexity Adjusted:</div>
                      <div className="text-right font-medium tabular-nums">{totals.adjusted.toFixed(2)} MD</div>
                      <div className="text-muted-foreground">Buffer ({bufferPercent}%):</div>
                      <div className="text-right font-medium tabular-nums">+{totals.buffer.toFixed(2)} MD</div>
                      <div className="text-foreground font-semibold">Total Final ManDays:</div>
                      <div className="text-right font-semibold tabular-nums text-foreground">{totals.final.toFixed(2)} MD</div>
                      <div className="col-span-2 my-2 h-px bg-border w-full" />
                      <div className="text-foreground font-bold text-base">Total Estimated Fee:</div>
                      <div className="text-right font-bold text-lg text-[color:var(--brand)]">{formatCurrency(totals.fee)}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" onClick={prevStep} disabled={step === 1 || submitting}>
              <ChevronLeft className="mr-2 h-4 w-4" /> Previous
            </Button>
            {step < 5 ? (
              <Button onClick={nextStep} className="bg-[color:var(--brand)] hover:bg-[color:var(--brand-dark)] text-white">
                Next <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={() => handleSubmit('submit')} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Estimation
              </Button>
            )}
          </div>
        </div>

        {/* Sticky Summary Sidebar */}
        <div className="lg:col-span-4 xl:col-span-3">
          <div className="sticky top-6 space-y-4">
            <Card className="shadow-xs border-border">
              <CardHeader className="bg-muted/40 pb-4 border-b border-border">
                <CardTitle className="text-base font-semibold">Estimation Summary</CardTitle>
                <CardDescription>Live real-time calculated total</CardDescription>
              </CardHeader>
              <CardContent className="pt-5 space-y-5">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Total Final ManDays</p>
                  <p className="text-3xl font-extrabold tracking-tight text-foreground tabular-nums">{totals.final.toFixed(2)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Total Estimated Fee</p>
                  <p className="text-2xl font-bold text-[color:var(--brand)] tabular-nums">{formatCurrency(totals.fee)}</p>
                </div>
                <div className="pt-4 border-t border-border space-y-2.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Base ManDays:</span>
                    <span className="font-medium text-foreground tabular-nums">{totals.base.toFixed(2)} MD</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Complexity:</span>
                    <span className="font-medium text-foreground tabular-nums">x{multiplier.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Buffer ({bufferPercent}%):</span>
                    <span className="font-medium text-foreground tabular-nums">+{totals.buffer.toFixed(2)} MD</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
