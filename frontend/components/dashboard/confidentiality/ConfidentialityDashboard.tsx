"use client";

import React, { useState, useEffect } from 'react';
import { apiFetch } from "@/lib/apiFetch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ShieldAlert, ShieldCheck, Shield, Lock, AlertTriangle, UserCheck, 
  ChevronRight, AlertCircle, HelpCircle, FileText, Activity, Users,
  CheckCircle2, XCircle
} from "lucide-react";
import dynamic from 'next/dynamic';
const ApexCharts = dynamic(() => import('react-apexcharts'), { ssr: false });

interface ConfidentialityDashboardProps {
  onDrilldown: (params: any) => void;
}

export const ConfidentialityDashboard: React.FC<ConfidentialityDashboardProps> = ({ onDrilldown }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch data from the real API endpoint
    const fetchData = async () => {
      try {
        const response = await apiFetch('/dashboard/confidentiality');
        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error("Failed to load confidentiality dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
        <p className="text-sm text-muted-foreground animate-pulse">Loading confidentiality metrics...</p>
      </div>
    );
  }

  if (!data || !data.overview) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <ShieldAlert className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
        <h3 className="text-lg font-medium text-foreground">No Assessment Data Available</h3>
        <p className="text-sm text-muted-foreground">Run the confidentiality scoring engine to populate this dashboard.</p>
      </div>
    );
  }

  const { overview, distribution, matrix, indicators, trend, risks } = data;

  // Render Status Badge
  const renderLevelBadge = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'restricted': return <Badge variant="danger" className="uppercase font-bold tracking-wider text-[10px]">Restricted</Badge>;
      case 'high': return <Badge className="bg-[color:var(--status-warning)] hover:bg-[color:var(--status-warning)] uppercase font-bold tracking-wider text-[10px]">High</Badge>;
      case 'medium': return <Badge className="bg-[color:var(--status-info)] hover:bg-[color:var(--status-info)] uppercase font-bold tracking-wider text-[10px]">Medium</Badge>;
      case 'low': return <Badge variant="neutral" className="uppercase font-bold tracking-wider text-[10px]">Low</Badge>;
      default: return <Badge variant="outline" className="uppercase font-bold tracking-wider text-[10px]">Unassessed</Badge>;
    }
  };

  // Block 1: Overview KPIs
  const renderOverviewKPIs = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      <Card className="hover:border-primary/50 transition-colors cursor-pointer shadow-sm" onClick={() => onDrilldown({ title: 'Total Assessed Leads', description: 'All leads that have been assessed by the confidentiality engine.', confidentiality_filter: 'all' })}>
        <CardContent className="p-4 flex flex-col gap-1">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Assessed</div>
          <div className="text-2xl font-bold font-mono">{overview.total_assessed}</div>
        </CardContent>
      </Card>
      
      <Card className="hover:border-[color:var(--status-danger)]/50 transition-colors cursor-pointer shadow-sm border-l-2 border-l-[color:var(--status-danger)]" onClick={() => onDrilldown({ title: 'Restricted Leads', description: 'Leads with highly sensitive restricted data.', confidentiality_level: 'restricted' })}>
        <CardContent className="p-4 flex flex-col gap-1">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Lock className="h-3 w-3 text-[color:var(--status-danger)]" /> Restricted
          </div>
          <div className="text-2xl font-bold font-mono">{overview.restricted}</div>
        </CardContent>
      </Card>
      
      <Card className="hover:border-[color:var(--status-warning)]/50 transition-colors cursor-pointer shadow-sm border-l-2 border-l-[color:var(--status-warning)]" onClick={() => onDrilldown({ title: 'High Exposure Leads', description: 'Leads with high confidentiality level.', confidentiality_level: 'high' })}>
        <CardContent className="p-4 flex flex-col gap-1">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-[color:var(--status-warning)]" /> High
          </div>
          <div className="text-2xl font-bold font-mono">{overview.high}</div>
        </CardContent>
      </Card>
      
      <Card className="hover:border-[color:var(--status-info)]/50 transition-colors cursor-pointer shadow-sm" onClick={() => onDrilldown({ title: 'Medium Exposure Leads', description: 'Leads with medium confidentiality level.', confidentiality_level: 'medium' })}>
        <CardContent className="p-4 flex flex-col gap-1">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Medium</div>
          <div className="text-2xl font-bold font-mono">{overview.medium}</div>
        </CardContent>
      </Card>

      <Card className="hover:border-primary/50 transition-colors cursor-pointer shadow-sm" onClick={() => onDrilldown({ title: 'Unassessed Leads', description: 'Leads that have not been scored by the engine yet.', confidentiality_level: 'unassessed' })}>
        <CardContent className="p-4 flex flex-col gap-1">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <HelpCircle className="h-3 w-3" /> Unassessed
          </div>
          <div className="text-2xl font-bold font-mono">{overview.unassessed}</div>
        </CardContent>
      </Card>
      
      <Card className="hover:border-[color:var(--status-danger)]/50 transition-colors cursor-pointer shadow-sm bg-[color:var(--status-danger)]/5" onClick={() => onDrilldown({ title: 'Needs Review', description: 'Leads with high or restricted levels that are pending review.', confidentiality_filter: 'needs_review' })}>
        <CardContent className="p-4 flex flex-col gap-1">
          <div className="text-xs font-medium text-[color:var(--status-danger)] uppercase tracking-wider flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> Risk Exposure
          </div>
          <div className="text-2xl font-bold font-mono text-[color:var(--status-danger)]">{overview.access_risk}</div>
        </CardContent>
      </Card>
    </div>
  );

  // Block 2: Distribution Chart
  const renderDistribution = () => {
    const series = distribution.map((d: any) => d.value);
    const labels = distribution.map((d: any) => d.name);
    
    const options: any = {
      chart: { type: 'donut' },
      labels: labels,
      colors: ['var(--muted)', 'var(--status-info)', 'var(--status-warning)', 'var(--status-danger)', 'var(--border)'],
      plotOptions: {
        pie: {
          donut: {
            size: '75%',
            labels: { show: true, total: { show: true, showAlways: true, label: 'Assessed' } }
          }
        }
      },
      legend: { position: 'bottom', fontSize: '11px' },
      dataLabels: { enabled: false },
      tooltip: { theme: 'dark' },
      events: {
        dataPointSelection: (event: any, chartContext: any, config: any) => {
          const label = config.w.config.labels[config.dataPointIndex];
          onDrilldown({
            title: `${label} Exposure Leads`,
            description: `Leads with ${label} confidentiality level.`,
            confidentiality_level: label.toLowerCase()
          });
        }
      }
    };

    return (
      <Card className="col-span-12 lg:col-span-4 shadow-sm">
        <CardHeader className="p-4 border-b bg-muted/10">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Shield className="h-4 w-4" /> Level Distribution
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 flex items-center justify-center h-[300px]">
          {series.reduce((a: number, b: number) => a + b, 0) > 0 ? (
            <ApexCharts options={options} series={series} type="donut" height="280" width="100%" />
          ) : (
            <div className="text-sm text-muted-foreground text-center">No distribution data</div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Block 7: Trend
  const renderTrend = () => {
    const options: any = {
      chart: { type: 'area', toolbar: { show: false }, sparkline: { enabled: false } },
      stroke: { curve: 'smooth', width: 2 },
      fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 90, 100] } },
      colors: ['var(--status-danger)'],
      xaxis: { categories: trend.map((t: any) => t.month), labels: { style: { fontSize: '10px' } } },
      yaxis: { labels: { style: { fontSize: '10px' } } },
      dataLabels: { enabled: false },
      tooltip: { theme: 'dark' },
      events: {
        dataPointSelection: (event: any, chartContext: any, config: any) => {
          const month = config.w.globals.categoryLabels[config.dataPointIndex];
          onDrilldown({
            title: `High/Restricted Leads in ${month}`,
            description: `Leads assigned high or restricted levels during ${month}.`,
            confidentiality_filter: 'needs_review',
            month: month
          });
        }
      }
    };

    const series = [{ name: 'High/Restricted Leads', data: trend.map((t: any) => t.high_restricted) }];

    return (
      <Card className="col-span-12 lg:col-span-8 shadow-sm">
        <CardHeader className="p-4 border-b bg-muted/10 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4" /> Sensitive Leads Trend
            </CardTitle>
            <CardDescription className="text-xs mt-1">High & Restricted assignments over last 6 months</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-4 h-[300px]">
          {trend.length > 0 ? (
            <ApexCharts options={options} series={series} type="area" height="100%" width="100%" />
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Not enough history</div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Block 3: Matrix Table
  const renderMatrixTable = () => (
    <Card className="col-span-12 shadow-sm">
      <CardHeader className="p-4 border-b bg-muted/10 flex flex-row justify-between items-center">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <FileText className="h-4 w-4" /> Latest Assessments Matrix
        </CardTitle>
        <Button variant="outline" size="sm" onClick={() => onDrilldown({ title: 'Assessments Matrix', description: 'Full view of all assessed leads.', confidentiality_filter: 'all' })}>View Full Matrix</Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/30 text-muted-foreground text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 font-medium">Lead / Company</th>
                <th className="px-4 py-3 font-medium">Stage</th>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 font-medium text-center">Access Role Scope</th>
                <th className="px-4 py-3 font-medium">Level</th>
                <th className="px-4 py-3 font-medium text-center">Score</th>
                <th className="px-4 py-3 font-medium">Main Driver</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {matrix.length > 0 ? matrix.map((row: any) => (
                <tr key={row.id} className="hover:bg-muted/10 transition-colors">
                  <td className="px-4 py-3 font-medium">{row.company_name}</td>
                  <td className="px-4 py-3 text-xs">{row.stage}</td>
                  <td className="px-4 py-3 text-xs">{row.owner}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant="outline" className="font-mono">{row.role_users}</Badge>
                  </td>
                  <td className="px-4 py-3">{renderLevelBadge(row.level)}</td>
                  <td className="px-4 py-3 text-center font-mono font-bold text-xs">{row.score}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[200px]" title={row.main_reason}>
                    {row.main_reason}
                  </td>
                  <td className="px-4 py-3">
                    {row.status === 'approved' ? (
                      <span className="flex items-center text-xs text-[color:var(--status-success)]"><CheckCircle2 className="h-3 w-3 mr-1"/> Approved</span>
                    ) : (
                      <span className="flex items-center text-xs text-[color:var(--status-warning)]"><HelpCircle className="h-3 w-3 mr-1"/> Draft</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => window.location.href = `/leads/${row.lead_id}?tab=intelligence`}>
                      Why this score? <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground text-sm">No assessments performed yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );

  // Block 6 & 8: Indicators and Risks
  const renderBottomRow = () => (
    <div className="col-span-12 grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="shadow-sm">
        <CardHeader className="p-4 border-b bg-muted/10">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <UserCheck className="h-4 w-4" /> Sensitive Data Triggers
          </CardTitle>
          <CardDescription className="text-xs">Database dimensions holding sensitive information</CardDescription>
        </CardHeader>
        <CardContent className="p-4 flex flex-col gap-3">
          <div className="flex justify-between items-center p-2 rounded bg-muted/20 border border-border/50 hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => onDrilldown({ title: 'BANTC Qualified Leads', description: 'Leads with BANTC qualification assessments.', confidentiality_filter: 'has_bantc' })}>
            <span className="text-sm font-medium">BANTC Qualification Exists</span>
            <span className="font-mono text-sm font-bold">{indicators.has_bantc}</span>
          </div>
          <div className="flex justify-between items-center p-2 rounded bg-muted/20 border border-border/50 hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => onDrilldown({ title: 'Leads with Transcripts', description: 'Leads containing meeting transcripts.', confidentiality_filter: 'has_transcript' })}>
            <span className="text-sm font-medium">Meeting Transcripts Stored</span>
            <span className="font-mono text-sm font-bold">{indicators.has_transcript}</span>
          </div>
          <div className="flex justify-between items-center p-2 rounded bg-muted/20 border border-border/50 hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => onDrilldown({ title: 'Leads with Financials', description: 'Leads with pricing and financial data.', confidentiality_filter: 'has_pricing' })}>
            <span className="text-sm font-medium">Revenue/Pricing Available</span>
            <span className="font-mono text-sm font-bold">{indicators.has_pricing}</span>
          </div>
          <div className="flex justify-between items-center p-2 rounded bg-muted/20 border border-border/50 hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => onDrilldown({ title: 'Leads with Sales Orders', description: 'Leads that have generated sales orders.', confidentiality_filter: 'has_sales_orders' })}>
            <span className="text-sm font-medium">Sales Orders Confirmed</span>
            <span className="font-mono text-sm font-bold">{indicators.has_sales_orders}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-[color:var(--status-danger)]/30">
        <CardHeader className="p-4 border-b bg-[color:var(--status-danger)]/5 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold text-[color:var(--status-danger)] flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" /> Risk Center
            </CardTitle>
            <CardDescription className="text-xs">Actionable alerts for exposed sensitive data</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[250px] overflow-y-auto">
            {risks.length > 0 ? risks.map((risk: any) => (
              <div key={risk.id} className="p-4 border-b border-border/50 last:border-0 hover:bg-muted/10 transition-colors">
                <div className="flex items-start justify-between mb-1">
                  <div className="font-medium text-sm text-[color:var(--status-danger)]">{risk.title}</div>
                  <Badge variant="outline" className="text-[10px] uppercase">{risk.status}</Badge>
                </div>
                <div className="text-sm font-semibold mb-1">{risk.lead}</div>
                <div className="text-xs text-muted-foreground mb-3">{risk.reason}</div>
                <Button variant="secondary" size="sm" className="h-7 text-xs w-full" onClick={() => window.location.href = `/leads/${risk.lead_id}?tab=intelligence`}>
                  {risk.action}
                </Button>
              </div>
            )) : (
              <div className="p-8 text-center flex flex-col items-center justify-center text-muted-foreground">
                <ShieldCheck className="h-8 w-8 mb-2 text-[color:var(--status-success)] opacity-50" />
                <span className="text-sm">No critical confidentiality risks detected.</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="w-full space-y-6">
      {renderOverviewKPIs()}
      <div className="grid grid-cols-12 gap-6">
        {renderDistribution()}
        {renderTrend()}
        {renderMatrixTable()}
        {renderBottomRow()}
      </div>
    </div>
  );
};

export default ConfidentialityDashboard;
