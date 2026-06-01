"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ChevronDown, ChevronRight, Save, Target, TrendingUp, AlertTriangle, CheckCircle, Info, RefreshCw } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/apiFetch";
import { useNumberFormat } from "@/lib/hooks/use-number-format";

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
  const { formatCurrency } = useNumberFormat();

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

    const realizedPct = target > 0 ? Math.min(Math.round((realized / target) * 100), 100) : 0;
    const estimatedPct = target > 0 ? Math.min(Math.round((estimated / target) * 100), 100) : 0;

    // Reportees allocation breakdown
    const childTargetsSum = (node.reports || []).reduce((sum, r) => sum + r.metrics.own_target_revenue, 0);
    const subRemaining = target - childTargetsSum;
    const isSubFullyAllocated = Math.abs(subRemaining) < 1;

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
                <span>Own Target: <b className="text-foreground">{formatCurrency(target)}</b></span>
                <span className="text-[color:var(--success)]">Won (Realized): <b>{formatCurrency(realized)}</b></span>
                <span className="text-[color:var(--info)]">Pipeline (Est): <b>{formatCurrency(estimated)}</b></span>
              </div>
            </div>
          </div>

          {/* Target configuration controls */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto shrink-0 md:justify-end">
            {/* Amount / Percentage toggle */}
            <div className="inline-flex rounded-lg border border-input p-0.5 bg-muted/40">
              <button
                type="button"
                onClick={() => handleUpdateNodeChange(node.id, "target_calculation_type", "amount", node)}
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
                onClick={() => handleUpdateNodeChange(node.id, "target_calculation_type", "percentage", node)}
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
                  type="number"
                  step="0.01"
                  min="0"
                  max="500"
                  className="w-16 text-right text-xs bg-transparent border-none outline-none focus:ring-0 font-mono"
                  value={node.target_percentage}
                  onChange={(e) =>
                    handleUpdateNodeChange(
                      node.id,
                      "target_percentage",
                      parseFloat(e.target.value) || 0,
                      node
                    )
                  }
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-card border border-input rounded-lg px-2.5 py-1">
                <span className="text-xs text-muted-foreground">IDR</span>
                <input
                  type="number"
                  step="1000000"
                  min="0"
                  className="w-32 text-right text-xs bg-transparent border-none outline-none focus:ring-0 font-mono"
                  value={node.metrics.own_target_revenue}
                  onChange={(e) =>
                    handleUpdateNodeChange(
                      node.id,
                      "target_revenue",
                      parseFloat(e.target.value) || 0,
                      node
                    )
                  }
                />
              </div>
            )}

            {/* Resolved display value (read-only context visualizer) */}
            {node.target_calculation_type === "percentage" && (
              <Badge variant="neutral" className="font-mono text-[11px] h-7 px-2">
                = {formatCurrency(target)}
              </Badge>
            )}
          </div>
        </div>

        {/* Micro allocation / rollup summary when has sub-reports */}
        {hasReports && (
          <div className="mt-1 px-4 py-1.5 flex flex-wrap justify-between items-center gap-2 bg-muted/20 border-x border-b border-border/60 rounded-b-lg text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Rollup Target: <b>{formatCurrency(node.metrics.rollup_target_revenue)}</b></span>
              <span className="mx-1">•</span>
              <span>Sub-Pipeline: <b>{formatCurrency(node.metrics.rollup_estimated_revenue)}</b></span>
            </div>
            
            <div>
              {isSubFullyAllocated ? (
                <span className="text-[color:var(--success)] flex items-center gap-1 font-medium">
                  <CheckCircle className="h-3 w-3" /> Cascaded 100%
                </span>
              ) : subRemaining > 0 ? (
                <span className="text-[color:var(--warning)] font-medium">
                  Remaining to cascade: {formatCurrency(subRemaining)}
                </span>
              ) : (
                <span className="text-[color:var(--danger)] font-medium flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Over-allocated: {formatCurrency(Math.abs(subRemaining))}
                </span>
              )}
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
                  <span className="text-sm text-muted-foreground">Company Target IDR:</span>
                  <div className="flex items-center gap-1.5 bg-card border border-input rounded-lg px-3 py-1.5 shadow-sm">
                    <input
                      type="number"
                      step="10000000"
                      min="0"
                      className="w-48 text-right font-semibold text-sm bg-transparent border-none outline-none focus:ring-0 font-mono"
                      value={companyTarget}
                      onChange={(e) => setCompanyTarget(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5">
              <div className="grid md:grid-cols-3 gap-6 pt-2">
                <div className="p-4 rounded-xl border border-border bg-card/50">
                  <span className="text-xs text-muted-foreground block">Distributed to GMs</span>
                  <span className="text-lg font-bold block mt-1 tabular-nums">{formatCurrency(totalGMsTarget)}</span>
                </div>

                <div className="p-4 rounded-xl border border-border bg-card/50">
                  <span className="text-xs text-muted-foreground block">Distribution Target Status</span>
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

                <div className="p-4 rounded-xl border border-border bg-card/50">
                  <span className="text-xs text-muted-foreground block">
                    {allocationStatus === "over_allocated" ? "Exceeded Allocation" : "Remaining to Distribute"}
                  </span>
                  <span className={`text-lg font-bold block mt-1 tabular-nums ${
                    allocationStatus === "over_allocated" ? "text-[color:var(--danger)]" : allocationStatus === "under_allocated" ? "text-[color:var(--warning)]" : "text-[color:var(--success)]"
                  }`}>
                    {formatCurrency(Math.abs(allocationRemaining))}
                  </span>
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
