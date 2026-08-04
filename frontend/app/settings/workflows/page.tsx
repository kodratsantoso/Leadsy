"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GitBranch, Plus, Loader2, Edit, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { BackToSettings } from "@/app/settings/_components/back-to-settings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/input";

import { apiFetch } from "@/lib/apiFetch";

const toast = { error: (m: string) => console.log(m), success: (m: string) => console.log(m) };

type WorkflowDefinition = {
  id: number;
  name: string;
  base_record_type: string;
  category: string;
  status: string;
  description: string;
  versions: any[];
  created_at: string;
  updated_at: string;
};

export default function WorkflowsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newWorkflow, setNewWorkflow] = useState({
    name: "",
    base_record_type: "LeadQuotation",
    category: "Approval",
    description: "",
  });

  const { data: workflowsData, isLoading } = useQuery({
    queryKey: ["workflows"],
    queryFn: async () => {
      const response = await apiFetch("/workflows");
      return response.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: typeof newWorkflow) => {
      const response = await apiFetch("/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error("Failed to create workflow");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      toast.success("Workflow created successfully");
      setIsCreateModalOpen(false);
      if (data.data?.id) {
        router.push(`/settings/workflows/${data.data.id}`);
      }
    },
    onError: () => {
      toast.error("Failed to create workflow");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiFetch(`/workflows/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      toast.success("Workflow deleted");
    },
    onError: () => {
      toast.error("Failed to delete workflow");
    },
  });

  const workflows: WorkflowDefinition[] = workflowsData?.data ?? [];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <BackToSettings />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Custom Workflows</h1>
          <p className="text-sm text-muted-foreground">
            Visual workflow builder for generic automated approvals and rules.
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Workflow
        </Button>
      </div>

      <Card>
        <CardHeader className="p-0">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Workflow Name</TableHeaderCell>
                <TableHeaderCell>Base Record</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell className="w-[100px]"></TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : workflows.length === 0 ? (
                <TableEmpty colSpan={4}>
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <GitBranch className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="font-medium text-foreground">No workflows found</p>
                    <p>Create a custom workflow to automate your business processes.</p>
                  </div>
                </TableEmpty>
              ) : (
                workflows.map((workflow) => (
                  <TableRow key={workflow.id}>
                    <TableCell>
                      <div className="font-medium">{workflow.name}</div>
                      {workflow.description && (
                        <div className="text-xs text-muted-foreground">{workflow.description}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-[color:var(--status-info)] text-white">{workflow.base_record_type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={workflow.status === 'active' ? 'bg-[color:var(--status-success)] text-white' : 'bg-[color:var(--status-neutral)] text-white'}>
                        {workflow.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => router.push(`/settings/workflows/${workflow.id}`)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => {
                        if (confirm('Are you sure you want to delete this workflow?')) {
                          deleteMutation.mutate(workflow.id);
                        }
                      }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardHeader>
      </Card>

      <Modal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        title="Create Workflow"
      >
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <Input
              value={newWorkflow.name}
              onChange={(e) => setNewWorkflow({ ...newWorkflow, name: e.target.value })}
              placeholder="e.g. High Value Quote Approval"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Base Record Type</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={newWorkflow.base_record_type}
              onChange={(e) => setNewWorkflow({ ...newWorkflow, base_record_type: e.target.value })}
            >
              <option value="LeadQuotation">Quotation / Estimate</option>
              <option value="SalesOrder">Sales Order</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={newWorkflow.description}
              onChange={(e) => setNewWorkflow({ ...newWorkflow, description: e.target.value })}
              placeholder="Brief description of when this workflow applies..."
            />
          </div>
          <div className="flex justify-end pt-4 space-x-2">
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate(newWorkflow)}
              disabled={createMutation.isPending || !newWorkflow.name}
            >
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create & Design
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
