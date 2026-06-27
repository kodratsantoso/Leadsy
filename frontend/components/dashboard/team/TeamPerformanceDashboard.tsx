"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AILoader } from "@/components/ui/ai-loader";
import { useNumberFormat } from "@/lib/hooks/use-number-format";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, AlertTriangle, Target, Activity, DollarSign, BrainCircuit, Search, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export function TeamPerformanceDashboard({ period, onDrilldown }: { period: string, onDrilldown: (d: any) => void }) {
  const { data: response, isLoading } = useQuery({
    queryKey: ["team-performance", period],
    queryFn: async () => {
      const res = await apiFetch(`/dashboard/team-performance?period=${period}`);
      return res.json();
    },
  });

  const { formatCurrency, formatNumber } = useNumberFormat();

  if (isLoading || !response) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <AILoader text="Loading Performance Insights" />
      </div>
    );
  }

  const {
    overview_kpis,
    role_matrix,
    leaderboard,
    lifecycle_funnel,
    target_achievement,
    revenue_contribution,
    attention_risks,
    kpi_trends,
    lost_bottlenecks,
    manager_hierarchy
  } = response.data;

  // Block 1: Overview KPIs
  const renderOverviewKpis = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card className="hover:shadow-md transition-all cursor-pointer" onClick={() => onDrilldown({ block_key: 'lifecycle_funnel', title: 'Total Leads' })}>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex justify-between">
            Total Leads (Period)
            <Users className="h-4 w-4 text-[color:var(--brand)]" />
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="text-3xl font-bold font-mono">{formatNumber(overview_kpis.total_leads, { decimals: 0 })}</div>
        </CardContent>
      </Card>
      
      <Card className="hover:shadow-md transition-all cursor-pointer" onClick={() => onDrilldown({ block_key: 'lifecycle_funnel', title: 'Active Opportunities' })}>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex justify-between">
            Active Opps
            <Activity className="h-4 w-4 text-[color:var(--status-warning)]" />
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="text-3xl font-bold font-mono">{formatNumber(overview_kpis.active_opps, { decimals: 0 })}</div>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-all cursor-pointer">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex justify-between">
            Pipeline Value
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="text-2xl font-bold font-mono">{formatCurrency(overview_kpis.pipeline_value)}</div>
        </CardContent>
      </Card>

      <Card className="border-[color:var(--status-success)]/30 hover:shadow-md transition-all cursor-pointer" onClick={() => onDrilldown({ block_key: 'revenue_contribution', title: 'Won Revenue' })}>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-medium text-[color:var(--status-success)] flex justify-between">
            Won Revenue
            <DollarSign className="h-4 w-4" />
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="text-2xl font-bold font-mono text-[color:var(--status-success)]">{formatCurrency(overview_kpis.won_revenue)}</div>
        </CardContent>
      </Card>
    </div>
  );

  // Block 2: Role Performance Matrix
  const renderRoleMatrix = () => (
    <Card className="col-span-12 lg:col-span-8 overflow-hidden mb-6">
      <CardHeader className="p-4 bg-muted/20 border-b">
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" /> Role Performance Matrix
        </CardTitle>
        <CardDescription>KPI targets and achievements by role category</CardDescription>
      </CardHeader>
      <div className="overflow-x-auto">
        <Table>
          <TableHeaderCell>
            <TableRow>
              <TableHead>Role</TableHead>
              <TableHead>Users</TableHead>
              <TableHead>KPIs Tracked</TableHead>
              <TableHead>Avg Achievement</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeaderCell>
          <TableBody>
            {role_matrix.map((team: any) => {
              const achievements = team.metrics.map((m: any) => m.achievement_percentage).filter((v: any) => v !== null);
              const avg = achievements.length > 0 ? achievements.reduce((a: any, b: any) => a + b, 0) / achievements.length : 0;
              return (
                <TableRow key={team.role_category}>
                  <TableCell className="font-bold capitalize">{team.role_category}</TableCell>
                  <TableCell>{team.user_count}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {team.metrics.slice(0, 3).map((m: any) => (
                        <Badge variant="outline" key={m.kpi_key} className="text-[10px] py-0">{m.kpi_name}</Badge>
                      ))}
                      {team.metrics.length > 3 && <Badge variant="neutral" className="text-[10px] py-0">+{team.metrics.length - 3}</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-[color:var(--brand)]" style={{ width: `${Math.min(100, avg)}%` }} />
                      </div>
                      <span className="text-xs font-mono">{avg.toFixed(1)}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => onDrilldown({ block_key: 'role_matrix', role: team.role_category, title: `${team.role_category} Details` })}>
                      View <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );

  // Block 3: Leaderboard
  const renderLeaderboard = () => (
    <Card className="col-span-12 lg:col-span-4 overflow-hidden mb-6">
      <CardHeader className="p-4 bg-muted/20 border-b">
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-amber-500" /> Leaderboard
        </CardTitle>
        <CardDescription>Top performers across all roles</CardDescription>
      </CardHeader>
      <div className="p-0">
        {leaderboard.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No data available</div>
        ) : (
          <ul className="divide-y divide-border">
            {leaderboard.map((user: any, idx: number) => (
              <li key={user.user_id} className="p-3 flex items-center gap-3 hover:bg-muted/10 cursor-pointer" onClick={() => onDrilldown({ block_key: 'user', user_id: user.user_id, title: user.name })}>
                <div className="font-mono font-bold text-muted-foreground text-sm w-6 text-center">#{idx + 1}</div>
                <div className="flex-1">
                  <div className="font-semibold text-sm">{user.name}</div>
                  <div className="text-[10px] text-muted-foreground uppercase">{user.role_category}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold font-mono text-[color:var(--brand)]">{user.overall_achievement.toFixed(1)}%</div>
                  <div className="text-[10px] text-muted-foreground">Achievement</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );

  // Block 6: Revenue Contribution (ApexCharts)
  const renderRevenueContribution = () => {
    const roles = Object.keys(revenue_contribution);
    const values = Object.values(revenue_contribution);
    
    const options = {
      chart: { type: 'bar', toolbar: { show: false } },
      plotOptions: { bar: { borderRadius: 4, horizontal: true } },
      dataLabels: { enabled: false },
      xaxis: { categories: roles },
      colors: ['var(--brand)'],
      tooltip: { theme: 'dark', y: { formatter: (val: number) => formatCurrency(val) } }
    };
    
    return (
      <Card className="col-span-12 lg:col-span-6 overflow-hidden mb-6">
        <CardHeader className="p-4 bg-muted/20 border-b">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-[color:var(--status-success)]" /> Revenue Contribution by Role
          </CardTitle>
          <CardDescription>Confirmed Sales Orders split by Role Assignment %</CardDescription>
        </CardHeader>
        <CardContent className="p-4 h-[300px]">
          {values.length > 0 ? (
            <Chart options={options as any} series={[{ name: 'Contribution', data: values as number[] }]} type="bar" height="100%" />
          ) : (
             <div className="flex items-center justify-center h-full text-muted-foreground">No confirmed sales orders for this period.</div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Block 7: Attention Risks
  const renderAttentionRisks = () => (
    <Card className="col-span-12 lg:col-span-6 overflow-hidden mb-6 border-[color:var(--status-danger)]/30">
      <CardHeader className="p-4 bg-[color-mix(in_oklch,var(--status-danger)_5%,transparent)] border-b border-[color:var(--status-danger)]/20">
        <CardTitle className="flex items-center gap-2 text-[color:var(--status-danger)]">
          <AlertTriangle className="h-5 w-5" /> Attention & Risk Center
        </CardTitle>
        <CardDescription>AI Highlights and anomalies requiring immediate action</CardDescription>
      </CardHeader>
      <div className="p-0 h-[300px] overflow-y-auto">
        {attention_risks.length === 0 ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">No active risks detected.</div>
        ) : (
          <ul className="divide-y divide-border">
            {attention_risks.map((risk: any) => (
              <li key={risk.id} className="p-3 hover:bg-muted/10">
                <div className="flex justify-between items-start mb-1">
                  <div className="font-semibold text-sm flex items-center gap-2">
                    <Badge variant={risk.severity === 'high' ? 'danger' : 'neutral'} className="text-[10px]">{risk.severity}</Badge>
                    {risk.title}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{risk.description}</p>
                <div className="flex items-center gap-2 text-[10px] font-mono">
                  {risk.lead_name && <Badge variant="outline">{risk.lead_name}</Badge>}
                  {risk.user_name && <span className="text-muted-foreground">Assigned to: {risk.user_name}</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {renderOverviewKpis()}
      <div className="grid grid-cols-12 gap-6">
        {renderRoleMatrix()}
        {renderLeaderboard()}
        {renderRevenueContribution()}
        {renderAttentionRisks()}
      </div>
    </div>
  );
}
