"use client";

import { useState, useEffect } from "react";
import { 
  FileText, Plus, Download, RefreshCw, Send, Trash2, CheckCircle2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  PsDocument, 
  getEstimationDocuments, 
  deleteEstimationDocument,
  refreshDocumentSignatureStatus
} from "@/lib/api/professional-services";
import { GenerateDocumentModal } from "./modals/generate-document-modal";
import { SendSignatureModal } from "./modals/send-signature-modal";

interface PsDocumentListProps {
  estimationId: number;
}

export function PsDocumentList({ estimationId }: PsDocumentListProps) {
  const [documents, setDocuments] = useState<PsDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  
  const [signatureDoc, setSignatureDoc] = useState<PsDocument | null>(null);
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, [estimationId]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const data = await getEstimationDocuments(estimationId);
      setDocuments(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    try {
      await deleteEstimationDocument(id);
      loadDocuments();
    } catch (e: any) {
      alert(e.message || "Failed to delete");
    }
  };

  const handleRefreshStatus = async (id: number) => {
    try {
      await refreshDocumentSignatureStatus(id);
      loadDocuments();
    } catch (e: any) {
      alert(e.message || "Failed to refresh");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft_generated': return <Badge variant="outline">Draft</Badge>;
      case 'sent_for_signature': return <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-100">Sent for Signature</Badge>;
      case 'signed': return <Badge variant="outline" className="bg-green-600 text-white hover:bg-green-600">Signed</Badge>;
      default: return <Badge variant="outline">{status.replace(/_/g, ' ')}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center">
          <FileText className="h-5 w-5 mr-2" /> Documents & SOW
        </CardTitle>
        <Button size="sm" onClick={() => setGenerateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Generate Document
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-4 text-sm text-muted-foreground">Loading...</div>
        ) : documents.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground bg-muted/20 rounded-md border border-dashed">
            No documents generated yet.
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map(doc => (
              <div key={doc.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/30 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-md">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">
                      {doc.document_title} <span className="text-muted-foreground ml-1">(v{doc.version_number})</span>
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground mt-1 space-x-3">
                      <span>{doc.document_number}</span>
                      {getStatusBadge(doc.status)}
                      {doc.generated_at && <span>Generated: {new Date(doc.generated_at).toLocaleDateString()}</span>}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <a href={doc.file_url} target="_blank" rel="noreferrer">
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </a>
                  
                  {doc.status === 'draft_generated' && (
                    <Button variant="ghost" size="sm" onClick={() => {
                      setSignatureDoc(doc);
                      setSignatureModalOpen(true);
                    }}>
                      <Send className="h-4 w-4 text-blue-600" />
                    </Button>
                  )}
                  
                  {doc.status === 'sent_for_signature' && (
                    <Button variant="ghost" size="sm" onClick={() => handleRefreshStatus(doc.id)} title="Refresh Signature Status">
                      <RefreshCw className="h-4 w-4 text-orange-500" />
                    </Button>
                  )}

                  {(doc.status === 'draft_generated' || doc.status === 'declined') && (
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(doc.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <GenerateDocumentModal
        estimationId={estimationId}
        open={generateModalOpen}
        onOpenChange={setGenerateModalOpen}
        onSuccess={loadDocuments}
      />

      {signatureDoc && (
        <SendSignatureModal
          document={signatureDoc}
          open={signatureModalOpen}
          onOpenChange={setSignatureModalOpen}
          onSuccess={loadDocuments}
        />
      )}
    </Card>
  );
}
