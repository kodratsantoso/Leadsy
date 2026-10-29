"use client";

import { useState, useEffect } from "react";
import { getPsaSettings, updatePsaSettings, PsPsaSetting } from "@/lib/api/professional-services";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { BackToSettings } from "@/app/settings/_components/back-to-settings";
import { Loader2, Save } from "lucide-react";

export default function PsaSettingsPage() {
  const [settings, setSettings] = useState<PsPsaSetting | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getPsaSettings().then(setSettings);
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const updated = await updatePsaSettings(settings);
      setSettings(updated);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (!settings) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 w-full">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            <BackToSettings />
            <CardTitle>PSA Delivery Governance & Thresholds</CardTitle>
            <CardDescription>
              Configure work log conversion rules, approval gates, BAST prerequisites, and risk triggers.
            </CardDescription>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">General Work Logs</CardTitle>
            <CardDescription>Hours to ManDays conversion and timesheet policies</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <div className="text-sm font-medium text-foreground">Hours per ManDay</div>
                <div className="text-xs text-muted-foreground">Standard conversion ratio for project delivery work logs</div>
              </div>
              <Input
                type="number"
                value={settings.hours_per_manday}
                onChange={(e) => setSettings({ ...settings, hours_per_manday: Number(e.target.value) })}
                className="w-24 text-right"
              />
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                id="req_approval"
                checked={settings.require_work_log_approval}
                onChange={(e) => setSettings({ ...settings, require_work_log_approval: e.target.checked })}
                className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
              />
              <span className="text-sm font-medium text-foreground">Require Approval for Work Logs</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                id="allow_unassigned"
                checked={settings.allow_timesheet_on_unassigned_task}
                onChange={(e) => setSettings({ ...settings, allow_timesheet_on_unassigned_task: e.target.checked })}
                className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
              />
              <span className="text-sm font-medium text-foreground">Allow Work Logs on Unassigned Tasks</span>
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Project Governance & BAST</CardTitle>
            <CardDescription>Handover and client sign-off prerequisites</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                id="req_bast"
                checked={settings.require_bast_before_project_close}
                onChange={(e) => setSettings({ ...settings, require_bast_before_project_close: e.target.checked })}
                className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
              />
              <span className="text-sm font-medium text-foreground">Require Signed BAST before Closing Project</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                id="req_uat"
                checked={settings.require_uat_signoff_before_bast}
                onChange={(e) => setSettings({ ...settings, require_uat_signoff_before_bast: e.target.checked })}
                className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
              />
              <span className="text-sm font-medium text-foreground">Require UAT Sign-off before BAST Generation</span>
            </label>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Risk Thresholds (Actual vs Estimated ManDays)</CardTitle>
          <CardDescription>Automated risk level classification triggers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Watch Threshold (%)</label>
              <Input
                type="number"
                value={settings.actual_md_watch_threshold_percentage}
                onChange={(e) => setSettings({ ...settings, actual_md_watch_threshold_percentage: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">At Risk Threshold (%)</label>
              <Input
                type="number"
                value={settings.actual_md_at_risk_threshold_percentage}
                onChange={(e) => setSettings({ ...settings, actual_md_at_risk_threshold_percentage: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Overrun Threshold (%)</label>
              <Input
                type="number"
                value={settings.actual_md_overrun_threshold_percentage}
                onChange={(e) => setSettings({ ...settings, actual_md_overrun_threshold_percentage: Number(e.target.value) })}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
