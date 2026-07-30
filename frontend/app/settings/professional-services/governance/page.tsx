"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PsGovernanceRule, getGovernanceRules, storeGovernanceRule, updateGovernanceRule } from "@/lib/api/professional-services";

export default function GovernanceSettingsPage() {
  const router = useRouter();
  const [rules, setRules] = useState<PsGovernanceRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      const data = await getGovernanceRules();
      setRules(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (rule: PsGovernanceRule) => {
    try {
      await updateGovernanceRule(rule.id, { is_active: !rule.is_active });
      loadRules();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex h-full flex-col p-6 space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={() => router.back()}><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Governance Rules</h1>
          <p className="text-muted-foreground">Manage approval blockers and thresholds for Professional Services</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Active Rules</CardTitle>
              <CardDescription>Rules that trigger blockers during estimation approval</CardDescription>
            </div>
            <Button size="sm"><Plus className="w-4 h-4 mr-2" /> New Rule</Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading rules...</div>
          ) : rules.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-md">
              No governance rules configured.
            </div>
          ) : (
            <div className="space-y-4">
              {rules.map((rule) => (
                <div key={rule.id} className="flex items-center justify-between p-4 border rounded-md">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-full ${rule.is_active ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-medium">{rule.rule_name}</h4>
                      <p className="text-xs text-muted-foreground">
                        Type: {rule.rule_type.replace(/_/g, ' ')} 
                        {rule.threshold_value && ` | Threshold: ${rule.threshold_value}`}
                        {rule.serviceCategory && ` | Category: ${rule.serviceCategory.name}`}
                      </p>
                    </div>
                  </div>
                  <input 
                    type="checkbox"
                    className="w-4 h-4"
                    checked={rule.is_active} 
                    onChange={() => handleToggle(rule)}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
