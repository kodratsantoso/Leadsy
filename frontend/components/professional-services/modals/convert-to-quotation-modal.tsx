"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PsEstimation, quotationPreview, convertToQuotation } from "@/lib/api/professional-services";

type ConvertToQuotationModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  estimation: PsEstimation;
  onSuccess: (data: any) => void;
};

export function ConvertToQuotationModal({ open, onOpenChange, estimation, onSuccess }: ConvertToQuotationModalProps) {
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  
  // Form State
  const [conversionType, setConversionType] = useState<"new_quotation" | "existing_draft_quotation">("new_quotation");
  const [lineDetailLevel, setLineDetailLevel] = useState<"summary" | "by_task" | "by_role">("summary");
  const [commercialRateMethod, setCommercialRateMethod] = useState<"estimation_fee" | "selected_rate" | "blended_role_rate" | "manual_override">("estimation_fee");
  const [manualUnitPrice, setManualUnitPrice] = useState<string>("");
  const [manualOverrideReason, setManualOverrideReason] = useState("");
  
  // New Quotation Fields
  const [quotationType, setQuotationType] = useState("Service");
  const [quotationDate, setQuotationDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Existing Quotation Fields
  const [quotationId, setQuotationId] = useState<string>("");

  // Preview Data
  const [previewTotals, setPreviewTotals] = useState<any>(null);

  const fetchPreview = async () => {
    if (!open) return;
    try {
      setPreviewLoading(true);
      const data = await quotationPreview(estimation.id, {
        line_detail_level: lineDetailLevel,
        commercial_rate_method: commercialRateMethod,
        manual_unit_price: manualUnitPrice ? Number(manualUnitPrice) : undefined,
      });
      setPreviewTotals(data.totals);
    } catch (e) {
      console.error(e);
    } finally {
      setPreviewLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPreview();
    }, 500);
    return () => clearTimeout(timer);
  }, [open, lineDetailLevel, commercialRateMethod, manualUnitPrice]);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const payload: any = {
        conversion_type: conversionType,
        line_detail_level: lineDetailLevel,
        commercial_rate_method: commercialRateMethod,
      };

      if (commercialRateMethod === "manual_override") {
        payload.manual_unit_price = Number(manualUnitPrice);
        payload.manual_override_reason = manualOverrideReason;
      }

      if (conversionType === "new_quotation") {
        payload.quotation_type = quotationType;
        payload.quotation_date = quotationDate;
      } else {
        payload.quotation_id = Number(quotationId);
      }

      const res = await convertToQuotation(estimation.id, payload);
      onSuccess(res);
      onOpenChange(false);
    } catch (e: any) {
      alert("Failed to convert: " + (e.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: estimation.currency_code || 'USD' }).format(amount);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Convert to Quotation"
      description={`Convert estimation ${estimation.estimation_number} to a commercial quotation.`}
      size="xl"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || previewLoading || (conversionType === 'existing_draft_quotation' && !quotationId)}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Convert to Quotation
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="font-medium border-b pb-2">Conversion Settings</h3>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Conversion Target</label>
              <Select value={conversionType} onChange={(e: any) => setConversionType(e.target.value)}>
                <option value="new_quotation">Create New Quotation</option>
                <option value="existing_draft_quotation">Add to Existing Draft</option>
              </Select>
            </div>

            {conversionType === "new_quotation" && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Quotation Type</label>
                  <Select value={quotationType} onChange={(e: any) => setQuotationType(e.target.value)}>
                    <option value="Service">Service</option>
                    <option value="Project">Project</option>
                    <option value="Retainer">Retainer</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Quotation Date</label>
                  <Input type="date" value={quotationDate} onChange={(e: any) => setQuotationDate(e.target.value)} />
                </div>
              </>
            )}

            {conversionType === "existing_draft_quotation" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Existing Quotation ID</label>
                <Input placeholder="Enter Draft Quotation ID" value={quotationId} onChange={(e: any) => setQuotationId(e.target.value)} />
                <p className="text-xs text-muted-foreground">ID of the draft quotation for this lead.</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="font-medium border-b pb-2">Line Item Formatting</h3>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Detail Level</label>
              <Select value={lineDetailLevel} onChange={(e: any) => setLineDetailLevel(e.target.value)}>
                <option value="summary">1 Line (Summary)</option>
                <option value="by_task">Group by Task</option>
                <option value="by_role">Group by Role</option>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Commercial Rate Method</label>
              <Select value={commercialRateMethod} onChange={(e: any) => setCommercialRateMethod(e.target.value)}>
                <option value="estimation_fee">Use Calculated Estimation Fee</option>
                <option value="manual_override">Manual Override</option>
              </Select>
            </div>

            {commercialRateMethod === "manual_override" && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Manual Unit Price (per ManDay)</label>
                  <Input type="number" step="0.01" value={manualUnitPrice} onChange={(e: any) => setManualUnitPrice(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Override Reason</label>
                  <textarea 
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    value={manualOverrideReason} 
                    onChange={(e: any) => setManualOverrideReason(e.target.value)} 
                  />
                </div>
              </>
            )}
          </div>
        </div>

        <div>
          <div className="bg-muted/30 rounded-lg p-6 border h-full">
            <h3 className="font-medium border-b pb-2 mb-4 flex items-center justify-between">
              <span>Preview</span>
              {previewLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </h3>
            
            {previewTotals ? (
              <div className="space-y-4 text-sm">
                <div className="space-y-2 mb-6">
                  <h4 className="font-medium text-xs uppercase text-muted-foreground">Lines Generated</h4>
                  {previewTotals.items.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between border-b pb-2">
                      <div className="max-w-[70%]">
                        <div className="font-medium">{item.item_name}</div>
                        <div className="text-xs text-muted-foreground">{item.quantity} ManDays @ {formatCurrency(item.unit_price)}</div>
                      </div>
                      <div className="font-medium">{formatCurrency(item.total_amount)}</div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>{formatCurrency(previewTotals.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tax</span>
                    <span>{formatCurrency(previewTotals.tax_amount)}</span>
                  </div>
                  <div className="flex justify-between font-medium text-lg pt-2 border-t mt-2 text-[color:var(--brand)]">
                    <span>Total Estimated Fee</span>
                    <span>{formatCurrency(previewTotals.total)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                Configure settings to see preview...
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
