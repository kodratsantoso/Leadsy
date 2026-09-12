"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, HeartPulse, AlertTriangle, Bell, ArrowRight, Search, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  getHealthScores,
  getChurnRisks,
  getProactiveAlerts,
  CustomerHealthScore,
  ChurnRisk,
  ProactiveAlert,
  HealthStatus,
} from "@/lib/api/customer-success";

const HEALTH_STATUS_VARIANT: Record<HealthStatus, "success" | "brand" | "warning" | "danger"> = {
  thriving: "success",
  healthy: "brand",
  at_risk: "warning",
  critical: "danger",
};

const HEALTH_STATUS_LABEL: Record<HealthStatus, string> = {
  thriving: "Thriving",
  healthy: "Healthy",
  at_risk: "At Risk",
  critical: "Critical",
};

const RISK_VARIANT: Record<string, "warning" | "danger" | "neutral"> = {
  medium: "warning",
  high: "danger",
  critical: "danger",
  low: "neutral",
};

export function CustomerSuccessDashboard() {
  const [loading, setLoading] = useState(true);
  const [healthScores, setHealthScores] = useState<CustomerHealthScore[]>([]);
  const [churnRisks, setChurnRisks] = useState<ChurnRisk[]>([]);
  const [alerts, setAlerts] = useState<ProactiveAlert[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadAll = async () => {
    try {
      setLoading(true);
      setError(null);
      const [scores, risks, proactive] = await Promise.all([
        getHealthScores(),
        getChurnRisks(),
        getProactiveAlerts(),
      ]);
      setHealthScores(scores);
      setChurnRisks(risks);
      setAlerts(proactive);
    } catch (e) {
      console.error(e);
      setError("Failed to load Customer Success data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const filteredScores = healthScores.filter(s =>
    !search.trim() || (s.lead?.company_name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const summary = healthScores.reduce(
    (acc, s) => {
      acc[s.health_status] = (acc[s.health_status] ?? 0) + 1;
      return acc;
    },
    { thriving: 0, healthy: 0, at_risk: 0, critical: 0 } as Record<HealthStatus, number>
  );

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Summary tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(Object.keys(HEALTH_STATUS_LABEL) as HealthStatus[]).map(status => (
          <Card key={status}>
            <CardContent className="pt-5">
              <p className="text-sm text-muted-foreground">{HEALTH_STATUS_LABEL[status]}</p>
              <p className="text-3xl font-bold mt-1">{summary[status]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Health scores list */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><HeartPulse className="h-4 w-4 text-[color:var(--brand)]" /> Customer Health</CardTitle>
            <Button variant="outline" size="sm" onClick={loadAll}>
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
          </CardHeader>
          <CardContent>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search company..." className="pl-9" />
            </div>
            {filteredScores.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground border rounded-md border-dashed">
                No customer health scores yet.
              </div>
            ) : (
              <div className="border rounded-md divide-y">
                {filteredScores.map(s => (
                  <Link
                    key={s.id}
                    href={`/customer-success/${s.lead_id}`}
                    className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{s.lead?.company_name ?? `Lead #${s.lead_id}`}</p>
                      <p className="text-xs text-muted-foreground">Trend: {s.trend}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-mono font-semibold">{s.overall_score}</span>
                      <Badge variant={HEALTH_STATUS_VARIANT[s.health_status]}>{HEALTH_STATUS_LABEL[s.health_status]}</Badge>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Side column: churn risk + alerts */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-4 w-4 text-[var(--danger)]" /> Churn Risk</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {churnRisks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No churn risks detected.</p>
              ) : (
                churnRisks.slice(0, 8).map(r => (
                  <Link key={r.lead_id} href={`/customer-success/${r.lead_id}`} className="block p-2 rounded-md hover:bg-muted/30">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate">{r.company_name}</span>
                      <Badge variant={RISK_VARIANT[r.risk_level] ?? "neutral"}>{r.risk_level}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{r.primary_risk_factor}</p>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Bell className="h-4 w-4 text-[color:var(--brand)]" /> Proactive Alerts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {alerts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No alerts right now.</p>
              ) : (
                alerts.slice(0, 8).map((a, i) => (
                  <Link key={i} href={`/customer-success/${a.lead_id}`} className="block p-2 rounded-md hover:bg-muted/30">
                    <p className="text-sm font-medium truncate">{a.company_name}</p>
                    {a.type === "renewal_alert" ? (
                      <p className="text-xs text-muted-foreground mt-1">Renewal in {a.days_left} days</p>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-1">Detractor feedback ({a.survey_type}, score {a.score})</p>
                    )}
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
