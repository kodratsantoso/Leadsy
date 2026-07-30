"use client";

import { useState } from "react";
import { sendDocumentForSignature, PsDocument } from "@/lib/api/professional-services";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";

interface SendSignatureModalProps {
  document: PsDocument;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function SendSignatureModal({ document, open, onOpenChange, onSuccess }: SendSignatureModalProps) {
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState(`Signature Request: ${document.document_title}`);
  const [message, setMessage] = useState("Please review and sign the attached document.");
  
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [internalName, setInternalName] = useState("");
  const [internalEmail, setInternalEmail] = useState("");

  const handleSend = async () => {
    if (!customerName || !customerEmail || !internalName || !internalEmail) {
      alert("Please fill in both customer and internal signer details.");
      return;
    }

    try {
      setLoading(true);
      await sendDocumentForSignature(document.id, {
        subject,
        message,
        signers: [
          { type: 'customer', name: customerName, email: customerEmail },
          { type: 'internal', name: internalName, email: internalEmail }
        ]
      });
      onSuccess();
      onOpenChange(false);
    } catch (e: any) {
      alert(e.message || "Failed to send signature request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Send for Digital Signature">
        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
          
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Email Subject</label>
            <Input value={subject} onChange={e => setSubject(e.target.value)} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Message</label>
            <textarea 
              value={message} 
              onChange={e => setMessage(e.target.value)} 
              rows={3} 
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="border-t pt-4 space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground">Customer Signatory</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Name</label>
                <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="John Doe" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Email</label>
                <Input value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} placeholder="john@client.com" type="email" />
              </div>
            </div>
          </div>

          <div className="border-t pt-4 space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground">Internal Signatory (Leadsy)</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Name</label>
                <Input value={internalName} onChange={e => setInternalName(e.target.value)} placeholder="Jane Smith" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Email</label>
                <Input value={internalEmail} onChange={e => setInternalEmail(e.target.value)} placeholder="jane@leadsy.com" type="email" />
              </div>
            </div>
          </div>

        </div>
        <div className="flex justify-end space-x-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSend} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
            {loading ? "Sending..." : "Send Request"}
          </Button>
        </div>
    </Modal>
  );
}
