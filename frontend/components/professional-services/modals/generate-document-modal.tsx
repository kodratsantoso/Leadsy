"use client";

import { useState } from "react";
import { generateEstimationDocument } from "@/lib/api/professional-services";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";

interface GenerateDocumentModalProps {
  estimationId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function GenerateDocumentModal({ estimationId, open, onOpenChange, onSuccess }: GenerateDocumentModalProps) {
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState("estimation");
  const [includeCommercial, setIncludeCommercial] = useState(true);
  const [includeTaskBreakdown, setIncludeTaskBreakdown] = useState(true);

  const handleGenerate = async () => {
    try {
      setLoading(true);
      await generateEstimationDocument(estimationId, {
        document_type: type,
        include_commercial: includeCommercial,
        include_task_breakdown: includeTaskBreakdown,
        include_appendix: false
      });
      onSuccess();
      onOpenChange(false);
    } catch (e: any) {
      alert(e.message || "Failed to generate document.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Generate Document">
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Document Type</label>
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="estimation">Professional Services Estimation</option>
              <option value="sow">Statement of Work (SOW)</option>
              <option value="scope_agreement">Scope Agreement</option>
            </Select>
          </div>
          
          <div className="flex items-center justify-between">
            <label className="flex flex-col space-y-1">
              <span className="text-sm font-medium">Include Task Breakdown</span>
              <span className="font-normal text-xs text-muted-foreground">List all tasks and subtasks.</span>
            </label>
            <input type="checkbox" className="h-4 w-4 rounded border-gray-300" checked={includeTaskBreakdown} onChange={(e) => setIncludeTaskBreakdown(e.target.checked)} />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex flex-col space-y-1">
              <span className="text-sm font-medium">Include Commercials</span>
              <span className="font-normal text-xs text-muted-foreground">Show MD and pricing summary.</span>
            </label>
            <input type="checkbox" className="h-4 w-4 rounded border-gray-300" checked={includeCommercial} onChange={(e) => setIncludeCommercial(e.target.checked)} />
          </div>
        </div>
        <div className="flex justify-end space-x-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleGenerate} disabled={loading}>
            {loading ? "Generating..." : "Generate PDF"}
          </Button>
        </div>
    </Modal>
  );
}
