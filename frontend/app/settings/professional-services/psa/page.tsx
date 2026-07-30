"use client";

import { useState, useEffect } from "react";
import { getPsaSettings, updatePsaSettings, PsPsaSetting } from "@/lib/api/professional-services";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

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

  if (!settings) return <div className="p-8">Loading PSA settings...</div>;

  return (
    <div className="p-8 max-w-4xl space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">PSA Lite Settings</h1>
        <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>General Work Logs</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <div className="font-medium">Hours per ManDay</div>
              <div className="text-sm text-gray-500">Standard conversion for work logs</div>
            </div>
            <Input type="number" value={settings.hours_per_manday} onChange={(e) => setSettings({ ...settings, hours_per_manday: Number(e.target.value) })} className="w-24" />
          </div>
          <div className="flex items-center space-x-2 pt-2">
            <input type="checkbox" id="req_approval" checked={settings.require_work_log_approval} onChange={(e) => setSettings({ ...settings, require_work_log_approval: e.target.checked })} />
            <label htmlFor="req_approval" className="font-medium">Require Approval for Work Logs</label>
          </div>
          <div className="flex items-center space-x-2">
            <input type="checkbox" id="allow_unassigned" checked={settings.allow_timesheet_on_unassigned_task} onChange={(e) => setSettings({ ...settings, allow_timesheet_on_unassigned_task: e.target.checked })} />
            <label htmlFor="allow_unassigned" className="font-medium">Allow Work Logs on Unassigned Tasks</label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Project Governance & BAST</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <input type="checkbox" id="req_bast" checked={settings.require_bast_before_project_close} onChange={(e) => setSettings({ ...settings, require_bast_before_project_close: e.target.checked })} />
            <label htmlFor="req_bast" className="font-medium">Require Signed BAST before Closing Project</label>
          </div>
          <div className="flex items-center space-x-2">
            <input type="checkbox" id="req_uat" checked={settings.require_uat_signoff_before_bast} onChange={(e) => setSettings({ ...settings, require_uat_signoff_before_bast: e.target.checked })} />
            <label htmlFor="req_uat" className="font-medium">Require UAT Sign-off before BAST Generation</label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Risk Thresholds (Actual vs Estimated ManDays)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Watch Threshold (%)</label>
              <Input type="number" value={settings.actual_md_watch_threshold_percentage} onChange={(e) => setSettings({ ...settings, actual_md_watch_threshold_percentage: Number(e.target.value) })} />
            </div>
            <div>
              <label className="text-sm font-medium">At Risk Threshold (%)</label>
              <Input type="number" value={settings.actual_md_at_risk_threshold_percentage} onChange={(e) => setSettings({ ...settings, actual_md_at_risk_threshold_percentage: Number(e.target.value) })} />
            </div>
            <div>
              <label className="text-sm font-medium">Overrun Threshold (%)</label>
              <Input type="number" value={settings.actual_md_overrun_threshold_percentage} onChange={(e) => setSettings({ ...settings, actual_md_overrun_threshold_percentage: Number(e.target.value) })} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
