'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiFetch';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, AlertTriangle, CheckCircle2, Clock, Filter, 
  Sparkles, RefreshCw, Layers, TrendingUp, ShieldAlert, UserCheck 
} from 'lucide-react';

interface WeeklyAllocation {
  week_number: number;
  label: string;
  allocated_md: number;
  max_md: number;
  utilization_pct: number;
  status: 'bench' | 'optimal' | 'near_capacity' | 'overallocated';
  projects: string[];
}

interface ResourceItem {
  user_id: number;
  name: string;
  email: string;
  role: string;
  skills: string[];
  avg_utilization_pct: number;
  status: 'bench' | 'optimal' | 'overallocated';
  weekly_allocations: WeeklyAllocation[];
}

export function ResourceCapacityGantt() {
  const [weeksAhead, setWeeksAhead] = useState(6);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['psa-resource-matrix', weeksAhead],
    queryFn: async () => {
      const res = await apiFetch(`/api/professional-services/psa-dashboard/resource-matrix?weeks=${weeksAhead}`);
      return res.json();
    },
  });

  const summary = data?.summary || {
    total_resources: 0,
    team_avg_utilization_pct: 0,
    overallocated_count: 0,
    bench_count: 0,
    total_capacity_mandays: 0,
    total_allocated_mandays: 0,
  };

  const weeks: Array<{ week_number: number; label: string; start_date: string; end_date: string }> = data?.weeks || [];
  const resources: ResourceItem[] = data?.resources || [];

  const roles = Array.from(new Set(resources.map((r) => r.role)));

  const filteredResources = resources.filter((r) => {
    if (selectedRoleFilter === 'all') return true;
    return r.role === selectedRoleFilter;
  });

  const getCellColor = (status: string, pct: number) => {
    if (status === 'overallocated') {
      return 'bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 font-bold';
    }
    if (status === 'near_capacity') {
      return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-semibold';
    }
    if (status === 'optimal') {
      return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30';
    }
    return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20'; // bench
  };

  return (
    <div className="space-y-6">
      {/* Top Capacity Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              TOTAL RESOURCES
            </CardTitle>
            <Users className="w-4 h-4 text-brand" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{summary.total_resources} Staf</div>
            <p className="text-xs text-muted-foreground mt-1">
              Presales, Architects &amp; Delivery Engineers
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              AVG TEAM UTILIZATION
            </CardTitle>
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{summary.team_avg_utilization_pct}%</div>
            <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden mt-2">
              <div 
                className={`h-full rounded-full transition-all ${
                  summary.team_avg_utilization_pct > 85 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, summary.team_avg_utilization_pct)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className={`border ${summary.overallocated_count > 0 ? 'border-red-500/40 bg-red-500/5' : 'border-border'}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              OVERALLOCATED ALERT
            </CardTitle>
            <ShieldAlert className={`w-4 h-4 ${summary.overallocated_count > 0 ? 'text-red-500 animate-pulse' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.overallocated_count > 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>
              {summary.overallocated_count} Orang
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.overallocated_count > 0 ? 'Beban kerja > 100% (risiko burnout)' : 'Semua kapasitas dalam batas aman'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              BENCH CAPACITY (IDLE)
            </CardTitle>
            <UserCheck className="w-4 h-4 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{summary.bench_count} Orang</div>
            <p className="text-xs text-muted-foreground mt-1">
              Tersedia untuk proyek presales &amp; deal baru
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card border border-border p-3.5 rounded-xl">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">Filter Role:</span>
          <select
            value={selectedRoleFilter}
            onChange={(e) => setSelectedRoleFilter(e.target.value)}
            className="text-xs rounded-lg border border-border bg-background px-2.5 py-1.5 text-foreground focus:outline-hidden focus:ring-1 focus:ring-brand"
          >
            <option value="all">Semua Role Presales &amp; Delivery</option>
            {roles.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-full bg-cyan-500/70 inline-block" /> Bench (&lt;50%)
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70 inline-block ml-2" /> Optimal (50-80%)
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500/70 inline-block ml-2" /> Near Cap (80-100%)
            <span className="h-2.5 w-2.5 rounded-full bg-red-500/70 inline-block ml-2" /> Overallocated (&gt;100%)
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-8 text-xs gap-1"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Heatmap Gantt Matrix Table */}
      <Card className="border-border overflow-hidden">
        <CardHeader className="border-b border-border bg-muted/20 py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Layers className="h-4 w-4 text-brand" />
              Resource Allocation Heatmap ({weeksAhead} Minggu ke Depan)
            </CardTitle>
            <span className="text-xs text-muted-foreground">Kapasitas Maksimal per Staf: 5.0 MD / Minggu</span>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-brand" />
              Menghitung matriks kapasitas dan utilisasi staf...
            </div>
          ) : (
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground">
                  <th className="p-3 font-semibold min-w-[220px]">KONSULTAN / ARSITEK</th>
                  <th className="p-3 font-semibold min-w-[130px]">ROLE</th>
                  <th className="p-3 font-semibold text-center w-24">AVG UTIL</th>
                  {weeks.map((w) => (
                    <th key={w.week_number} className="p-3 font-semibold text-center min-w-[110px]">
                      <div>{w.label}</div>
                      <div className="text-[10px] font-normal text-muted-foreground/80">{w.start_date.slice(5)}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredResources.map((res) => (
                  <tr key={res.user_id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3">
                      <div className="font-semibold text-foreground text-xs">{res.name}</div>
                      <div className="text-[10px] text-muted-foreground">{res.email}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {res.skills.slice(0, 2).map((sk, sIdx) => (
                          <span key={sIdx} className="text-[9px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground border border-border">
                            {sk}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="p-3 text-muted-foreground">
                      <span className="font-medium text-foreground">{res.role}</span>
                    </td>

                    <td className="p-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        res.avg_utilization_pct > 100
                          ? 'bg-red-500/20 text-red-600 dark:text-red-400'
                          : res.avg_utilization_pct < 50
                          ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400'
                          : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {res.avg_utilization_pct}%
                      </span>
                    </td>

                    {res.weekly_allocations.map((alloc) => (
                      <td key={alloc.week_number} className="p-2 text-center">
                        <div
                          className={`rounded-lg p-2 text-center transition-all ${getCellColor(alloc.status, alloc.utilization_pct)}`}
                          title={`Proyek: ${alloc.projects.join(', ') || 'N/A'}`}
                        >
                          <div className="text-xs font-bold tabular-nums">
                            {alloc.allocated_md} <span className="text-[9px] font-normal">MD</span>
                          </div>
                          <div className="text-[10px] opacity-80">{alloc.utilization_pct}%</div>
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
