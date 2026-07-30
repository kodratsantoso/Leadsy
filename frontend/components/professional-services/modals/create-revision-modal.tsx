import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { 
  PsEstimation, 
  createEstimationRevision 
} from "@/lib/api/professional-services";

export function CreateRevisionModal({
  open,
  onOpenChange,
  estimation
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  estimation: PsEstimation;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const newEstimation = await createEstimationRevision(estimation.id, reason);
      onOpenChange(false);
      setReason("");
      router.push(`/professional-services/estimations/${newEstimation.id}`);
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Failed to create revision");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Create New Revision">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          This estimation is locked. Creating a revision will duplicate it into a new draft and link it to this version.
        </p>

        <div className="space-y-2">
          <label className="text-sm font-medium">Revision Reason (Required)</label>
          <textarea 
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={reason} 
            onChange={(e: any) => setReason(e.target.value)} 
            placeholder="Why is a new revision needed? (e.g. Scope changed, client requested different roles)" 
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading || !reason.trim()}>
            Create Revision
          </Button>
        </div>
      </div>
    </Modal>
  );
}
