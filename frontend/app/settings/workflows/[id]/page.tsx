"use client";

import { use, useCallback, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  ReactFlow, 
  Controls, 
  Background, 
  applyNodeChanges, 
  applyEdgeChanges,
  addEdge,
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  Connection,
  ReactFlowProvider,
  useReactFlow,
  Panel,
  MarkerType
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ArrowLeft, Save, Play, CheckCircle2, AlertCircle, GripHorizontal, Loader2, Plus, Trash2 } from "lucide-react";

import { apiFetch } from "@/lib/apiFetch";
import { Button } from "@/components/ui/button";

const toast = { error: (m: string) => console.log(m), success: (m: string) => console.log(m) };
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";

type WorkflowAction = {
  id: number;
  action_type: string;
  execution_timing: string;
  configuration: any;
};

type WorkflowState = {
  id: number;
  name: string;
  type: string;
  visual_coordinates: { x: number; y: number };
};

type WorkflowTransition = {
  id: number;
  source_state_id: number;
  destination_state_id: number;
  label: string;
  trigger: string;
};

// ----------------------------------------------------------------------
// Custom Node Component to look nice
// ----------------------------------------------------------------------
const CustomNode = ({ data, selected }: any) => {
  return (
    <div className={`px-4 py-2 shadow-md rounded-md bg-white border-2 min-w-[150px] ${selected ? 'border-primary' : 'border-border'}`}>
      <div className="flex items-center space-x-2">
        <GripHorizontal className="w-4 h-4 text-muted-foreground cursor-grab" />
        <div className="text-sm font-bold">{data.label}</div>
      </div>
      <div className="text-xs text-muted-foreground mt-1 uppercase">{data.type}</div>
    </div>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

// ----------------------------------------------------------------------
// Builder Component (Wrapped in ReactFlowProvider)
// ----------------------------------------------------------------------
function WorkflowBuilder({ id }: { id: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { screenToFlowPosition } = useReactFlow();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);

  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [newAction, setNewAction] = useState({
    action_type: 'SEND_EMAIL',
    execution_timing: 'AFTER',
  });

  // Fetch workflow
  const { data: workflowData, isLoading } = useQuery({
    queryKey: ["workflow", id],
    queryFn: async () => {
      const response = await apiFetch(`/workflows/${id}`);
      if (!response.ok) throw new Error("Failed to fetch workflow");
      return response.json();
    },
  });

  const workflow = workflowData?.data;

  // Sync DB states to React Flow nodes/edges on load
  useEffect(() => {
    if (workflow?.versions?.[0]) {
      const version = workflow.versions[0];
      
      const loadedNodes: Node[] = (version.states || []).map((state: any) => ({
        id: state.id.toString(),
        type: 'custom',
        position: state.visual_coordinates || { x: 100, y: 100 },
        data: { 
          label: state.name,
          type: state.type,
          dbId: state.id,
        },
      }));
      
      const loadedEdges: Edge[] = (version.transitions || []).map((transition: any) => ({
        id: transition.id.toString(),
        source: transition.source_state_id.toString(),
        target: transition.destination_state_id.toString(),
        label: transition.label,
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed },
        data: {
          trigger: transition.trigger,
          dbId: transition.id,
        }
      }));

      // If empty, add a default Start node
      if (loadedNodes.length === 0) {
        loadedNodes.push({
          id: 'temp-start',
          type: 'custom',
          position: { x: 250, y: 100 },
          data: { label: 'Start', type: 'ENTRY' }
        });
      }

      setNodes(loadedNodes);
      setEdges(loadedEdges);
    }
  }, [workflow]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } }, eds)),
    []
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setSelectedEdge(null);
  }, []);

  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
  }, []);

  // Update selected node properties
  const updateSelectedNode = (field: string, value: string) => {
    if (!selectedNode) return;
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === selectedNode.id) {
          const updatedNode = { ...n, data: { ...n.data, [field]: value } };
          setSelectedNode(updatedNode); // update local selected state immediately
          return updatedNode;
        }
        return n;
      })
    );
  };

  // Drag and Drop support
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (typeof type === 'undefined' || !type) {
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: `node-${Date.now()}`,
        type: 'custom',
        position,
        data: { label: `${type} State`, type: type.toUpperCase() },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition]
  );

  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await apiFetch(`/workflows/${id}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodes, edges }),
      });
      if (!response.ok) throw new Error("Failed to sync workflow graph");
      return response.json();
    },
    onSuccess: () => {
      toast.success("Workflow design saved successfully.");
      queryClient.invalidateQueries({ queryKey: ["workflow", id] });
    },
    onError: () => {
      toast.error("Failed to save workflow design.");
    }
  });

  const handleSave = () => {
    syncMutation.mutate();
  };

  const addActionMutation = useMutation({
    mutationFn: async (payload: any) => {
      const response = await apiFetch(`/workflows/${id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Failed to add action");
      return response.json();
    },
    onSuccess: () => {
      toast.success("Action added");
      queryClient.invalidateQueries({ queryKey: ["workflow", id] });
      setIsActionModalOpen(false);
    },
    onError: () => {
      toast.error("Failed to add action");
    }
  });

  const deleteActionMutation = useMutation({
    mutationFn: async (actionId: number) => {
      const response = await apiFetch(`/workflows/${id}/actions/${actionId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete action");
      return response.json();
    },
    onSuccess: () => {
      toast.success("Action deleted");
      queryClient.invalidateQueries({ queryKey: ["workflow", id] });
    },
  });

  const handleAddAction = () => {
    let payload: any = { ...newAction };
    if (selectedNode?.data?.dbId) {
      payload.workflow_state_id = selectedNode.data.dbId;
    } else if ((selectedEdge?.data as any)?.dbId) {
      payload.workflow_transition_id = (selectedEdge?.data as any).dbId;
    } else {
      toast.error("Please save draft before adding actions to this element.");
      return;
    }
    addActionMutation.mutate(payload);
  };

  // Helper to find actions for currently selected node/edge
  const getSelectedActions = (): WorkflowAction[] => {
    if (!workflow?.versions?.[0]) return [];
    if (selectedNode?.data?.dbId) {
      const state = workflow.versions[0].states.find((s: any) => s.id === selectedNode.data.dbId);
      return state?.actions || [];
    }
    if ((selectedEdge?.data as any)?.dbId) {
      const transition = workflow.versions[0].transitions.find((t: any) => t.id === (selectedEdge?.data as any).dbId);
      return transition?.actions || [];
    }
    return [];
  };

  const activateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiFetch(`/workflows/${id}/activate`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to activate workflow");
      return response.json();
    },
    onSuccess: () => {
      toast.success("Workflow activated successfully.");
      queryClient.invalidateQueries({ queryKey: ["workflow", id] });
    },
    onError: () => {
      toast.error("Failed to activate workflow.");
    }
  });

  if (isLoading) {
    return <div className="p-8 flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <header className="h-14 border-b bg-card px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/settings/workflows')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="font-semibold text-sm">{workflow?.name || 'Loading...'}</h1>
            <p className="text-xs text-muted-foreground">Version 1 • Draft</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handleSave} disabled={syncMutation.isPending}>
            {syncMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Draft
          </Button>
          <Button size="sm" onClick={() => activateMutation.mutate()} disabled={activateMutation.isPending || workflow?.status === 'active'}>
            {activateMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
            {workflow?.status === 'active' ? 'Active' : 'Activate'}
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Components */}
        <div className="w-64 border-r bg-card flex flex-col shrink-0">
          <div className="p-4 border-b font-medium text-sm">Components</div>
          <div className="p-4 space-y-3 flex-1 overflow-y-auto">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">States</div>
            <div 
              className="p-3 bg-muted/50 border rounded-md cursor-grab active:cursor-grabbing text-sm flex items-center shadow-sm"
              draggable
              onDragStart={(e) => e.dataTransfer.setData('application/reactflow', 'Approval')}
            >
              Approval State
            </div>
            <div 
              className="p-3 bg-muted/50 border rounded-md cursor-grab active:cursor-grabbing text-sm flex items-center shadow-sm"
              draggable
              onDragStart={(e) => e.dataTransfer.setData('application/reactflow', 'Task')}
            >
              Task State
            </div>
            <div 
              className="p-3 bg-muted/50 border rounded-md cursor-grab active:cursor-grabbing text-sm flex items-center shadow-sm"
              draggable
              onDragStart={(e) => e.dataTransfer.setData('application/reactflow', 'End')}
            >
              End State
            </div>
          </div>
        </div>

        {/* Center - Canvas */}
        <div className="flex-1 relative" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            fitView
          >
            <Background color="#ccc" gap={16} />
            <Controls />
            <Panel position="top-right" className="bg-card/90 backdrop-blur-sm border rounded-lg p-2 shadow-sm text-xs font-medium text-muted-foreground">
              Base Record: {workflow?.base_record_type}
            </Panel>
          </ReactFlow>
        </div>

        {/* Right Sidebar - Properties */}
        <div className="w-80 border-l bg-card flex flex-col shrink-0">
          <div className="p-4 border-b font-medium text-sm">
            {selectedNode ? 'State Properties' : selectedEdge ? 'Transition Properties' : 'Workflow Properties'}
          </div>
          <div className="p-4 flex-1 overflow-y-auto">
            {selectedNode && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">State Name</label>
                  <Input 
                    value={selectedNode.data.label as string} 
                    onChange={(e) => updateSelectedNode('label', e.target.value)} 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">State Type</label>
                  <Input value={selectedNode.data.type as string} disabled />
                </div>
              </div>
            )}
            {selectedEdge && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Transition Label</label>
                  <Input 
                    value={selectedEdge.label as string || ''} 
                    onChange={(e) => {
                      setEdges((eds) => eds.map((edge) => edge.id === selectedEdge.id ? { ...edge, label: e.target.value } : edge));
                      setSelectedEdge({ ...selectedEdge, label: e.target.value });
                    }} 
                  />
                </div>
              </div>
            )}
            
            {(selectedNode || selectedEdge) && (
              <div className="mt-8 pt-4 border-t">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold">Actions</h3>
                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setIsActionModalOpen(true)}>
                    <Plus className="w-3 h-3 mr-1" /> Add Action
                  </Button>
                </div>
                {(!selectedNode?.data?.dbId && !(selectedEdge?.data as any)?.dbId) ? (
                  <p className="text-xs text-muted-foreground bg-muted p-3 rounded-md text-center">
                    Please save draft first to attach actions.
                  </p>
                ) : getSelectedActions().length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No actions configured.</p>
                ) : (
                  <div className="space-y-2">
                    {getSelectedActions().map((action) => (
                      <div key={action.id} className="text-xs bg-muted/50 border rounded-md p-2 flex items-start justify-between">
                        <div>
                          <div className="font-semibold">{action.action_type}</div>
                          <div className="text-muted-foreground mt-0.5">{action.execution_timing}</div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteActionMutation.mutate(action.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!selectedNode && !selectedEdge && (
              <div className="text-sm text-muted-foreground text-center mt-10">
                Select a state or transition on the canvas to edit its properties.
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal open={isActionModalOpen} onOpenChange={setIsActionModalOpen} title="Add Workflow Action">
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Action Type</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={newAction.action_type}
              onChange={(e) => setNewAction({ ...newAction, action_type: e.target.value })}
            >
              <option value="SEND_EMAIL">Send Email</option>
              <option value="WEBHOOK">Webhook</option>
              <option value="UPDATE_FIELD">Update Field</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Execution Timing</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={newAction.execution_timing}
              onChange={(e) => setNewAction({ ...newAction, execution_timing: e.target.value })}
            >
              <option value="BEFORE">Before Transition / Entering</option>
              <option value="AFTER">After Transition / Entered</option>
            </select>
          </div>
          <div className="flex justify-end pt-4 space-x-2">
            <Button variant="outline" onClick={() => setIsActionModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddAction} disabled={addActionMutation.isPending}>
              {addActionMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Action
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ----------------------------------------------------------------------
// Page Export
// ----------------------------------------------------------------------
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  return (
    <ReactFlowProvider>
      <WorkflowBuilder id={id} />
    </ReactFlowProvider>
  );
}
