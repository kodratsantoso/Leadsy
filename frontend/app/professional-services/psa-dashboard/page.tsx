"use client";

import { useState, useEffect } from "react";
import { getPsaDashboard } from "@/lib/api/professional-services";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Briefcase, AlertTriangle, Clock, Target } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PsaDashboardPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    getPsaDashboard().then(setData);
  }, []);

  if (!data) return <div className="p-8">Loading Dashboard...</div>;

  const { metrics, recent_projects } = data;

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">PSA Lite Dashboard</h1>
        <Link href="/professional-services/project-plans">
          <Button variant="outline">View All Projects</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <Briefcase className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.active_projects}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Overrun Projects</CardTitle>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{metrics.overrun_projects}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Actual / Estimated (MD)</CardTitle>
            <Target className="w-4 h-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total_actual_mandays} / {metrics.total_estimated_mandays}</div>
            <p className="text-xs text-gray-500">{metrics.variance_percentage}% Variance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Utilized MD (This Month)</CardTitle>
            <Clock className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.this_month_utilized_mandays} MD</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Active Projects Health</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b">
                <th className="pb-3 font-medium">Project ID</th>
                <th className="pb-3 font-medium">Name</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Overrun Status</th>
                <th className="pb-3 font-medium text-right">Burn Rate</th>
                <th className="pb-3 font-medium text-right">Remaining MD</th>
              </tr>
            </thead>
            <tbody>
              {recent_projects.map((proj: any) => (
                <tr key={proj.id} className="border-b last:border-0">
                  <td className="py-3">
                    <Link href={`/professional-services/project-plans/${proj.id}`} className="text-blue-600 hover:underline">
                      {proj.project_number}
                    </Link>
                  </td>
                  <td className="py-3">{proj.project_name}</td>
                  <td className="py-3">{proj.project_status}</td>
                  <td className="py-3">
                    {proj.actual_summary ? (
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        proj.actual_summary.overrun_status === 'Overrun' ? 'bg-red-100 text-red-700' :
                        proj.actual_summary.overrun_status === 'At Risk' ? 'bg-orange-100 text-orange-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {proj.actual_summary.overrun_status}
                      </span>
                    ) : 'N/A'}
                  </td>
                  <td className="py-3 text-right">{proj.actual_summary ? `${proj.actual_summary.burn_rate}%` : '-'}</td>
                  <td className="py-3 text-right">{proj.actual_summary ? proj.actual_summary.remaining_mandays : '-'}</td>
                </tr>
              ))}
              {recent_projects.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-gray-500">No active projects found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
