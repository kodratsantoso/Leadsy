"use client";

import { useState, useEffect } from "react";
import { getPsaDashboard } from "@/lib/api/professional-services";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { 
  Briefcase, AlertTriangle, Clock, Target, 
  Layers, Users, Sparkles, ChevronRight, Activity 
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ResourceCapacityGantt } from "@/components/professional-services/ResourceCapacityGantt";
import { SkillMatchRecommender } from "@/components/professional-services/SkillMatchRecommender";

export default function PsaDashboardPage() {
  const [activeTab, setActiveTab] = useState<'metrics' | 'matrix' | 'skills'>('metrics');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPsaDashboard()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const metrics = data?.metrics || {
    active_projects: 0,
    overrun_projects: 0,
    total_actual_mandays: 0,
    total_estimated_mandays: 0,
    variance_percentage: 0,
    this_month_utilized_mandays: 0,
  };
  const recent_projects = data?.recent_projects || [];

  return (
    <div className="space-y-6 p-6 w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
              PSA Enterprise Governance
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand/10 text-brand font-semibold border border-brand/20">
              Capacity &amp; Resource Matrix
            </span>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Pantau utilitas presales &amp; arsitek, deteksi risiko over-allocation, dan alokasikan staf berdasarkan AI skill matching.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/professional-services/project-plans">
            <Button variant="outline" size="sm" className="h-9 text-xs">
              Semua Proyek Delivery
            </Button>
          </Link>
          <Link href="/professional-services/estimations/new">
            <Button size="sm" className="h-9 text-xs bg-brand text-white hover:bg-brand/90">
              Buat Estimasi PSA Baru
            </Button>
          </Link>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex rounded-xl bg-muted/60 p-1 text-xs font-medium w-full sm:w-fit border border-border">
        <button
          type="button"
          onClick={() => setActiveTab('metrics')}
          className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-2 ${
            activeTab === 'metrics'
              ? 'bg-card text-foreground shadow-xs font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Activity className="h-4 w-4 text-brand" />
          <span>Project Health &amp; Metrics</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('matrix')}
          className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-2 ${
            activeTab === 'matrix'
              ? 'bg-card text-foreground shadow-xs font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Layers className="h-4 w-4 text-blue-500" />
          <span>Resource Capacity Gantt Matrix</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('skills')}
          className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-2 ${
            activeTab === 'skills'
              ? 'bg-card text-foreground shadow-xs font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Sparkles className="h-4 w-4 text-purple-500" />
          <span>AI Skill Match Staff Recommender</span>
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'metrics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  ACTIVE PROJECTS
                </CardTitle>
                <Briefcase className="w-4 h-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{metrics.active_projects}</div>
                <p className="text-xs text-muted-foreground mt-1">Dalam tahapan delivery &amp; UAT</p>
              </CardContent>
            </Card>
            
            <Card className={`border ${metrics.overrun_projects > 0 ? 'border-red-500/40 bg-red-500/5' : 'border-border'}`}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  OVERRUN PROJECTS
                </CardTitle>
                <AlertTriangle className={`w-4 h-4 ${metrics.overrun_projects > 0 ? 'text-red-500 animate-pulse' : 'text-muted-foreground'}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${metrics.overrun_projects > 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>
                  {metrics.overrun_projects}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Melebihi estimasi Man-Days</p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  ACTUAL / ESTIMATED (MD)
                </CardTitle>
                <Target className="w-4 h-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {metrics.total_actual_mandays} / {metrics.total_estimated_mandays}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {metrics.variance_percentage}% Variance ({metrics.variance_percentage > 0 ? 'Defisit' : 'Efisiensi'})
                </p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  UTILIZED MD (BULAN INI)
                </CardTitle>
                <Clock className="w-4 h-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {metrics.this_month_utilized_mandays} MD
                </div>
                <p className="text-xs text-muted-foreground mt-1">Total jam kerja disetujui bulan berjalan</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border">
            <CardHeader className="border-b border-border bg-muted/20 py-3.5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold">Recent Active Projects Health</CardTitle>
                <span className="text-xs text-muted-foreground">Monitoring real-time burn-rate proyek</span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-muted-foreground">
                      <th className="p-3.5 font-semibold">PROJECT ID</th>
                      <th className="p-3.5 font-semibold">NAMA PROYEK</th>
                      <th className="p-3.5 font-semibold">STATUS</th>
                      <th className="p-3.5 font-semibold">OVERRUN RISK</th>
                      <th className="p-3.5 font-semibold text-right">BURN RATE</th>
                      <th className="p-3.5 font-semibold text-right">REMAINING MD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {recent_projects.map((proj: any) => (
                      <tr key={proj.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3.5">
                          <Link href={`/professional-services/project-plans/${proj.id}`} className="text-brand font-semibold hover:underline">
                            {proj.project_number}
                          </Link>
                        </td>
                        <td className="p-3.5 font-medium text-foreground">{proj.project_name}</td>
                        <td className="p-3.5 text-muted-foreground">{proj.project_status}</td>
                        <td className="p-3.5">
                          {proj.actual_summary ? (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              proj.actual_summary.overrun_status === 'Overrun' ? 'bg-red-500/10 text-red-600 border-red-500/20' :
                              proj.actual_summary.overrun_status === 'At Risk' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                              'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                            }`}>
                              {proj.actual_summary.overrun_status}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </td>
                        <td className="p-3.5 text-right font-medium">{proj.actual_summary ? `${proj.actual_summary.burn_rate}%` : '-'}</td>
                        <td className="p-3.5 text-right font-medium">{proj.actual_summary ? proj.actual_summary.remaining_mandays : '-'}</td>
                      </tr>
                    ))}
                    {recent_projects.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-muted-foreground">
                          Belum ada proyek aktif dalam sistem.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'matrix' && <ResourceCapacityGantt />}

      {activeTab === 'skills' && <SkillMatchRecommender />}
    </div>
  );
}
