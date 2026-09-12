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

type TaskFormValues = {
  task_name: string;
  role_id: number | "";
  base_mandays: number;
};

const emptyForm: TaskFormValues = { task_name: "", role_id: "", base_mandays: 1 };

export function TaskBreakdownEditor({ estimationId, onUpdate }: { estimationId: number, onUpdate: () => void }) {
  const [tasks, setTasks] = useState<PsEstimationLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [config, setConfig] = useState<PsConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [addingParentId, setAddingParentId] = useState<number | null | undefined>(undefined);
  const [addForm, setAddForm] = useState<TaskFormValues>(emptyForm);

  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<TaskFormValues>(emptyForm);

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

  const startAdd = (parentTaskId: number | null) => {
    setError(null);
    setEditingTaskId(null);
    setAddingParentId(parentTaskId);
    setAddForm({ ...emptyForm, role_id: config?.roles?.[0]?.id ?? "" });
  };

  const cancelAdd = () => {
    setAddingParentId(undefined);
    setAddForm(emptyForm);
  };

  const submitAdd = async () => {
    if (!addForm.task_name.trim()) {
      setError("Task name is required.");
      return;
    }
    try {
      setSaving(true);
      setError(null);
      await storeEstimationTask(estimationId, {
        parent_task_id: addingParentId ?? null,
        task_type: addingParentId ? "subtask" : "task",
        task_name: addForm.task_name.trim(),
        subtask_name: addingParentId ? addForm.task_name.trim() : undefined,
        role_id: addForm.role_id || undefined,
        base_mandays: addForm.base_mandays,
        manual_adjustment: 0,
      });
      cancelAdd();
      await loadTasks();
      onUpdate();
    } catch (e: any) {
      console.error(e);
      setError("Failed to add task. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (task: PsEstimationLine) => {
    setError(null);
    setAddingParentId(undefined);
    setEditingTaskId(task.id ?? null);
    setEditForm({
      task_name: task.task_type === "subtask" ? (task.subtask_name || task.task_name) : task.task_name,
      role_id: task.role_id ?? "",
      base_mandays: task.base_mandays ?? 0,
    });
  };

  const cancelEdit = () => {
    setEditingTaskId(null);
    setEditForm(emptyForm);
  };

  const submitEdit = async (task: PsEstimationLine) => {
    if (!editForm.task_name.trim() || !task.id) {
      setError("Task name is required.");
      return;
    }
    try {
      setSaving(true);
      setError(null);
      const isSubtask = task.task_type === "subtask";
      await updateEstimationTask(estimationId, task.id, {
        task_name: isSubtask ? task.task_name : editForm.task_name.trim(),
        subtask_name: isSubtask ? editForm.task_name.trim() : undefined,
        role_id: editForm.role_id || undefined,
        base_mandays: editForm.base_mandays,
      });
      cancelEdit();
      await loadTasks();
      onUpdate();
    } catch (e: any) {
      console.error(e);
      setError("Failed to update task. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (task: PsEstimationLine) => {
    if (!task.id) return;
    const label = task.task_type === "subtask" ? (task.subtask_name || task.task_name) : task.task_name;
    if (!window.confirm(`Delete "${label}"? ${task.subtasks?.length ? "Its subtasks will also be deleted. " : ""}This cannot be undone.`)) {
      return;
    }
    try {
      setSaving(true);
      setError(null);
      await deleteEstimationTask(estimationId, task.id);
      await loadTasks();
      onUpdate();
    } catch (e: any) {
      console.error(e);
      setError("Failed to delete task. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const renderTaskForm = (values: TaskFormValues, onChange: (v: TaskFormValues) => void, onSave: () => void, onCancel: () => void, depth: number) => (
    <div className={`flex items-center gap-2 p-3 bg-muted/20 ${depth > 0 ? 'pl-10' : ''}`}>
      <Input
        autoFocus
        value={values.task_name}
        onChange={e => onChange({ ...values, task_name: e.target.value })}
        placeholder={depth > 0 ? "Subtask name" : "Task name"}
        className="flex-1"
      />
      <select
        className="h-9 w-32 px-2 border rounded-md text-sm"
        value={values.role_id?.toString() ?? ""}
        onChange={e => onChange({ ...values, role_id: e.target.value ? parseInt(e.target.value) : "" })}
      >
        <option value="">No role</option>
        {config?.roles?.filter(r => r.is_active).map(r => (
          <option key={r.id} value={r.id.toString()}>{r.name}</option>
        ))}
      </select>
      <Input
        type="number"
        min="0"
        step="0.5"
        value={values.base_mandays}
        onChange={e => onChange({ ...values, base_mandays: parseFloat(e.target.value) || 0 })}
        className="w-24 text-right"
      />
      <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:text-green-700" onClick={onSave} disabled={saving}>
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
      </Button>
      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onCancel} disabled={saving}>
        <X className="w-4 h-4" />
      </Button>
    </div>
  );

  const renderTask = (task: PsEstimationLine, depth = 0) => {
    const isSubtask = depth > 0;
    const isEditing = editingTaskId === task.id;
    return (
      <div key={task.id} className="border-b last:border-0 hover:bg-muted/30">
        {isEditing ? (
          renderTaskForm(editForm, setEditForm, () => submitEdit(task), cancelEdit, depth)
        ) : (
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

            <div className="w-24 text-right flex justify-end">
              {!isSubtask && (
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Add subtask" onClick={() => task.id && startAdd(task.id)}>
                  <Plus className="w-4 h-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit" onClick={() => startEdit(task)}>
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" title="Delete" onClick={() => handleDelete(task)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {task.subtasks && task.subtasks.length > 0 && (
          <div className="border-t border-dashed">
            {task.subtasks.map(sub => renderTask(sub, depth + 1))}
          </div>
        )}

        {addingParentId === task.id && renderTaskForm(addForm, setAddForm, submitAdd, cancelAdd, depth + 1)}
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
          <Button size="sm" onClick={() => startAdd(null)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Task
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
            <AlertTriangle className="w-4 h-4" /> {error}
          </div>
        )}
        {tasks.length === 0 && addingParentId === undefined ? (
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
              {addingParentId === null && renderTaskForm(addForm, setAddForm, submitAdd, cancelAdd, 0)}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
