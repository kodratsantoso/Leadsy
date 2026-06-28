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
import { Modal } from "@/components/ui/modal";
import { ProgressiveFluxLoader } from "@/components/ui/progressive-flux-loader";
import dynamic from 'next/dynamic';
const ApexCharts = dynamic(() => import('react-apexcharts'), { ssr: false });

interface ConfidentialityDashboardProps {
  onDrilldown: (params: any) => void;
}

export const ConfidentialityDashboard: React.FC<ConfidentialityDashboardProps> = ({ onDrilldown }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [assessmentDetails, setAssessmentDetails] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [hintModal, setHintModal] = useState<{ title: string; description: string; attention: string; action: string } | null>(null);

  const safeJsonArray = (val: any) => Array.isArray(val) ? val : [];

  const handleOpenWhyScore = async (leadId: number) => {
    setSelectedLeadId(leadId);
    setAssessmentDetails(null);
    setShowDetailsModal(true);
    setDetailsLoading(true);
    try {
      const response = await apiFetch(`/confidentiality/assessments/lead/${leadId}`);
      if (response.ok) {
        setAssessmentDetails(await response.json());
      } else {
        console.error("Failed to fetch assessment details");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDetailsLoading(false);
    }
  };

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
    <div className="mb-6 relative">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Overview KPIs</h3>
        <Button variant="ghost" size="icon-sm" className="h-6 w-6" onClick={() => setHintModal({title: 'Overview KPIs', description: 'Ringkasan distribusi level konfidensialitas seluruh leads yang ada di database.', attention: 'Perhatikan jumlah Restricted dan High exposure.', action: 'Segera lakukan asesmen untuk Unassessed dan review untuk Risk Exposure.'})}>
          <HelpCircle className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
    </div>
  );

  // Block 2: Distribution Chart
  const renderDistribution = () => {
    const series = distribution.map((d: any) => d.value);
    const labels = distribution.map((d: any) => d.name);
    
    const options: any = {
      chart: { 
        type: 'donut',
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
      },
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
    };

    return (
      <Card className="col-span-12 lg:col-span-4 shadow-sm">
        <CardHeader className="p-4 border-b bg-muted/10 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Shield className="h-4 w-4" /> Level Distribution
          </CardTitle>
          <Button variant="ghost" size="icon-sm" className="h-6 w-6" onClick={() => setHintModal({title: 'Level Distribution', description: 'Persentase sebaran tingkat konfidensialitas leads yang sudah diasesmen.', attention: 'Perhatikan jika porsi warna merah (Restricted) dan kuning (High) mendominasi.', action: 'Gunakan filter drilldown dengan mengklik potongan pie chart untuk melihat rincian leads.'})}>
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </Button>
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
          <Button variant="ghost" size="icon-sm" className="h-6 w-6" onClick={() => setHintModal({title: 'Sensitive Leads Trend', description: 'Grafik penambahan leads dengan tingkat konfidensialitas High dan Restricted selama 6 bulan terakhir.', attention: 'Perhatikan lonjakan mendadak pada bulan tertentu.', action: 'Klik titik pada grafik untuk menelusuri leads mana saja yang menjadi pemicu lonjakan tersebut.'})}>
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </Button>
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
        <div className="flex items-center gap-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4" /> Latest Assessments Matrix
          </CardTitle>
          <Button variant="ghost" size="icon-sm" className="h-6 w-6" onClick={() => setHintModal({title: 'Assessments Matrix', description: 'Tabel daftar asesmen konfidensialitas terbaru yang sudah diproses oleh AI.', attention: 'Perhatikan kolom Score dan Main Driver untuk mengetahui alasan penentuan level.', action: 'Klik tombol \"Why this score?\" untuk melihat rincian detail evaluasi AI.'})}>
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
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
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleOpenWhyScore(row.lead_id)}>
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
        <CardHeader className="p-4 border-b bg-muted/10 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <UserCheck className="h-4 w-4" /> Sensitive Data Triggers
            </CardTitle>
            <CardDescription className="text-xs">Database dimensions holding sensitive information</CardDescription>
          </div>
          <Button variant="ghost" size="icon-sm" className="h-6 w-6" onClick={() => setHintModal({title: 'Sensitive Data Triggers', description: 'Menghitung seberapa banyak data sensitif (BANTC, Transkrip Rapat, Harga, Order) yang terekam pada leads yang diasesmen.', attention: 'Angka yang tinggi menandakan banyak data yang harus dijaga kerahasiaannya.', action: 'Klik setiap baris untuk melihat leads yang mengandung data spesifik tersebut.'})}>
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </Button>
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
          <Button variant="ghost" size="icon-sm" className="h-6 w-6" onClick={() => setHintModal({title: 'Risk Center', description: 'Pusat peringatan untuk leads berisiko (status draft dengan level High/Restricted).', attention: 'Leads di sini belum diverifikasi secara final dan mungkin memiliki akses yang terlalu luas.', action: 'Klik tombol Action pada tiap peringatan untuk langsung melakukan review.'})}>
            <HelpCircle className="h-4 w-4 text-[color:var(--status-danger)]" />
          </Button>
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

  const renderDetailsModal = () => (
    <Modal
      open={showDetailsModal}
      onOpenChange={(val) => setShowDetailsModal(val)}
      title="Confidentiality Assessment"
      size="xl"
    >
      <div className="p-6">
        <p className="mb-4 text-sm text-muted-foreground">
          AI-powered risk scoring to determine data confidentiality level.
        </p>

        {detailsLoading ? (
          <div className="flex flex-col items-center justify-center py-10 gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
            <p className="text-sm text-muted-foreground animate-pulse">Loading assessment details...</p>
          </div>
        ) : !assessmentDetails ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Shield className="mb-2 h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No confidentiality assessment found.</p>
          </div>
        ) : (
          <div className="space-y-4 text-sm">
            <div className="flex items-start justify-between">
              <div className="flex items-end gap-3">
                <p className="text-4xl font-bold">{assessmentDetails.score}</p>
                <p className="pb-1 text-sm text-muted-foreground">Risk Score (out of 100)</p>
              </div>
              {renderLevelBadge(assessmentDetails.confidentiality_level)}
            </div>
            
            <ProgressiveFluxLoader layout="feature"
              value={assessmentDetails.score}
              showLabel={false}
              barClassName="h-2"
              gradient={assessmentDetails.score > 60 ? 'var(--status-danger)' : assessmentDetails.score > 30 ? 'var(--status-warning)' : 'var(--status-success)'}
            />
            
            <div className="mt-4 space-y-3">
              {safeJsonArray(assessmentDetails.score_breakdown).length > 0 && (
                <div>
                  <h4 className="mb-2 font-medium text-xs uppercase tracking-wider text-muted-foreground">Score Breakdown</h4>
                  <ul className="space-y-2">
                    {safeJsonArray(assessmentDetails.score_breakdown).map((item: any, i: number) => (
                      <li key={i} className="flex flex-wrap justify-between items-center gap-2 rounded bg-muted/20 p-2">
                        <div>
                          <span className="font-medium text-xs block">{item.parameter}</span>
                          <span className="text-xs text-muted-foreground">Found: {item.detected_value}</span>
                        </div>
                        <Badge variant="outline">+{item.score_impact}</Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {safeJsonArray(assessmentDetails.recommended_handling).length > 0 && (
                <div>
                  <h4 className="mb-2 font-medium text-xs uppercase tracking-wider text-muted-foreground">Recommendations</h4>
                  <ul className="space-y-1">
                    {safeJsonArray(assessmentDetails.recommended_handling).map((rec: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-muted-foreground">
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--brand)]" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {safeJsonArray(assessmentDetails.missing_data).length > 0 && (
                <div className="rounded-lg border border-[var(--status-warning)]/20 bg-[var(--status-warning)]/10 p-3">
                  <h4 className="mb-2 font-medium text-xs uppercase tracking-wider text-[var(--status-warning)]">Missing Data For Assessment</h4>
                  <div className="flex flex-wrap gap-2">
                    {safeJsonArray(assessmentDetails.missing_data).map((item: string, i: number) => (
                      <Badge key={i} variant="outline" className="border-[var(--status-warning)]/30 text-[var(--status-warning)] bg-transparent">{item}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Last assessed: {new Date(assessmentDetails.last_assessed || assessmentDetails.updated_at || Date.now()).toLocaleString()}
              </p>
              <Button size="sm" onClick={() => window.location.href = `/leads/${selectedLeadId}?tab=intelligence`}>
                Go to Leads <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );

  const renderHintModal = () => (
    <Modal
      open={Boolean(hintModal)}
      onOpenChange={(val) => { if (!val) setHintModal(null); }}
      title={hintModal?.title || "Hint"}
    >
      <div className="p-6 space-y-5">
        <div>
          <h4 className="text-sm font-semibold flex items-center gap-2 mb-1.5 text-[var(--brand)]">
            <HelpCircle className="h-4 w-4" /> Maksud Data
          </h4>
          <p className="text-sm text-muted-foreground leading-relaxed">{hintModal?.description}</p>
        </div>
        <div className="p-4 rounded-xl border border-[var(--status-warning)]/20 bg-[var(--status-warning)]/5">
          <h4 className="text-sm font-semibold flex items-center gap-2 mb-1.5 text-[var(--status-warning)]">
            <AlertTriangle className="h-4 w-4" /> Perhatian
          </h4>
          <p className="text-sm text-muted-foreground leading-relaxed">{hintModal?.attention}</p>
        </div>
        <div className="p-4 rounded-xl border border-[var(--status-success)]/20 bg-[var(--status-success)]/5">
          <h4 className="text-sm font-semibold flex items-center gap-2 mb-1.5 text-[var(--status-success)]">
            <CheckCircle2 className="h-4 w-4" /> Action
          </h4>
          <p className="text-sm text-muted-foreground leading-relaxed">{hintModal?.action}</p>
        </div>
      </div>
    </Modal>
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
      {renderDetailsModal()}
      {renderHintModal()}
    </div>
  );
};

export default ConfidentialityDashboard;
