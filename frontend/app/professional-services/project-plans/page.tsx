"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getProjectPlans, PsProjectPlan } from "@/lib/api/professional-services";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableRow } from "@/components/ui/table";
import { Loader2, Plus, ArrowRight, FolderKanban } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ProjectPlansListPage() {
  const [plans, setPlans] = useState<PsProjectPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const response = await getProjectPlans();
        // Pagination wrapper from laravel
        setPlans(response.data || []);
      } catch (err) {
        console.error("Failed to load project plans", err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Draft Plan": return "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20";
      case "Ready for Kickoff": return "bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20";
      case "Active": return "bg-blue-500/10 text-blue-600 hover:bg-blue-500/20";
      case "Completed": return "bg-green-500/10 text-green-600 hover:bg-green-500/20";
      case "On Hold": return "bg-orange-500/10 text-orange-600 hover:bg-orange-500/20";
      default: return "bg-gray-500/10 text-gray-500";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Project Plans</h1>
          <p className="text-muted-foreground mt-2">
            Manage Professional Services delivery plans, resources, and readiness checklists.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderKanban className="w-5 h-5" />
            Active Plans
          </CardTitle>
          <CardDescription>
            All delivery plans converted from approved estimations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : plans.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center border rounded-lg border-dashed">
              <FolderKanban className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">No project plans found</h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-2 mb-6">
                Project plans are created from approved Estimations. Go to an approved Estimation to generate its delivery plan.
              </p>
              <Link href="/professional-services/estimations">
                <Button variant="outline">
                  View Estimations
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <thead>
                <TableRow>
                  <TableHead>Plan Number</TableHead>
                  <TableHead>Project Name</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>PM</TableHead>
                  <TableHead>Est. ManDays</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </thead>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium">{plan.project_plan_number}</TableCell>
                    <TableCell>{plan.project_name}</TableCell>
                    <TableCell>
                      {plan.lead ? plan.lead.company_name : plan.customer_name_snapshot || "—"}
                    </TableCell>
                    <TableCell>
                      {plan.projectManager ? plan.projectManager.name : <span className="text-muted-foreground italic">Unassigned</span>}
                    </TableCell>
                    <TableCell>{Number(plan.total_estimated_mandays).toFixed(2)} MD</TableCell>
                    <TableCell>
                      <Badge variant="neutral" className={cn("rounded-md font-medium", getStatusColor(plan.project_status))}>
                        {plan.project_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/professional-services/project-plans/${plan.id}`}>
                        <Button variant="ghost" size="sm">
                          View Workspace
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
