"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ChevronDown, ChevronRight, Save, Target, TrendingUp, AlertTriangle, CheckCircle, Info, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { apiFetch } from "@/lib/apiFetch";
import { useNumberFormat } from "@/lib/hooks/use-number-format";
import { Tabs } from "@/components/ui/tabs";

interface UserRole {
  name: string;
  display_name: string;
}

interface UserMetrics {
  own_target_revenue: number;
  own_estimated_revenue: number;
  own_realized_revenue: number;
  rollup_target_revenue: number;
  rollup_estimated_revenue: number;
  rollup_realized_revenue: number;
}

interface TreeNode {
  id: number;
  name: string;
  email: string;
  role: UserRole | null;
  tier_level: string;
  target_percentage: number;
  target_calculation_type: "amount" | "percentage";
  metrics: UserMetrics;
  reports: TreeNode[];
}

export default function TargetCascadesPage() {
  const { formatCurrency, formatAmountInput, normalizeAmountInput } = useNumberFormat();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyTarget, setCompanyTarget] = useState<number>(0);
  const [originalTree, setOriginalTree] = useState<TreeNode[]>([]);
  
  // Track client-side changes before saving
  const [changes, setChanges] = useState<Record<number, {
    target_calculation_type: "amount" | "percentage";
    target_percentage: number;
    target_revenue: number;
  }>>({});

  // Track expanded/collapsed nodes
  const [expandedNodes, setExpandedNodes] = useState<Record<number, boolean>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // activePeriod state: "month", "quarter", "year"
  const [activePeriod, setActivePeriod] = useState<"month" | "quarter" | "year">("month");
  
  // inputStates tracks raw input strings to prevent cursor jumps and trailing dots/zeros loss
  const [inputStates, setInputStates] = useState<Record<string, string>>({});

  const periodItems: { key: "month" | "quarter" | "year"; label: string }[] = [
    { key: "month", label: "Monthly Basis" },
    { key: "quarter", label: "Quarterly Basis" },
    { key: "year", label: "Yearly Basis" }
  ];

  const getDisplayTarget = (baseValue: number) => {
    let val = baseValue;
    if (activePeriod === "quarter") val = baseValue * 3;
    else if (activePeriod === "year") val = baseValue * 12;
    return Math.round(val * 100) / 100;
  };

  const getBaseTargetFromDisplay = (displayValue: number) => {
    let val = displayValue;
    if (activePeriod === "quarter") val = displayValue / 3;
    else if (activePeriod === "year") val = displayValue / 12;
    return Math.round(val * 100) / 100;
  };

  // Fetch initial targets config
  const fetchTargets = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await apiFetch("/api/settings/targets");
      if (response.ok) {
        const data = await response.json();
        setCompanyTarget(data.company_target_revenue || 0);
        setOriginalTree(data.tree || []);
        setInputStates({});
        
        // Expand root nodes by default
        const initialExpanded: Record<number, boolean> = {};
        data.tree.forEach((node: TreeNode) => {
          initialExpanded[node.id] = true;
        });
        setExpandedNodes(initialExpanded);
      } else {
        setErrorMessage("Failed to load target configurations.");
      }
    } catch (err) {
      setErrorMessage("Network error occurred while fetching targets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTargets();
  }, []);

  // Recursively compute resolved targets and rollups in memory for the tree
  const computedTree = useMemo(() => {
    const computeResolvedNode = (
      node: TreeNode,
      parentTarget: number
    ): TreeNode => {
      const nodeChanges = changes[node.id];
      const type = nodeChanges ? nodeChanges.target_calculation_type : node.target_calculation_type;
      const percentage = nodeChanges ? nodeChanges.target_percentage : node.target_percentage;
      const revenue = nodeChanges ? nodeChanges.target_revenue : node.metrics.own_target_revenue;

      const ownTarget = type === "percentage" ? (parentTarget * percentage) / 100 : revenue;
      const ownEst = node.metrics.own_estimated_revenue;
      const ownReal = node.metrics.own_realized_revenue;

      const resolvedReports = (node.reports || []).map((child) =>
        computeResolvedNode(child, ownTarget)
      );

      const rollupTarget = ownTarget + resolvedReports.reduce((sum, r) => sum + r.metrics.rollup_target_revenue, 0);
      const rollupEst = ownEst + resolvedReports.reduce((sum, r) => sum + r.metrics.rollup_estimated_revenue, 0);
      const rollupReal = ownReal + resolvedReports.reduce((sum, r) => sum + r.metrics.rollup_realized_revenue, 0);

      return {
        ...node,
        target_calculation_type: type,
        target_percentage: percentage,
        metrics: {
          own_target_revenue: ownTarget,
          own_estimated_revenue: ownEst,
          own_realized_revenue: ownReal,
          rollup_target_revenue: rollupTarget,
          rollup_estimated_revenue: rollupEst,
          rollup_realized_revenue: rollupReal,
        },
        reports: resolvedReports,
      };
    };

    return originalTree.map((node) => computeResolvedNode(node, companyTarget));
  }, [originalTree, companyTarget, changes]);

  // Sum of GM targets
  const totalGMsTarget = useMemo(() => {
    return computedTree.reduce((sum, node) => sum + node.metrics.own_target_revenue, 0);
  }, [computedTree]);

  // Allocation status of root (GMs)
  const allocationRemaining = companyTarget - totalGMsTarget;
  const allocationStatus = useMemo(() => {
    if (Math.abs(allocationRemaining) < 1) return "fully_allocated";
    return allocationRemaining > 0 ? "under_allocated" : "over_allocated";
  }, [allocationRemaining]);

  const handleToggleExpand = (id: number) => {
    setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleUpdateNodeChange = (
    id: number,
    field: "target_calculation_type" | "target_percentage" | "target_revenue",
    value: any,
    currentNode: TreeNode
  ) => {
    setChanges((prev) => {
      const current = prev[id] || {
        target_calculation_type: currentNode.target_calculation_type,
        target_percentage: currentNode.target_percentage,
        target_revenue: currentNode.metrics.own_target_revenue,
      };

      const updated = { ...current, [field]: value };
      
      // Keep value locked or recalculate base percentage if switching mode
      if (field === "target_calculation_type") {
        if (value === "percentage") {
          // Calculate percentage based on current revenue vs parent target
          const parentTarget = getParentTarget(originalTree, id, companyTarget);
          updated.target_percentage = parentTarget > 0 ? Number(((updated.target_revenue / parentTarget) * 100).toFixed(2)) : 100;
        } else {
          // amount mode
          const parentTarget = getParentTarget(originalTree, id, companyTarget);
          updated.target_revenue = Number(((parentTarget * updated.target_percentage) / 100).toFixed(2));
        }
      }

      return { ...prev, [id]: updated };
    });
  };

  const handleToggleCalculationType = (nodeId: number, type: "amount" | "percentage", node: TreeNode) => {
    setInputStates((prev) => {
      const updated = { ...prev };
      delete updated[`node-pct-${nodeId}`];
      delete updated[`node-amt-${nodeId}`];
      return updated;
    });
    handleUpdateNodeChange(nodeId, "target_calculation_type", type, node);
  };

  // Helper to find a user's parent target in the original tree
  const getParentTarget = (nodes: TreeNode[], childId: number, companyTarget: number): number => {
    for (const node of nodes) {
      if (node.reports && node.reports.some((r) => r.id === childId)) {
        // Resolve parent target dynamically considering client changes
        const parentChanges = changes[node.id];
        const pType = parentChanges ? parentChanges.target_calculation_type : node.target_calculation_type;
        const pPct = parentChanges ? parentChanges.target_percentage : node.target_percentage;
        const pRev = parentChanges ? parentChanges.target_revenue : node.metrics.own_target_revenue;
        
        if (pType === "percentage") {
          const grandParentTarget = getParentTarget(originalTree, node.id, companyTarget);
          return (grandParentTarget * pPct) / 100;
        }
        return pRev;
      }
      if (node.reports) {
        const found = getParentTarget(node.reports, childId, companyTarget);
        if (found > 0) return found;
      }
    }
    return companyTarget; // Root GMs have companyTarget as parent
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    // Prepare users payload array from changes record
    const usersPayload = Object.entries(changes).map(([id, change]) => ({
      id: Number(id),
      target_calculation_type: change.target_calculation_type,
      target_percentage: change.target_percentage,
      target_revenue: change.target_revenue,
    }));

    try {
      const response = await apiFetch("/api/settings/targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_target_revenue: companyTarget,
          users: usersPayload,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCompanyTarget(data.company_target_revenue || 0);
        setOriginalTree(data.tree || []);
        setChanges({});
        setInputStates({});
        setSuccessMessage("Target configurations saved and cascaded successfully.");
      } else {
        const errData = await response.json();
        setErrorMessage(errData.error || "Failed to save target settings.");
      }
    } catch (err) {
      setErrorMessage("Network error occurred while saving targets.");
    } finally {
      setSaving(false);
    }
  };

  // Recursively renders a user tree node
  const renderNode = (node: TreeNode) => {
    const isExpanded = !!expandedNodes[node.id];
    const hasReports = node.reports && node.reports.length > 0;
    
    // Performance metrics
    const target = node.metrics.own_target_revenue;
    const realized = node.metrics.own_realized_revenue;
    const estimated = node.metrics.own_estimated_revenue;

    // Reportees allocation breakdown
    const childTargetsSum = (node.reports || []).reduce((sum, r) => sum + r.metrics.own_target_revenue, 0);
    const subRemaining = target - childTargetsSum;
    const isSubFullyAllocated = Math.abs(subRemaining) < 1;

    const pctKey = `node-pct-${node.id}`;
    const initialPctVal = formatAmountInput(String(node.target_percentage));
    const displayPctVal = inputStates[pctKey] !== undefined ? inputStates[pctKey] : initialPctVal;

    const amtKey = `node-amt-${node.id}`;
    const initialAmtVal = formatAmountInput(String(getDisplayTarget(target)));
    const displayAmtVal = inputStates[amtKey] !== undefined ? inputStates[amtKey] : initialAmtVal;

    return (
      <div key={node.id} className="relative mt-3 pl-4 border-l border-border/80">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card/40 hover:bg-card/70 transition-all shadow-xs">
          <div className="flex items-start gap-2">
            {hasReports ? (
              <button 
                onClick={() => handleToggleExpand(node.id)}
                className="mt-1 p-0.5 rounded hover:bg-muted text-muted-foreground"
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            ) : (
              <div className="w-5" />
            )}
            
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-sm">{node.name}</span>
                <Badge variant="brand">{node.role?.display_name || "Sales Owner"}</Badge>
                <Badge variant="outline" className="text-[10px] tracking-wider uppercase font-mono px-1 py-0">{node.tier_level}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{node.email}</p>
              
              {/* Target & Pipeline Micro Achievements */}
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground tabular-nums">
                <span>Own Target ({activePeriod === "month" ? "Month" : activePeriod === "quarter" ? "Quarter" : "Year"}): <b className="text-foreground">{formatCurrency(getDisplayTarget(target))}</b></span>
                <span className="text-[color:var(--success)] font-medium">Total Won (Realized): <b>{formatCurrency(realized)}</b></span>
                <span className="text-[color:var(--info)] font-medium">Total Pipeline (Est): <b>{formatCurrency(estimated)}</b></span>
              </div>

              {/* Period Target Grid Breakdown */}
              <div className="mt-2.5 grid grid-cols-3 gap-3 border-t border-border/40 pt-2 text-[10px] text-muted-foreground font-mono max-w-md">
                <div className={`p-1.5 rounded-lg border transition-all ${
                  activePeriod === 'month' 
                    ? 'bg-[color:var(--brand)]/[0.06] border-[color:var(--brand)]/30 font-bold shadow-xs' 
                    : 'border-transparent'
                }`}>
                  <span className="block text-[8px] uppercase tracking-wider text-muted-foreground/70 font-semibold mb-0.5">Per Month</span>
                  <span className={`font-semibold text-xs tabular-nums ${activePeriod === 'month' ? 'text-[color:var(--brand)]' : 'text-foreground'}`}>{formatCurrency(target)}</span>
                </div>
                <div className={`p-1.5 rounded-lg border transition-all ${
                  activePeriod === 'quarter' 
                    ? 'bg-[color:var(--brand)]/[0.06] border-[color:var(--brand)]/30 font-bold shadow-xs' 
                    : 'border-transparent'
                }`}>
                  <span className="block text-[8px] uppercase tracking-wider text-muted-foreground/70 font-semibold mb-0.5">Per Quarter</span>
                  <span className={`font-semibold text-xs tabular-nums ${activePeriod === 'quarter' ? 'text-[color:var(--brand)]' : 'text-foreground'}`}>{formatCurrency(target * 3)}</span>
                </div>
                <div className={`p-1.5 rounded-lg border transition-all ${
                  activePeriod === 'year' 
                    ? 'bg-[color:var(--brand)]/[0.06] border-[color:var(--brand)]/30 font-bold shadow-xs' 
                    : 'border-transparent'
                }`}>
                  <span className="block text-[8px] uppercase tracking-wider text-muted-foreground/70 font-semibold mb-0.5">Per Year</span>
                  <span className={`font-semibold text-xs tabular-nums ${activePeriod === 'year' ? 'text-[color:var(--brand)]' : 'text-foreground'}`}>{formatCurrency(target * 12)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Target configuration controls */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto shrink-0 md:justify-end">
            {/* Amount / Percentage toggle */}
            <div className="inline-flex rounded-lg border border-input p-0.5 bg-muted/40">
              <button
                type="button"
                onClick={() => handleToggleCalculationType(node.id, "amount", node)}
                className={`px-2 py-1 text-xs rounded-md font-medium transition-all ${
                  node.target_calculation_type === "amount"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Amount
              </button>
              <button
                type="button"
                onClick={() => handleToggleCalculationType(node.id, "percentage", node)}
                className={`px-2 py-1 text-xs rounded-md font-medium transition-all ${
                  node.target_calculation_type === "percentage"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Percentage
              </button>
            </div>

            {/* Config value Input */}
            {node.target_calculation_type === "percentage" ? (
              <div className="flex items-center gap-1.5 bg-card border border-input rounded-lg px-2.5 py-1">
                <input
                  type="text"
                  className="w-16 text-right text-xs bg-transparent border-none outline-none focus:ring-0 font-mono"
                  value={displayPctVal}
                  onChange={(e) => {
                    const rawValue = e.target.value;
                    const normalized = normalizeAmountInput(rawValue);
                    const formatted = formatAmountInput(normalized);
                    setInputStates(prev => ({ ...prev, [pctKey]: formatted }));
                    const numeric = Number(normalized) || 0;
                    handleUpdateNodeChange(node.id, "target_percentage", numeric, node);
                  }}
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-card border border-input rounded-lg px-2.5 py-1">
                <span className="text-xs text-muted-foreground">IDR</span>
                <input
                  type="text"
                  className="w-32 text-right text-xs bg-transparent border-none outline-none focus:ring-0 font-mono"
                  value={displayAmtVal}
                  onChange={(e) => {
                    const rawValue = e.target.value;
                    const normalized = normalizeAmountInput(rawValue);
                    const formatted = formatAmountInput(normalized);
                    setInputStates(prev => ({ ...prev, [amtKey]: formatted }));
                    const numeric = Number(normalized) || 0;
                    const baseVal = getBaseTargetFromDisplay(numeric);
                    handleUpdateNodeChange(node.id, "target_revenue", baseVal, node);
                  }}
                />
              </div>
            )}

            {/* Resolved display value (read-only context visualizer) */}
            {node.target_calculation_type === "percentage" && (
              <Badge variant="neutral" className="font-mono text-[11px] h-7 px-2">
                = {formatCurrency(getDisplayTarget(target))}
              </Badge>
            )}
          </div>
        </div>

        {/* Micro allocation / rollup summary when has sub-reports */}
        {hasReports && (
          <div className="mt-1 px-4 py-2.5 flex flex-col gap-2 bg-muted/20 border-x border-b border-border/60 rounded-b-lg text-xs">
            <div className="flex flex-wrap justify-between items-center gap-2">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>
                  Rollup Target ({activePeriod === "month" ? "Month" : activePeriod === "quarter" ? "Quarter" : "Year"}): <b>{formatCurrency(getDisplayTarget(node.metrics.rollup_target_revenue))}</b>
                </span>
                <span className="mx-1">•</span>
                <span>
                  Sub-Pipeline ({activePeriod === "month" ? "Month" : activePeriod === "quarter" ? "Quarter" : "Year"}): <b>{formatCurrency(getDisplayTarget(node.metrics.rollup_estimated_revenue))}</b>
                </span>
              </div>
              
              <div>
                {isSubFullyAllocated ? (
                  <span className="text-[color:var(--success)] flex items-center gap-1 font-medium">
                    <CheckCircle className="h-3 w-3" /> Cascaded 100%
                  </span>
                ) : subRemaining > 0 ? (
                  <span className="text-[color:var(--warning)] font-medium">
                    Remaining to cascade ({activePeriod === "month" ? "Month" : activePeriod === "quarter" ? "Quarter" : "Year"}): {formatCurrency(getDisplayTarget(subRemaining))}
                  </span>
                ) : (
                  <span className="text-[color:var(--danger)] font-medium flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Over-allocated ({activePeriod === "month" ? "Month" : activePeriod === "quarter" ? "Quarter" : "Year"}): {formatCurrency(Math.abs(getDisplayTarget(subRemaining)))}
                  </span>
                )}
              </div>
            </div>
            
            {/* Rollup Period Details */}
            <div className="grid grid-cols-3 gap-3 border-t border-border/40 pt-2 text-[10px] text-muted-foreground font-mono">
              <div className={`p-1.5 rounded-lg border transition-all ${
                activePeriod === 'month' 
                  ? 'bg-[color:var(--brand)]/[0.06] border-[color:var(--brand)]/30 font-bold shadow-xs' 
                  : 'border-transparent'
              }`}>
                <span>Rollup Month:</span> <b className={`ml-1 ${activePeriod === 'month' ? 'text-[color:var(--brand)]' : 'text-foreground'}`}>{formatCurrency(node.metrics.rollup_target_revenue)}</b>
              </div>
              <div className={`p-1.5 rounded-lg border transition-all ${
                activePeriod === 'quarter' 
                  ? 'bg-[color:var(--brand)]/[0.06] border-[color:var(--brand)]/30 font-bold shadow-xs' 
                  : 'border-transparent'
              }`}>
                <span>Rollup Quarter:</span> <b className={`ml-1 ${activePeriod === 'quarter' ? 'text-[color:var(--brand)]' : 'text-foreground'}`}>{formatCurrency(node.metrics.rollup_target_revenue * 3)}</b>
              </div>
              <div className={`p-1.5 rounded-lg border transition-all ${
                activePeriod === 'year' 
                  ? 'bg-[color:var(--brand)]/[0.06] border-[color:var(--brand)]/30 font-bold shadow-xs' 
                  : 'border-transparent'
              }`}>
                <span>Rollup Year:</span> <b className={`ml-1 ${activePeriod === 'year' ? 'text-[color:var(--brand)]' : 'text-foreground'}`}>{formatCurrency(node.metrics.rollup_target_revenue * 12)}</b>
              </div>
            </div>
          </div>
        )}

        {/* Child reportees recursion */}
        {hasReports && isExpanded && (
          <div className="mt-2 space-y-2 ml-4 md:ml-6">
            {node.reports.map((child) => renderNode(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Target Cascades</h1>
          <p className="text-sm text-muted-foreground">
            Manage company target and cascade revenue goals hierarchically from managers to sales reps.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchTargets} disabled={loading || saving}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={handleSave} disabled={loading || saving}>
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>

      {/* Messages */}
      {errorMessage && (
        <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive text-sm flex items-start gap-2.5">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>{errorMessage}</div>
        </div>
      )}
      {successMessage && (
        <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm flex items-start gap-2.5">
          <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>{successMessage}</div>
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-border bg-card">
          <div className="flex flex-col items-center gap-2">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading target configurations...</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-6">
          
          {/* Period Selector Tabs */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-card/60 p-2 border border-border rounded-xl gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground font-semibold px-2.5">Cascade Period Mode:</span>
              <Tabs
                value={activePeriod}
                onValueChange={(val) => {
                  setActivePeriod(val);
                  setInputStates({});
                }}
                items={periodItems}
              />
            </div>
            <div className="text-xs text-muted-foreground/80 font-medium px-2.5">
              * Editing values in any view automatically recalculates the other periods.
            </div>
          </div>

          {/* Top company target configurator */}
          <Card className="overflow-hidden border-[color:var(--brand)] bg-[color:var(--brand)]/[0.02]">
            <CardHeader className="bg-[color:var(--brand)]/[0.03] border-b border-border">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[color:var(--brand)] text-white shadow-md">
                    <Target className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>Company Revenue Target</CardTitle>
                    <CardDescription>Setup the global sales target to distribute across all departments.</CardDescription>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm text-muted-foreground font-semibold">
                    Company Target ({activePeriod === "month" ? "Month" : activePeriod === "quarter" ? "Quarter" : "Year"}) IDR:
                  </span>
                  <div className="flex items-center gap-1.5 bg-card border border-input rounded-lg px-3 py-1.5 shadow-sm">
                    <input
                      type="text"
                      className="w-48 text-right font-bold text-sm bg-transparent border-none outline-none focus:ring-0 font-mono text-[color:var(--brand)]"
                      value={inputStates["company-target"] !== undefined ? inputStates["company-target"] : formatAmountInput(String(getDisplayTarget(companyTarget)))}
                      onChange={(e) => {
                        const rawValue = e.target.value;
                        const normalized = normalizeAmountInput(rawValue);
                        const formatted = formatAmountInput(normalized);
                        setInputStates(prev => ({ ...prev, "company-target": formatted }));
                        const numeric = Number(normalized) || 0;
                        setCompanyTarget(getBaseTargetFromDisplay(numeric));
                      }}
                    />
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5">
              <div className="grid md:grid-cols-3 gap-6 pt-2">
                {/* Column 1: Distributed to GMs */}
                <div className="p-4 rounded-xl border border-border bg-card/50">
                  <span className="text-xs text-muted-foreground block font-medium">
                    Distributed to GMs ({activePeriod === "month" ? "Month" : activePeriod === "quarter" ? "Quarter" : "Year"})
                  </span>
                  <span className="text-lg font-bold block mt-1 tabular-nums">
                    {formatCurrency(getDisplayTarget(totalGMsTarget))}
                  </span>
                  <div className="mt-2.5 space-y-1.5 text-xs text-muted-foreground border-t border-border/60 pt-2.5 font-mono">
                    <div className={`flex justify-between px-1 rounded ${activePeriod === 'month' ? 'bg-[color:var(--brand)]/[0.06] font-bold text-foreground' : ''}`}>
                      <span>Per Month:</span> <span>{formatCurrency(totalGMsTarget)}</span>
                    </div>
                    <div className={`flex justify-between px-1 rounded ${activePeriod === 'quarter' ? 'bg-[color:var(--brand)]/[0.06] font-bold text-foreground' : ''}`}>
                      <span>Per Quarter:</span> <span>{formatCurrency(totalGMsTarget * 3)}</span>
                    </div>
                    <div className={`flex justify-between px-1 rounded ${activePeriod === 'year' ? 'bg-[color:var(--brand)]/[0.06] font-bold text-foreground' : ''}`}>
                      <span>Per Year:</span> <span>{formatCurrency(totalGMsTarget * 12)}</span>
                    </div>
                  </div>
                </div>

                {/* Column 2: Target Allocation Status */}
                <div className="p-4 rounded-xl border border-border bg-card/50 flex flex-col justify-between">
                  <div>
                    <span className="text-xs text-muted-foreground block font-medium">Target Allocation Status</span>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      {allocationStatus === "fully_allocated" && (
                        <span className="text-[color:var(--success)] flex items-center gap-1 font-semibold text-sm">
                          <CheckCircle className="h-4 w-4" /> 100% Allocated
                        </span>
                      )}
                      {allocationStatus === "under_allocated" && (
                        <span className="text-[color:var(--warning)] flex items-center gap-1 font-semibold text-sm">
                          <Info className="h-4 w-4" /> Under-allocated
                        </span>
                      )}
                      {allocationStatus === "over_allocated" && (
                        <span className="text-[color:var(--danger)] flex items-center gap-1 font-semibold text-sm">
                          <AlertTriangle className="h-4 w-4" /> Over-allocated
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 space-y-1.5 text-xs text-muted-foreground border-t border-border/60 pt-2.5 font-mono">
                    <div className={`flex justify-between px-1 rounded ${activePeriod === 'month' ? 'bg-[color:var(--brand)]/[0.06] font-bold text-foreground' : ''}`}>
                      <span>Target Month:</span> <span>{formatCurrency(companyTarget)}</span>
                    </div>
                    <div className={`flex justify-between px-1 rounded ${activePeriod === 'quarter' ? 'bg-[color:var(--brand)]/[0.06] font-bold text-foreground' : ''}`}>
                      <span>Target Quarter:</span> <span>{formatCurrency(companyTarget * 3)}</span>
                    </div>
                    <div className={`flex justify-between px-1 rounded ${activePeriod === 'year' ? 'bg-[color:var(--brand)]/[0.06] font-bold text-foreground' : ''}`}>
                      <span>Target Year:</span> <span>{formatCurrency(companyTarget * 12)}</span>
                    </div>
                  </div>
                </div>

                {/* Column 3: Remaining to Distribute */}
                <div className="p-4 rounded-xl border border-border bg-card/50">
                  <span className="text-xs text-muted-foreground block font-medium">
                    {allocationStatus === "over_allocated" ? "Exceeded Allocation" : "Remaining to Distribute"} ({activePeriod === "month" ? "Month" : activePeriod === "quarter" ? "Quarter" : "Year"})
                  </span>
                  <span className={`text-lg font-bold block mt-1 tabular-nums ${
                    allocationStatus === "over_allocated" ? "text-[color:var(--danger)]" : allocationStatus === "under_allocated" ? "text-[color:var(--warning)]" : "text-[color:var(--success)]"
                  }`}>
                    {formatCurrency(Math.abs(getDisplayTarget(allocationRemaining)))}
                  </span>
                  <div className="mt-2.5 space-y-1.5 text-xs text-muted-foreground border-t border-border/60 pt-2.5 font-mono">
                    <div className={`flex justify-between px-1 rounded ${activePeriod === 'month' ? 'bg-[color:var(--brand)]/[0.06] font-bold' : ''}`}>
                      <span>Monthly Diff:</span> <span className={allocationRemaining < 0 ? "text-[color:var(--danger)]" : "text-foreground"}>{formatCurrency(allocationRemaining)}</span>
                    </div>
                    <div className={`flex justify-between px-1 rounded ${activePeriod === 'quarter' ? 'bg-[color:var(--brand)]/[0.06] font-bold' : ''}`}>
                      <span>Quarterly Diff:</span> <span className={allocationRemaining < 0 ? "text-[color:var(--danger)]" : "text-foreground"}>{formatCurrency(allocationRemaining * 3)}</span>
                    </div>
                    <div className={`flex justify-between px-1 rounded ${activePeriod === 'year' ? 'bg-[color:var(--brand)]/[0.06] font-bold' : ''}`}>
                      <span>Yearly Diff:</span> <span className={allocationRemaining < 0 ? "text-[color:var(--danger)]" : "text-foreground"}>{formatCurrency(allocationRemaining * 12)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Target Cascade Hierarchy Tree */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold tracking-tight">Organization Cascade tree</h2>
              <span className="text-xs text-muted-foreground">Adjust percentages or amounts dynamically</span>
            </div>

            {computedTree.length === 0 ? (
              <div className="p-12 text-center border border-border bg-card rounded-2xl">
                <Target className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No reporting relationships found. Make sure users have assigned managers.</p>
              </div>
            ) : (
              <div className="p-6 rounded-2xl border border-border bg-card shadow-xs space-y-4">
                {computedTree.map((node) => renderNode(node))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
