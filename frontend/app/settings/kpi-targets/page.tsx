"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Loader2, Save, Activity } from "lucide-react";
import { useNumberFormat } from "@/lib/hooks/use-number-format";

export default function KpiTargetsPage() {
  const queryClient = useQueryClient();
  const { formatNumber } = useNumberFormat();
  
  const [period, setPeriod] = useState("month");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [targets, setTargets] = useState<Record<string, string>>({});

  const { data: usersData, isLoading: loadingUsers } = useQuery({
    queryKey: ["users-hierarchy"],
    queryFn: async () => {
      const res = await apiFetch("/users");
      return res.json();
    }
  });

  const { data: definitionsData, isLoading: loadingDefs } = useQuery({
    queryKey: ["kpi-definitions"],
    queryFn: async () => {
      const res = await apiFetch("/kpi-settings/definitions");
      return res.json();
    }
  });

  const users = usersData?.data?.data || usersData?.data || [];
  const definitionsGrouped = definitionsData?.data || {};

  const { data: userTargetsData, isFetching: loadingTargets } = useQuery({
    queryKey: ["user-targets", selectedUserId, period],
    enabled: !!selectedUserId,
    queryFn: async () => {
      const res = await apiFetch(`/kpi-settings/targets/${selectedUserId}?period=${period}`);
      return res.json();
    }
  });

  useEffect(() => {
    if (userTargetsData?.data) {
      const newTargets: Record<string, string> = {};
      userTargetsData.data.forEach((t: any) => {
        newTargets[t.kpi_key] = t.target_value;
      });
      setTargets(newTargets);
    } else {
      setTargets({});
    }
  }, [userTargetsData, selectedUserId, period]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUserId) return;
      const payload = {
        period_type: period,
        targets: Object.entries(targets).map(([kpi_key, target_value]) => ({
          kpi_key,
          target_value: Number(target_value) || 0
        }))
      };
      const res = await apiFetch(`/kpi-settings/targets/${selectedUserId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Failed to save targets");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-targets"] });
    },
    onError: (err: any) => {
      console.error(err);
    }
  });

  const selectedUser = users.find((u: any) => String(u.id) === selectedUserId);
  const roleSlug = selectedUser?.role?.name || "";
  
  // Determine abstract category for the role to match definitions
  let category = "other";
  if (roleSlug.includes("presales") || roleSlug.includes("architect")) category = "presales";
  else if (roleSlug.includes("sales") || roleSlug.includes("exec") || roleSlug.includes("admin")) category = "sales";
  else if (roleSlug.includes("am") || roleSlug.includes("account")) category = "am";
  else if (roleSlug.includes("csm") || roleSlug.includes("customer")) category = "csm";

  const activeDefs = definitionsGrouped[category] || [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Role KPI Targets</h1>
        <p className="text-sm text-muted-foreground">Configure specific performance targets for individual team members.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <div className="md:col-span-1 space-y-4">
          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-sm">Select Context</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Period</label>
                <Select value={period} onChange={(e) => setPeriod(e.target.value)}>
                  <option value="week">Weekly</option>
                  <option value="biweekly">Biweekly</option>
                  <option value="month">Monthly</option>
                  <option value="quarter">Quarterly</option>
                  <option value="year">Annually</option>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Team Member</label>
                {loadingUsers ? (
                  <div className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin"/> Loading...</div>
                ) : (
                  <Select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}>
                    <option value="" disabled>Select Member</option>
                    {users.map((u: any) => (
                      <option key={u.id} value={String(u.id)}>
                        {u.name} ({u.role?.display_name})
                      </option>
                    ))}
                  </Select>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Target Configuration</CardTitle>
                  <CardDescription>
                    {selectedUser ? `Targets for ${selectedUser.name} (${selectedUser.role?.display_name})` : "Select a team member to configure"}
                  </CardDescription>
                </div>
                {selectedUser && (
                  <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || loadingTargets}>
                    {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Targets
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!selectedUser ? (
                <div className="py-12 text-center text-muted-foreground border-2 border-dashed border-border rounded-xl">
                  <Activity className="w-8 h-8 mx-auto mb-3 opacity-20" />
                  <p>Select a team member from the left panel.</p>
                </div>
              ) : loadingTargets || loadingDefs ? (
                <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
              ) : activeDefs.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground border-2 border-dashed border-border rounded-xl">
                  <p>No KPI definitions found for this role category ({category}).</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {activeDefs.map((def: any) => (
                    <div key={def.kpi_key} className="grid grid-cols-12 gap-4 items-center border-b border-border pb-4 last:border-0">
                      <div className="col-span-8">
                        <p className="font-semibold text-sm text-foreground">{def.kpi_name}</p>
                        <p className="text-xs text-muted-foreground">{def.description}</p>
                      </div>
                      <div className="col-span-4 flex items-center justify-end gap-2">
                        {def.format === 'currency' && <span className="text-xs text-muted-foreground font-mono">Rp</span>}
                        <Input
                          type="number"
                          className="w-32 text-right"
                          value={targets[def.kpi_key] ?? ""}
                          onChange={(e) => setTargets({ ...targets, [def.kpi_key]: e.target.value })}
                          placeholder="0"
                        />
                        {def.format === 'percentage' && <span className="text-xs text-muted-foreground">%</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
