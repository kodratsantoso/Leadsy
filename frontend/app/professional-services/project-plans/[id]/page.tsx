"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  getProjectPlan, 
  updateProjectPlanStatus, 
  PsProjectPlan 
} from "@/lib/api/professional-services";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { Table, TableBody, TableCell, TableHead, TableRow } from "@/components/ui/table";

import { 
  Loader2, ArrowLeft, Building2, Calendar, FileText, Users, 
  CheckCircle2, AlertTriangle, ShieldCheck, Flag, ShieldAlert,
  PlayCircle
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function ProjectPlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = { error: (m: string) => console.log(m), success: (m: string) => console.log(m) };
  const [plan, setPlan] = useState<PsProjectPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState('Overview');

  const loadPlan = async () => {
    try {
      const data = await getProjectPlan(Number(params.id));
      setPlan(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load project plan.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      loadPlan();
    }
  }, [params.id]);

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      await updateProjectPlanStatus(plan!.id, newStatus);
      toast.success(`Project moved to ${newStatus}`);
      await loadPlan();
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <h3 className="text-xl font-bold">Project Plan Not Found</h3>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/professional-services/project-plans")}>
          Go Back
        </Button>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Draft Plan": return "bg-gray-500/10 text-gray-500";
      case "Ready for Kickoff": return "bg-yellow-500/10 text-yellow-600";
      case "Active": return "bg-blue-500/10 text-blue-600";
      case "Completed": return "bg-green-500/10 text-green-600";
      default: return "bg-gray-500/10 text-gray-500";
    }
  };

  const readinessRequired = plan.readinessItems?.filter(i => i.is_required) || [];
  const readinessCompleted = readinessRequired.filter(i => i.is_completed).length;
  const isReadyForKickoffAllowed = readinessCompleted === readinessRequired.length;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/professional-services/project-plans")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{plan.project_name}</h1>
            <Badge variant="neutral" className={cn("rounded-md text-sm", getStatusColor(plan.project_status))}>
              {plan.project_status}
            </Badge>
          </div>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Building2 className="w-4 h-4" />
              {plan.lead?.company_name || plan.customer_name_snapshot || "No Customer Linked"}
            </div>
            <div className="flex items-center gap-1">
              <FileText className="w-4 h-4" />
              {plan.project_plan_number}
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              PM: {plan.projectManager?.name || "Unassigned"}
            </div>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {plan.project_status === "Draft Plan" && (
            <Button 
              onClick={() => handleStatusChange("Ready for Kickoff")}
              disabled={!isReadyForKickoffAllowed || isUpdating}
              className="gap-2"
            >
              <Flag className="w-4 h-4" />
              Mark Ready for Kickoff
            </Button>
          )}
          {plan.project_status === "Ready for Kickoff" && (
            <Button 
              onClick={() => handleStatusChange("Active")}
              disabled={isUpdating}
              className="gap-2"
            >
              <PlayCircle className="w-4 h-4" />
              Activate Project
            </Button>
          )}
        </div>
      </div>

      <div className="border-b border-border">
        <div className="flex gap-0 overflow-x-auto">
          {['Overview', 'Tasks & Timeline', 'Resources', 'Delivery Plans', 'Risks', 'Execution Summary', 'Work Logs', 'Change Requests', 'BAST'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'border-[var(--brand)] text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        {activeTab === 'Overview' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Project Context</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-muted-foreground">Source Estimation</span>
                      <p className="font-medium">
                        <Link href={`/professional-services/estimations/${plan.estimation_id}`} className="text-primary hover:underline">
                          {plan.estimation?.estimation_number || `ID: ${plan.estimation_id}`}
                        </Link>
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Total Estimated ManDays</span>
                      <p className="font-medium">{Number(plan.total_estimated_mandays).toFixed(2)} MD</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Project Start Date</span>
                      <p className="font-medium">{plan.project_start_date ? new Date(plan.project_start_date).toLocaleDateString() : "Not Set"}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Target Go-Live Date</span>
                      <p className="font-medium">{plan.target_go_live_date ? new Date(plan.target_go_live_date).toLocaleDateString() : "Not Set"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5" />
                    Readiness Checklist
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {plan.readinessItems?.map((item) => (
                      <div key={item.id} className="flex items-start space-x-3">
                        <input type="checkbox" className="h-4 w-4 rounded border-gray-300" checked={item.is_completed} disabled />
                        <div className="grid gap-1.5 leading-none">
                          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            {item.item_name}
                            {item.is_required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                  {!isReadyForKickoffAllowed && plan.project_status === "Draft Plan" && (
                    <div className="mt-4 p-3 bg-yellow-500/10 text-yellow-600 rounded-md text-sm flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                      Complete all required items to unlock Kickoff.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
        )}

        {activeTab === 'Tasks & Timeline' && (
            <Card>
              <CardHeader>
                <CardTitle>Delivery Tasks</CardTitle>
                <CardDescription>Generated from the approved scope breakdown.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <thead>
                    <TableRow>
                      <TableHead>Task Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Est. ManDays</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </thead>
                  <TableBody>
                    {plan.tasks?.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell>
                          <div className="font-medium">{task.task_name}</div>
                          {task.deliverable && <div className="text-xs text-muted-foreground mt-1">Del: {task.deliverable}</div>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{task.assigned_role_id ? `Role #${task.assigned_role_id}` : 'N/A'}</Badge>
                        </TableCell>
                        <TableCell>{Number(task.estimated_mandays).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant="neutral">{task.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
        )}

        {activeTab === 'Resources' && (
            <Card>
              <CardHeader>
                <CardTitle>Resource Plan</CardTitle>
                <CardDescription>Assign specific team members to the required delivery roles.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <thead>
                    <TableRow>
                      <TableHead>Required Role</TableHead>
                      <TableHead>Est. ManDays</TableHead>
                      <TableHead>Assigned User</TableHead>
                      <TableHead>Dates</TableHead>
                    </TableRow>
                  </thead>
                  <TableBody>
                    {plan.resources?.map((res) => (
                      <TableRow key={res.id}>
                        <TableCell className="font-medium">Role ID {res.role_id}</TableCell>
                        <TableCell>{Number(res.estimated_mandays).toFixed(2)}</TableCell>
                        <TableCell>
                          {res.assignedUser ? res.assignedUser.name : <span className="italic text-muted-foreground">Unassigned</span>}
                        </TableCell>
                        <TableCell>
                          <span className="text-muted-foreground text-sm">TBD</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
        )}

        {activeTab === 'Delivery Plans' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {plan.deliveryChecklists?.map((list) => (
                <Card key={list.id}>
                  <CardHeader>
                    <CardTitle className="capitalize">{list.checklist_type} Plan</CardTitle>
                    <CardDescription>Status: {list.status}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {list.checklist_items?.map((item, idx) => (
                        <div key={idx} className="flex items-start space-x-3">
                          <input type="checkbox" className="h-4 w-4 rounded border-gray-300" checked={item.completed} disabled />
                          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            {item.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
        )}

        {activeTab === 'Risks' && (
            <Card>
              <CardHeader>
                <CardTitle>Risk & Blocker Register</CardTitle>
              </CardHeader>
              <CardContent>
                {plan.risks?.length === 0 ? (
                  <p className="text-muted-foreground">No risks identified.</p>
                ) : (
                  <Table>
                    <thead>
                      <TableRow>
                        <TableHead>Risk</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Mitigation</TableHead>
                      </TableRow>
                    </thead>
                    <TableBody>
                      {plan.risks?.map((risk) => (
                        <TableRow key={risk.id}>
                          <TableCell>
                            <div className="font-medium">{risk.risk_title}</div>
                            <div className="text-xs text-muted-foreground">{risk.risk_description}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={risk.risk_level === 'High' || risk.risk_level === 'Critical' ? 'danger' : 'neutral'}>
                              {risk.risk_level}
                            </Badge>
                          </TableCell>
                          <TableCell>{risk.status}</TableCell>
                          <TableCell className="text-sm">{risk.mitigation_plan || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
        )}
      </div>
    </div>
  );
}
