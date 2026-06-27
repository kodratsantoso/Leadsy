"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AILoader } from "@/components/ui/ai-loader";
import { useNumberFormat } from "@/lib/hooks/use-number-format";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, AlertTriangle, Target, Activity, DollarSign, ChevronRight, Clock, Target as TargetIcon, BarChart3, UserMinus, ShieldAlert, FileQuestion } from "lucide-react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

type DashboardProps = {
  period: string;
  onDrilldown: (data: any) => void;
};

export function TeamPerformanceDashboard({ period, onDrilldown }: DashboardProps) {
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

  // Render Status Badge
  const renderStatus = (status: string) => {
    switch (status) {
      case 'exceeded': return <Badge variant="success" className="text-[10px]">Exceeded</Badge>;
      case 'on_track': return <Badge variant="success" className="text-[10px]">On Track</Badge>;
      case 'at_risk': return <Badge variant="warning" className="text-[10px]">At Risk</Badge>;
      case 'behind': return <Badge variant="danger" className="text-[10px]">Behind</Badge>;
      case 'data_not_available': return <Badge variant="neutral" className="text-[10px]">No Data</Badge>;
      default: return <Badge variant="neutral" className="text-[10px]">{status}</Badge>;
    }
  };

  // Block 1: Overview KPIs
  const renderOverviewKpis = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      <Card className="hover:shadow-md transition-all cursor-pointer" onClick={() => onDrilldown({ block_key: 'lifecycle_funnel', title: 'Total Leads' })}>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground flex justify-between">
            Total Leads
            <Users className="h-4 w-4 text-[color:var(--brand)]" />
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="text-2xl font-bold font-mono">{formatNumber(overview_kpis.total_leads, { decimals: 0 })}</div>
        </CardContent>
      </Card>
      
      <Card className="hover:shadow-md transition-all cursor-pointer" onClick={() => onDrilldown({ block_key: 'lifecycle_funnel', stage: 'Qualified', title: 'Qualified Leads' })}>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground flex justify-between">
            Qualified
            <Target className="h-4 w-4 text-[color:var(--status-success)]" />
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="text-2xl font-bold font-mono">{formatNumber(overview_kpis.qualified_leads, { decimals: 0 })}</div>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-all cursor-pointer" onClick={() => onDrilldown({ block_key: 'lifecycle_funnel', title: 'Active Opportunities' })}>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground flex justify-between">
            Active Opps
            <Activity className="h-4 w-4 text-[color:var(--status-warning)]" />
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="text-2xl font-bold font-mono">{formatNumber(overview_kpis.active_opps, { decimals: 0 })}</div>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-all cursor-pointer">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground flex justify-between">
            Pipeline Value
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="text-xl font-bold font-mono">{formatCurrency(overview_kpis.pipeline_value)}</div>
        </CardContent>
      </Card>

      <Card className="border-[color:var(--status-success)]/30 hover:shadow-md transition-all cursor-pointer" onClick={() => onDrilldown({ block_key: 'revenue_contribution', title: 'Won Revenue' })}>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-xs font-medium text-[color:var(--status-success)] flex justify-between">
            Won Revenue
            <DollarSign className="h-4 w-4" />
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="text-xl font-bold font-mono text-[color:var(--status-success)]">{formatCurrency(overview_kpis.won_revenue)}</div>
        </CardContent>
      </Card>

      <Card className="border-[color:var(--status-danger)]/30 hover:shadow-md transition-all cursor-pointer" onClick={() => onDrilldown({ block_key: 'attention_risks', title: 'Overdue Follow-ups' })}>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-xs font-medium text-[color:var(--status-danger)] flex justify-between">
            Overdue Follow-ups
            <Clock className="h-4 w-4" />
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="text-2xl font-bold font-mono text-[color:var(--status-danger)]">{formatNumber(overview_kpis.overdue_follow_ups, { decimals: 0 })}</div>
        </CardContent>
      </Card>
    </div>
  );

  // Block 2: Role Performance Matrix
  const renderRoleMatrix = () => (
    <div className="col-span-12 lg:col-span-8 flex flex-col gap-4">
      {role_matrix.length === 0 ? (
        <Card className="h-full flex items-center justify-center">
          <CardContent className="p-8 text-center text-muted-foreground text-sm">
            No role KPI definitions configured or no users active.
          </CardContent>
        </Card>
      ) : (
        role_matrix.map((team: any) => {
          const achievements = team.metrics.map((m: any) => m.achievement_percentage).filter((v: any) => v !== null);
          const avg = achievements.length > 0 ? achievements.reduce((a: any, b: any) => a + b, 0) / achievements.length : 0;
          
          return (
            <Card key={team.role_category} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardHeader className="p-4 bg-muted/10 border-b flex flex-row items-center justify-between pb-3">
                <div className="flex items-center gap-2">
                  <TargetIcon className="h-4 w-4 text-[color:var(--brand)]" />
                  <CardTitle className="text-base font-bold capitalize">{team.role_category}</CardTitle>
                  <Badge variant="outline" className="ml-2 text-[10px]">{team.user_count} Users</Badge>
                </div>
                {renderStatus(achievements.length > 0 ? (avg >= 100 ? 'exceeded' : avg >= 75 ? 'on_track' : avg >= 50 ? 'at_risk' : 'behind') : 'data_not_available')}
              </CardHeader>
              <CardContent className="p-4">
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-muted-foreground font-medium">Average Achievement</span>
                    <span className="text-sm font-bold font-mono">{avg.toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-[color:var(--brand)] transition-all" style={{ width: `${Math.min(100, avg)}%` }} />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Key Metrics</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {team.metrics.map((m: any) => (
                      <div key={m.kpi_key} className="bg-muted/30 p-2.5 rounded-md border border-border/50 flex flex-col justify-between gap-2">
                        <div className="text-[10px] text-muted-foreground line-clamp-1 leading-tight" title={m.calculation_basis}>
                          {m.kpi_name}
                        </div>
                        <div className="flex items-end justify-between gap-2">
                          <span className="text-xs font-bold font-mono truncate">
                            {m.format === 'currency' ? formatCurrency(m.actual) : m.format === 'percentage' ? `${m.actual}%` : formatNumber(m.actual, { decimals: 0 })}
                            {m.target > 0 && <span className="text-[10px] text-muted-foreground ml-1">/ {m.format === 'currency' ? formatCurrency(m.target) : m.target}</span>}
                          </span>
                          {m.achievement_percentage !== null && (
                            <span className={`text-[10px] font-mono font-semibold ${m.achievement_percentage >= 100 ? 'text-[color:var(--status-success)]' : m.achievement_percentage >= 75 ? 'text-[color:var(--brand)]' : 'text-[color:var(--status-warning)]'}`}>
                              {m.achievement_percentage}%
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );

  // Block 7: Attention Risks
  const renderAttentionRisks = () => (
    <Card className="col-span-12 lg:col-span-4 overflow-hidden border-[color:var(--status-danger)]/30">
      <CardHeader className="p-4 bg-[color-mix(in_oklch,var(--status-danger)_5%,transparent)] border-b border-[color:var(--status-danger)]/20">
        <CardTitle className="flex items-center gap-2 text-[color:var(--status-danger)] text-base">
          <AlertTriangle className="h-4 w-4" /> Attention & Risk Center
        </CardTitle>
        <CardDescription className="text-xs">Immediate action required</CardDescription>
      </CardHeader>
      <div className="p-0 h-[320px] overflow-y-auto">
        {attention_risks.length === 0 ? (
          <div className="flex flex-col h-full items-center justify-center text-muted-foreground p-6 text-center space-y-2">
            <ShieldAlert className="h-8 w-8 opacity-20" />
            <p className="text-sm">No active risks detected.</p>
            <p className="text-xs opacity-60">Pipeline is healthy.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {attention_risks.map((risk: any, idx: number) => (
              <li key={idx} className="p-3 hover:bg-muted/10">
                <div className="flex justify-between items-start mb-1">
                  <div className="font-semibold text-sm flex items-center gap-2 text-foreground">
                    <Badge variant={risk.severity === 'critical' ? 'danger' : risk.severity === 'high' ? 'danger' : 'warning'} className="text-[9px] uppercase px-1 py-0">{risk.category.replace('_', ' ')}</Badge>
                    {risk.title}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{risk.description}</p>
                <div className="flex items-center gap-2 text-[10px] font-mono">
                  {risk.lead_name && <Badge variant="outline" className="text-[9px] py-0">{risk.lead_name}</Badge>}
                  {risk.user_name ? <span className="text-muted-foreground truncate max-w-[120px]">Assigned: {risk.user_name}</span> : <span className="text-rose-500 font-semibold flex items-center gap-1"><UserMinus className="h-3 w-3" /> Unassigned</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );

  // Block 4: Lifecycle Funnel
  const renderLifecycleFunnel = () => {
    const hasData = lifecycle_funnel.stages.some((s: any) => s.count > 0);
    
    const options = {
      chart: { type: 'bar', toolbar: { show: false } },
      plotOptions: { bar: { borderRadius: 2, horizontal: false, distributed: true } },
      dataLabels: { enabled: true, formatter: (val: number) => formatNumber(val, { decimals: 0 }), style: { fontSize: '10px' } },
      xaxis: { categories: lifecycle_funnel.stages.map((s: any) => s.stage_name), labels: { style: { fontSize: '9px' }, trim: true, hideOverlappingLabels: true } },
      colors: lifecycle_funnel.stages.map((s: any) => s.color || 'var(--brand)'),
      legend: { show: false },
      tooltip: { theme: 'dark', y: { title: { formatter: () => 'Leads' } } }
    };

    return (
      <Card className="col-span-12 overflow-hidden mb-6">
        <CardHeader className="p-4 bg-muted/20 border-b flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4" /> Lifecycle Funnel Distribution
            </CardTitle>
            <CardDescription className="text-xs">Current snapshot across all pipeline stages</CardDescription>
          </div>
          <Badge variant="outline">{formatNumber(lifecycle_funnel.total_leads, { decimals: 0 })} Total Leads</Badge>
        </CardHeader>
        <CardContent className="p-4 h-[250px]">
          {hasData ? (
             <Chart options={options as any} series={[{ name: 'Leads', data: lifecycle_funnel.stages.map((s: any) => s.count) }]} type="bar" height="100%" />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground text-sm">Add leads to see pipeline distribution.</div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Block 5: Target vs Achievement (grouped by role)
  const renderTargetAchievement = () => {
    const hasData = Object.keys(target_achievement).length > 0;
    
    return (
      <Card className="col-span-12 lg:col-span-6 overflow-hidden">
        <CardHeader className="p-4 bg-muted/20 border-b">
          <CardTitle className="flex items-center gap-2 text-base">
            <TargetIcon className="h-4 w-4" /> Target vs Achievement
          </CardTitle>
          <CardDescription className="text-xs">Progress against configured user targets</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {!hasData ? (
             <div className="flex flex-col h-[280px] items-center justify-center text-muted-foreground p-6 text-center space-y-2">
               <TargetIcon className="h-8 w-8 opacity-20" />
               <p className="text-sm">No targets configured for this period.</p>
               <p className="text-xs opacity-60">Configure target revenue in Settings → Users.</p>
             </div>
          ) : (
            <div className="h-[280px] overflow-y-auto p-4 space-y-6">
              {Object.entries(target_achievement).map(([role, items]: [string, any]) => (
                <div key={role} className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{role}</h4>
                  {items.map((item: any, idx: number) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between items-end">
                        <span className="text-sm font-medium">{item.name} <span className="text-xs text-muted-foreground font-normal ml-1">({item.kpi_name})</span></span>
                        <span className="text-xs font-mono font-bold">
                           {item.format === 'currency' ? formatCurrency(item.actual) : item.format === 'percentage' ? `${item.actual}%` : formatNumber(item.actual, { decimals: 0 })}
                           <span className="text-muted-foreground font-normal mx-1">/</span>
                           {item.format === 'currency' ? formatCurrency(item.target) : item.format === 'percentage' ? `${item.target}%` : formatNumber(item.target, { decimals: 0 })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${item.achievement_percentage >= 100 ? 'bg-[color:var(--status-success)]' : item.achievement_percentage >= 75 ? 'bg-[color:var(--brand)]' : 'bg-[color:var(--status-warning)]'}`} 
                            style={{ width: `${Math.min(100, item.achievement_percentage)}%` }} 
                          />
                        </div>
                        <span className="text-[10px] font-mono w-10 text-right">{item.achievement_percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Block 6: Revenue Contribution
  const renderRevenueContribution = () => {
    const roles = Object.keys(revenue_contribution.data);
    const values = Object.values(revenue_contribution.data);
    const hasData = values.length > 0;
    
    const options = {
      chart: { type: 'bar', toolbar: { show: false } },
      plotOptions: { bar: { borderRadius: 4, horizontal: true, distributed: true } },
      dataLabels: { enabled: true, formatter: (val: number) => formatCurrency(val), style: { fontSize: '10px' } },
      xaxis: { categories: roles.map(r => r.toUpperCase()), labels: { formatter: (val: number) => formatCurrency(val) } },
      colors: ['var(--brand)', 'var(--status-success)', 'var(--status-info)', 'var(--status-warning)'],
      legend: { show: false },
      tooltip: { theme: 'dark', y: { formatter: (val: number) => formatCurrency(val) } }
    };
    
    return (
      <Card className="col-span-12 lg:col-span-6 overflow-hidden">
        <CardHeader className="p-4 bg-muted/20 border-b">
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-4 w-4 text-[color:var(--status-success)]" /> Revenue Contribution by Role
          </CardTitle>
          <CardDescription className="text-xs truncate" title={revenue_contribution.data_source}>Source: {revenue_contribution.data_source}</CardDescription>
        </CardHeader>
        <CardContent className="p-4 h-[280px]">
          {hasData ? (
             <Chart options={options as any} series={[{ name: 'Contribution', data: values as number[] }]} type="bar" height="100%" />
          ) : (
             <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6 text-center space-y-2">
                <DollarSign className="h-8 w-8 opacity-20" />
                <p className="text-sm">No confirmed sales orders for this period.</p>
             </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Block 3: Leaderboard
  const renderLeaderboard = () => (
    <Card className="col-span-12 lg:col-span-6 overflow-hidden">
      <CardHeader className="p-4 bg-muted/20 border-b">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-4 w-4 text-amber-500" /> Leaderboard
        </CardTitle>
        <CardDescription className="text-xs">Top performers across all roles</CardDescription>
      </CardHeader>
      <div className="p-0 h-[300px] overflow-y-auto">
        {leaderboard.length === 0 ? (
          <div className="flex h-full items-center justify-center text-muted-foreground text-sm">No performance data available.</div>
        ) : (
          <ul className="divide-y divide-border">
            {leaderboard.map((user: any, idx: number) => (
              <li key={user.user_id} className="p-3 flex items-center gap-3 hover:bg-muted/10 transition-colors">
                <div className="font-mono font-bold text-muted-foreground text-sm w-6 text-center">#{idx + 1}</div>
                <div className="flex-1">
                  <div className="font-semibold text-sm">{user.name}</div>
                  <div className="text-[10px] text-muted-foreground uppercase">{user.role_name}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold font-mono text-[color:var(--brand)]">{user.overall_achievement.toFixed(1)}%</div>
                  <div className="text-[10px] text-muted-foreground">Avg Achievement</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );

  // Block 8: KPI Trends
  const renderKpiTrends = () => {
    const hasData = kpi_trends.labels.length > 0;
    
    const options = {
      chart: { type: 'area', toolbar: { show: false }, zoom: { enabled: false } },
      stroke: { curve: 'smooth', width: 2 },
      fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 90, 100] } },
      dataLabels: { enabled: false },
      xaxis: { categories: kpi_trends.labels, labels: { style: { colors: 'var(--muted-foreground)', fontSize: '10px' } } },
      yaxis: { labels: { style: { colors: 'var(--muted-foreground)', fontSize: '10px' } } },
      colors: ['var(--brand)', 'var(--status-success)', 'var(--status-info)'],
      legend: { position: 'top', horizontalAlign: 'right', fontSize: '12px' },
      tooltip: { theme: 'dark' }
    };

    return (
      <Card className="col-span-12 lg:col-span-6 overflow-hidden">
        <CardHeader className="p-4 bg-muted/20 border-b">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" /> KPI Trend Analysis
          </CardTitle>
          <CardDescription className="text-xs">Historical volume based on actual database timestamps</CardDescription>
        </CardHeader>
        <CardContent className="p-4 h-[300px]">
          {hasData ? (
             <Chart options={options as any} series={kpi_trends.series} type="area" height="100%" />
          ) : (
             <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6 text-center space-y-2">
                <BarChart3 className="h-8 w-8 opacity-20" />
                <p className="text-sm">No historical data yet.</p>
                <p className="text-xs opacity-60">Trends will appear as leads are created, won, and meetings are held.</p>
             </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Block 9: Lost Reason & Bottleneck
  const renderLostBottlenecks = () => {
    const lostReasons = Object.keys(lost_bottlenecks.lost_reasons);
    const lostData = Object.values(lost_bottlenecks.lost_reasons);
    
    const stuckStages = Object.keys(lost_bottlenecks.stuck_by_stage);
    const stuckData = Object.values(lost_bottlenecks.stuck_by_stage);
    
    const pieOptions = {
      chart: { type: 'donut' },
      labels: lostReasons,
      dataLabels: { enabled: false },
      legend: { position: 'bottom', fontSize: '10px' },
      colors: ['#ef4444', '#f97316', '#eab308', '#84cc16', '#06b6d4', '#8b5cf6'],
      plotOptions: { pie: { donut: { size: '70%', labels: { show: true, total: { show: true, showAlways: true, label: 'Lost Deals' } } } } },
      tooltip: { theme: 'dark' }
    };

    return (
      <Card className="col-span-12 lg:col-span-6 overflow-hidden">
        <CardHeader className="p-4 bg-muted/20 border-b flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileQuestion className="h-4 w-4" /> Lost & Bottleneck Analysis
            </CardTitle>
            <CardDescription className="text-xs">Loss reasons and leads stuck &gt; 14 days</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onDrilldown({ block_key: 'lost_bottlenecks', title: 'Lost Leads Analysis' })}>
            View Details <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </CardHeader>
        <CardContent className="p-0 h-[320px] flex flex-col md:flex-row">
          <div className="w-full md:w-1/2 p-4 border-b md:border-b-0 md:border-r flex flex-col justify-center items-center min-h-[160px]">
             {lostData.length > 0 ? (
               <div className="w-full h-[220px]">
                 <Chart options={pieOptions as any} series={lostData as number[]} type="donut" height="100%" />
               </div>
             ) : (
               <div className="text-center text-muted-foreground text-sm p-4">No lost deals in this period.</div>
             )}
          </div>
          <div className="w-full md:w-1/2 p-4 overflow-y-auto">
             <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Stuck Leads by Stage</h4>
             {stuckData.length > 0 ? (
               <ul className="space-y-3">
                 {stuckStages.map((stage, idx) => (
                   <li key={stage} className="flex justify-between items-center text-sm">
                     <span className="truncate max-w-[150px]" title={stage}>{stage}</span>
                     <Badge variant="outline" className="font-mono">{stuckData[idx] as number}</Badge>
                   </li>
                 ))}
               </ul>
             ) : (
               <div className="text-center text-muted-foreground text-sm p-4">No stuck leads detected.</div>
             )}
          </div>
        </CardContent>
      </Card>
    );
  };

  // Block 10: Manager Hierarchy
  const renderManagerHierarchy = () => {
    // Recursive render function for tree
    const renderNode = (node: any, depth = 0) => (
      <div key={node.id} className="w-full">
        <div 
          className="flex items-center gap-3 p-2 hover:bg-muted/10 transition-colors border-b border-border/50 border-dashed"
          style={{ paddingLeft: `${depth * 1.5 + 0.5}rem` }}
        >
          {depth > 0 && <div className="w-4 h-4 border-l-2 border-b-2 border-muted-foreground/30 rounded-bl" />}
          <div className="flex-1">
            <div className="font-semibold text-sm text-foreground">{node.name}</div>
            <div className="text-[10px] text-muted-foreground">{node.role}</div>
          </div>
          <div className="text-right">
             <div className="text-xs font-mono font-bold">{node.achievement.toFixed(1)}%</div>
             {renderStatus(node.achievement >= 100 ? 'exceeded' : node.achievement >= 75 ? 'on_track' : node.achievement >= 50 ? 'at_risk' : 'behind')}
          </div>
        </div>
        {node.children && node.children.length > 0 && (
          <div className="w-full">
            {node.children.map((child: any) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );

    return (
      <Card className="col-span-12 lg:col-span-6 overflow-hidden">
        <CardHeader className="p-4 bg-muted/20 border-b">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" /> Manager Team Hierarchy
          </CardTitle>
          <CardDescription className="text-xs">Performance rolled up by reporting lines</CardDescription>
        </CardHeader>
        <div className="p-0 h-[320px] overflow-y-auto">
          {manager_hierarchy.length === 0 ? (
             <div className="flex h-full items-center justify-center text-muted-foreground text-sm">No hierarchy data available.</div>
          ) : (
            <div className="flex flex-col w-full">
              {manager_hierarchy.map((node: any) => renderNode(node, 0))}
            </div>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {renderOverviewKpis()}
      
      <div className="grid grid-cols-12 gap-6 mb-6">
        {renderRoleMatrix()}
        {renderAttentionRisks()}
      </div>
      
      {renderLifecycleFunnel()}
      
      <div className="grid grid-cols-12 gap-6 mb-6">
        {renderTargetAchievement()}
        {renderRevenueContribution()}
      </div>
      
      <div className="grid grid-cols-12 gap-6 mb-6">
        {renderLeaderboard()}
        {renderKpiTrends()}
      </div>
      
      <div className="grid grid-cols-12 gap-6">
        {renderLostBottlenecks()}
        {renderManagerHierarchy()}
      </div>
    </div>
  );
}
