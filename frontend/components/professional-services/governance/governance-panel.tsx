import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, FileEdit, History, Send } from "lucide-react";
import { 
  PsEstimation, 
  getEstimationBlockers, 
  getEstimationVersions, 
  PsBlocker, 
  PsEstimationVersion, 
  PsApprovalLog, 
  PsRevision 
} from "@/lib/api/professional-services";
import { ApprovalActionModal } from "../modals/approval-action-modal";
import { CreateRevisionModal } from "../modals/create-revision-modal";

export function GovernancePanel({
  estimation,
  onUpdate
}: {
  estimation: PsEstimation;
  onUpdate: () => void;
}) {
  const [blockers, setBlockers] = useState<PsBlocker[]>([]);
  const [versions, setVersions] = useState<PsEstimationVersion[]>([]);
  const [logs, setLogs] = useState<PsApprovalLog[]>([]);
  const [revisions, setRevisions] = useState<PsRevision[]>([]);
  
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState<"submit" | "approve" | "reject" | "request_revision">("submit");
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);

  useEffect(() => {
    loadGovernanceData();
  }, [estimation.id, estimation.status]);

  const loadGovernanceData = async () => {
    try {
      const [blockersData, versionsData] = await Promise.all([
        getEstimationBlockers(estimation.id),
        getEstimationVersions(estimation.id)
      ]);
      setBlockers(blockersData);
      setVersions(versionsData.versions);
      setLogs(versionsData.logs);
      setRevisions(versionsData.revisions);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAction = (type: "submit" | "approve" | "reject" | "request_revision") => {
    setActionType(type);
    setActionModalOpen(true);
  };

  const isLocked = ["pending_approval", "approved", "converted_to_quotation", "archived", "document_generated", "sent_for_signature", "signed"].includes(estimation.status);

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">Governance & Approval</CardTitle>
            <CardDescription>Version {estimation.version_number || 1}</CardDescription>
          </div>
          <Badge variant="outline">{estimation.status.replace(/_/g, " ").toUpperCase()}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Blockers */}
        {blockers.length > 0 && (
          <div className="space-y-2 p-3 bg-red-50 dark:bg-red-950/20 rounded-md border border-red-200 dark:border-red-900">
            <h4 className="text-sm font-medium text-red-800 dark:text-red-400 flex items-center">
              <AlertCircle className="w-4 h-4 mr-2" /> Validation Blockers
            </h4>
            <ul className="text-xs text-red-700 dark:text-red-500 space-y-1 list-disc list-inside">
              {blockers.map((b, i) => (
                <li key={i}>{b.message}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {['draft', 'pm_reviewed', 'revision_required', 'rejected'].includes(estimation.status) && (
            <Button 
              size="sm" 
              onClick={() => handleAction("submit")}
              disabled={blockers.some(b => !b.overridable)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Send className="w-4 h-4 mr-2" /> Submit for Approval
            </Button>
          )}

          {estimation.status === 'pending_approval' && (
            <>
              <Button size="sm" onClick={() => handleAction("approve")} className="bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="w-4 h-4 mr-2" /> Approve
              </Button>
              <Button size="sm" variant="destructive" onClick={() => handleAction("reject")}>
                Reject
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleAction("request_revision")}>
                Request Revision
              </Button>
            </>
          )}

          {isLocked && (
            <Button size="sm" variant="outline" onClick={() => setRevisionModalOpen(true)}>
              <FileEdit className="w-4 h-4 mr-2" /> Create Revision
            </Button>
          )}
        </div>

        {/* History */}
        {logs.length > 0 && (
          <div className="pt-4 border-t mt-4">
            <h4 className="text-sm font-medium flex items-center mb-2"><History className="w-4 h-4 mr-2" /> Activity Log</h4>
            <div className="space-y-3">
              {logs.slice(0, 3).map((log) => (
                <div key={log.id} className="text-xs flex gap-2">
                  <div className="w-20 text-muted-foreground shrink-0">{new Date(log.created_at).toLocaleDateString()}</div>
                  <div>
                    <span className="font-medium">{log.actor?.name || 'System'}</span> {log.action.replace('_', ' ')}
                    {log.comment && <div className="text-muted-foreground mt-0.5">"{log.comment}"</div>}
                    {log.reason && <div className="text-red-500 mt-0.5">Reason: {log.reason}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </CardContent>

      <ApprovalActionModal 
        open={actionModalOpen} 
        onOpenChange={setActionModalOpen} 
        estimation={estimation} 
        actionType={actionType}
        onSuccess={onUpdate}
      />

      <CreateRevisionModal
        open={revisionModalOpen}
        onOpenChange={setRevisionModalOpen}
        estimation={estimation}
      />
    </Card>
  );
}
