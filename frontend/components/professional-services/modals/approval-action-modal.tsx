import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { 
  PsEstimation, 
  submitEstimationApproval, 
  approveEstimation, 
  rejectEstimation, 
  requestEstimationRevision 
} from "@/lib/api/professional-services";

export function ApprovalActionModal({
  open,
  onOpenChange,
  estimation,
  actionType,
  onSuccess
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  estimation: PsEstimation;
  actionType: "submit" | "approve" | "reject" | "request_revision";
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");

  const handleSubmit = async () => {
    try {
      setLoading(true);
      if (actionType === "submit") {
        await submitEstimationApproval(estimation.id, text);
      } else if (actionType === "approve") {
        await approveEstimation(estimation.id); // Also passing text if supported backend
      } else if (actionType === "reject") {
        await rejectEstimation(estimation.id, text);
      } else if (actionType === "request_revision") {
        await requestEstimationRevision(estimation.id, text);
      }
      onSuccess();
      onOpenChange(false);
      setText("");
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Failed to process action");
    } finally {
      setLoading(false);
    }
  };

  const titles = {
    submit: "Submit for Approval",
    approve: "Approve Estimation",
    reject: "Reject Estimation",
    request_revision: "Request Revision"
  };

  const isReasonRequired = ["reject", "request_revision"].includes(actionType);

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={titles[actionType]}>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {actionType === "approve" ? "Are you sure you want to approve this estimation? It will lock further edits." : "Provide additional context for this action."}
        </p>

        <div className="space-y-2">
          <label className="text-sm font-medium">{isReasonRequired ? "Reason (Required)" : "Comment (Optional)"}</label>
          <textarea 
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={text} 
            onChange={(e: any) => setText(e.target.value)} 
            placeholder={isReasonRequired ? "Please provide a reason..." : "Add a comment..."} 
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading || (isReasonRequired && !text.trim())}>
            Confirm
          </Button>
        </div>
      </div>
    </Modal>
  );
}
