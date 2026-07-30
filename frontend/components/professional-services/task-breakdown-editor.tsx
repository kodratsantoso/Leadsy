"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus, Edit2, Trash2, Wand2, Check, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  getEstimationTasks,
  generateTaskBreakdown,
  applyTaskBreakdown,
  storeEstimationTask,
  updateEstimationTask,
  deleteEstimationTask,
  recalculateEstimationTasks,
  PsEstimationLine,
  getPsConfig,
  PsConfig
} from "@/lib/api/professional-services";

export function TaskBreakdownEditor({ estimationId, onUpdate }: { estimationId: number, onUpdate: () => void }) {
  const [tasks, setTasks] = useState<PsEstimationLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [config, setConfig] = useState<PsConfig | null>(null);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const [t, c] = await Promise.all([
        getEstimationTasks(estimationId),
        getPsConfig()
      ]);
      setTasks(t);
      setConfig(c);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [estimationId]);

  const handleGenerateAI = async () => {
    try {
      setAiGenerating(true);
      const res = await generateTaskBreakdown(estimationId);
      if (res && res.task_breakdown) {
        // Apply directly for now (in real life we'd show a review modal)
        await applyTaskBreakdown(estimationId, res.task_breakdown);
        await loadTasks();
        onUpdate();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAiGenerating(false);
    }
  };

  const handleRecalculate = async () => {
    try {
      await recalculateEstimationTasks(estimationId);
      await loadTasks();
      onUpdate();
    } catch (e) {
      console.error(e);
    }
  };

  const renderTask = (task: PsEstimationLine, depth = 0) => {
    const isSubtask = depth > 0;
    return (
      <div key={task.id} className="border-b last:border-0 hover:bg-muted/30">
        <div className={`flex items-center justify-between p-3 ${isSubtask ? 'pl-10 bg-muted/10' : ''}`}>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className={`font-medium ${isSubtask ? 'text-sm' : ''}`}>
                {isSubtask ? task.subtask_name : task.task_name}
              </span>
              {task.is_ai_generated && (
                <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded uppercase font-bold flex items-center">
                  <Wand2 className="w-3 h-3 mr-1" /> AI
                </span>
              )}
            </div>
            {task.description && <p className="text-xs text-muted-foreground mt-1">{task.description}</p>}
          </div>
          
          <div className="w-32 text-sm text-muted-foreground">
            {task.role?.name || '-'}
          </div>
          
          <div className="w-24 text-right text-sm">
            {task.final_mandays} MD
          </div>
          
          <div className="w-24 text-right">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {task.subtasks && task.subtasks.length > 0 && (
          <div className="border-t border-dashed">
            {task.subtasks.map(sub => renderTask(sub, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Task & Subtask Breakdown</CardTitle>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={handleRecalculate}>
            Recalculate
          </Button>
          <Button variant="outline" size="sm" onClick={handleGenerateAI} disabled={aiGenerating} className="text-[color:var(--brand)] border-[color:var(--brand)] hover:bg-[color:var(--brand)] hover:text-white">
            {aiGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
            AI Breakdown
          </Button>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Task
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground border rounded-md border-dashed">
            No tasks defined yet. Add a task or generate a breakdown using AI.
          </div>
        ) : (
          <div className="border rounded-md">
            <div className="flex items-center justify-between p-3 bg-muted/50 border-b text-sm font-medium">
              <div className="flex-1">Task / Subtask Name</div>
              <div className="w-32">Role</div>
              <div className="w-24 text-right">Final MD</div>
              <div className="w-24 text-right">Actions</div>
            </div>
            <div>
              {tasks.map(t => renderTask(t, 0))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
