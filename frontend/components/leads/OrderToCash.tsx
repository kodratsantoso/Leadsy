'use client';
 
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiFetch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, Plus, Receipt, CheckCircle, XCircle, ArrowRight, Loader2, DollarSign, AlertCircle, Ban } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useNumberFormat } from '@/lib/hooks/use-number-format';
import { Modal } from '@/components/ui/modal';
 
export function OrderToCash({ leadId }: { leadId: string | number }) {
  const qc = useQueryClient();
  const { formatCurrency } = useNumberFormat();
  
  const [showQModal, setShowQModal] = useState(false);
  const [showSOModal, setShowSOModal] = useState(false);
  
  const [savingQ, setSavingQ] = useState(false);
  const [savingSO, setSavingSO] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
 
  const [qForm, setQForm] = useState({
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    quotation_type: 'new',
    description: 'Platform Subscription',
    quantity: 1,
    unit_price: 0,
  });
 
  const [soForm, setSoForm] = useState({
    order_date: new Date().toISOString().split('T')[0],
    order_type: 'new',
    description: 'Platform Subscription Direct',
    quantity: 1,
    unit_price: 0,
  });
 
  const { data: qData, isLoading: loadingQ } = useQuery({
    queryKey: ['lead-quotations', leadId],
    queryFn: () => apiFetch(`/leads/${leadId}/quotations`).then(r => r.json()),
  });
 
  const { data: soData, isLoading: loadingSO } = useQuery({
    queryKey: ['lead-sales-orders', leadId],
    queryFn: () => apiFetch(`/leads/${leadId}/sales-orders`).then(r => r.json()),
  });
 
  const quotations = qData?.data || [];
  const salesOrders = soData?.data || [];
 
  const createQuotation = async () => {
    setSavingQ(true);
    setErrorMessage(null);
    try {
      const payload = {
        quotation_type: qForm.quotation_type,
        quotation_date: new Date().toISOString().split('T')[0],
        valid_until: qForm.valid_until,
        items: [
          {
            item_name: qForm.description,
            description: qForm.description,
            quantity: qForm.quantity,
            unit_price: qForm.unit_price,
            discount_amount: 0,
            tax_amount: 0,
            billing_period: 'monthly'
          }
        ]
      };
      const res = await apiFetch(`/leads/${leadId}/quotations`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to create quotation');
      }
      qc.invalidateQueries({ queryKey: ['lead-quotations', leadId] });
      setShowQModal(false);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSavingQ(false);
    }
  };
 
  const createSalesOrderDirect = async () => {
    setSavingSO(true);
    setErrorMessage(null);
    try {
      const payload = {
        order_type: soForm.order_type,
        order_date: soForm.order_date,
        items: [
          {
            item_name: soForm.description,
            description: soForm.description,
            quantity: soForm.quantity,
            unit_price: soForm.unit_price,
            discount_amount: 0,
            tax_amount: 0,
            billing_period: 'monthly'
          }
        ]
      };
      const res = await apiFetch(`/leads/${leadId}/sales-orders`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to create sales order');
      }
      qc.invalidateQueries({ queryKey: ['lead-sales-orders', leadId] });
      setShowSOModal(false);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSavingSO(false);
    }
  };
 
  const updateQuotationStatus = async (id: number, targetStatus: string) => {
    try {
      const res = await apiFetch(`/quotations/${id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status: targetStatus })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Failed to change quotation status to ${targetStatus}`);
      }
      qc.invalidateQueries({ queryKey: ['lead-quotations', leadId] });
    } catch (err: any) {
      alert(err.message);
    }
  };
 
  const convertQuotationToSO = async (id: number) => {
    try {
      const res = await apiFetch(`/quotations/${id}/convert-to-sales-order`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to convert quotation');
      }
      qc.invalidateQueries({ queryKey: ['lead-quotations', leadId] });
      qc.invalidateQueries({ queryKey: ['lead-sales-orders', leadId] });
    } catch (err: any) {
      alert(err.message);
    }
  };
 
  const updateSalesOrderStatus = async (id: number, action: 'confirm' | 'cancel' | 'close') => {
    try {
      const res = await apiFetch(`/sales-orders/${id}/${action}`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Failed to ${action} sales order`);
      }
      qc.invalidateQueries({ queryKey: ['lead-sales-orders', leadId] });
    } catch (err: any) {
      alert(err.message);
    }
  };
 
  const renderQuotationStatus = (status: string) => {
    const val = status.toLowerCase();
    if (val === 'draft') return <Badge variant="neutral">Draft</Badge>;
    if (val === 'submitted') return <Badge variant="info">Submitted</Badge>;
    if (val === 'approved') return <Badge variant="success">Approved</Badge>;
    if (val === 'rejected') return <Badge variant="danger">Rejected</Badge>;
    if (val === 'sent') return <Badge variant="info">Sent</Badge>;
    if (val === 'accepted') return <Badge variant="success">Accepted</Badge>;
    if (val === 'converted') return <Badge variant="success">Converted</Badge>;
    if (val === 'expired') return <Badge variant="danger">Expired</Badge>;
    if (val === 'cancelled') return <Badge variant="neutral">Cancelled</Badge>;
    return <Badge>{status}</Badge>;
  };
 
  const renderSalesOrderStatus = (status: string) => {
    const val = status.toLowerCase();
    if (val === 'draft') return <Badge variant="neutral">Draft</Badge>;
    if (val === 'confirmed') return <Badge variant="success">Confirmed</Badge>;
    if (val === 'fulfilled') return <Badge variant="info">Fulfilled</Badge>;
    if (val === 'closed') return <Badge variant="neutral">Closed</Badge>;
    if (val === 'cancelled') return <Badge variant="danger">Cancelled</Badge>;
    return <Badge>{status}</Badge>;
  };
 
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        
        {/* Quotations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                Quotations / Estimates
              </CardTitle>
              <CardDescription>Generated proposals for this lead.</CardDescription>
            </div>
            <Button size="sm" onClick={() => { setErrorMessage(null); setShowQModal(true); }}>
              <Plus className="h-4 w-4 mr-1.5" />
              New Quotation
            </Button>
          </CardHeader>
          <CardContent>
            {loadingQ ? (
              <div className="flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : quotations.length === 0 ? (
              <div className="text-center p-6 border border-dashed rounded-lg text-sm text-muted-foreground">
                No quotations created yet.
              </div>
            ) : (
              <div className="space-y-4">
                {quotations.map((q: any) => (
                  <div key={q.id} className="p-4 rounded-xl border border-border bg-card shadow-sm space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-sm">{q.quotation_number}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Date: {new Date(q.quotation_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </p>
                        {q.valid_until && (
                          <p className="text-xs text-muted-foreground">
                            Valid until: {new Date(q.valid_until).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold tabular-nums">{formatCurrency(Number(q.total_amount))}</p>
                        <div className="mt-1">{renderQuotationStatus(q.quotation_status || 'draft')}</div>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                      {q.quotation_status === 'draft' && (
                        <>
                          <Button size="xs" variant="outline" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => updateQuotationStatus(q.id, 'submitted')}>
                            Submit
                          </Button>
                          <Button size="xs" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => updateQuotationStatus(q.id, 'cancelled')}>
                            Cancel
                          </Button>
                        </>
                      )}
                      
                      {q.quotation_status === 'submitted' && (
                        <>
                          <Button size="xs" variant="outline" className="text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => updateQuotationStatus(q.id, 'approved')}>
                            Approve
                          </Button>
                          <Button size="xs" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => updateQuotationStatus(q.id, 'rejected')}>
                            Reject
                          </Button>
                          <Button size="xs" variant="outline" className="text-neutral-600 hover:bg-neutral-50" onClick={() => updateQuotationStatus(q.id, 'cancelled')}>
                            Cancel
                          </Button>
                        </>
                      )}
 
                      {q.quotation_status === 'approved' && (
                        <>
                          <Button size="xs" variant="outline" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => updateQuotationStatus(q.id, 'sent')}>
                            Mark Sent
                          </Button>
                          <Button size="xs" variant="outline" className="text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => convertQuotationToSO(q.id)}>
                            Convert to SO
                          </Button>
                          <Button size="xs" variant="outline" className="text-neutral-600 hover:bg-neutral-50" onClick={() => updateQuotationStatus(q.id, 'cancelled')}>
                            Cancel
                          </Button>
                        </>
                      )}
 
                      {q.quotation_status === 'sent' && (
                        <>
                          <Button size="xs" variant="outline" className="text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => updateQuotationStatus(q.id, 'accepted')}>
                            Mark Accepted
                          </Button>
                          <Button size="xs" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => updateQuotationStatus(q.id, 'cancelled')}>
                            Cancel
                          </Button>
                        </>
                      )}
 
                      {q.quotation_status === 'accepted' && (
                        <>
                          <Button size="xs" variant="outline" className="text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => convertQuotationToSO(q.id)}>
                            Convert to SO
                          </Button>
                          <Button size="xs" variant="outline" className="text-neutral-600 hover:bg-neutral-50" onClick={() => updateQuotationStatus(q.id, 'cancelled')}>
                            Cancel
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
 
        {/* Sales Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-green-500" />
                Sales Orders
              </CardTitle>
              <CardDescription>Confirmed commercial value and bookings.</CardDescription>
            </div>
            <Button size="sm" variant="outline" className="border-green-500/30 text-green-700 hover:bg-green-50" onClick={() => { setErrorMessage(null); setShowSOModal(true); }}>
              <Plus className="h-4 w-4 mr-1.5" />
              New Sales Order
            </Button>
          </CardHeader>
          <CardContent>
            {loadingSO ? (
              <div className="flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : salesOrders.length === 0 ? (
              <div className="text-center p-6 border border-dashed rounded-lg text-sm text-muted-foreground">
                No sales orders created yet.
              </div>
            ) : (
              <div className="space-y-4">
                {salesOrders.map((so: any) => (
                  <div key={so.id} className="p-4 rounded-xl border border-green-500/30 bg-green-500/5 shadow-sm space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm">{so.sales_order_number}</p>
                          <Badge variant="outline" className="text-[10px] capitalize">{so.order_type}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Order Date: {new Date(so.order_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </p>
                        {so.quotation_id && (
                          <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                            <ArrowRight className="h-3 w-3" /> From Quotation ID: {so.quotation_id}
                          </p>
                        )}
                        {!so.quotation_id && (
                          <p className="text-[10px] text-yellow-600 dark:text-yellow-500 mt-1 font-medium">
                            Created directly without quotation
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold tabular-nums text-green-700">{formatCurrency(Number(so.total_amount))}</p>
                        <div className="mt-1">{renderSalesOrderStatus(so.order_status || 'draft')}</div>
                      </div>
                    </div>
 
                    <div className="flex gap-2 pt-2 border-t border-green-500/10">
                      {so.order_status === 'draft' && (
                        <>
                          <Button size="xs" variant="outline" className="text-green-600 hover:bg-green-100/50" onClick={() => updateSalesOrderStatus(so.id, 'confirm')}>
                            Confirm Order
                          </Button>
                          <Button size="xs" variant="outline" className="text-red-600 hover:bg-red-100/50" onClick={() => updateSalesOrderStatus(so.id, 'cancel')}>
                            Cancel
                          </Button>
                        </>
                      )}
                      {so.order_status === 'confirmed' && (
                        <>
                          <Button size="xs" variant="outline" className="text-neutral-600" onClick={() => updateSalesOrderStatus(so.id, 'close')}>
                            Close Order
                          </Button>
                          <Button size="xs" variant="outline" className="text-red-600 hover:bg-red-100/50" onClick={() => updateSalesOrderStatus(so.id, 'cancel')}>
                            Cancel
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
 
      </div>
 
      {/* Quotation Creation Modal */}
      {showQModal && (
        <Modal
          open={showQModal}
          onOpenChange={(v) => !v && setShowQModal(false)}
          title="Create Quotation"
          description="Draft a new proposal for this lead."
          footer={
            <>
              <Button variant="outline" onClick={() => setShowQModal(false)}>Cancel</Button>
              <Button onClick={createQuotation} disabled={savingQ}>
                {savingQ && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                Generate
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            {errorMessage && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 border border-red-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Quotation Type</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={qForm.quotation_type} 
                  onChange={e => setQForm({...qForm, quotation_type: e.target.value})}
                >
                  <option value="new">New Contract</option>
                  <option value="renewal">Renewal</option>
                  <option value="expansion">Expansion</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
                <Input value={qForm.description} onChange={e => setQForm({...qForm, description: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Valid Until</label>
                <Input type="date" value={qForm.valid_until} onChange={e => setQForm({...qForm, valid_until: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Quantity</label>
                <Input type="number" min="1" value={qForm.quantity} onChange={e => setQForm({...qForm, quantity: Number(e.target.value)})} />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Unit Price (Value)</label>
                <div className="relative">
                  <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="number" min="0" className="pl-9" value={qForm.unit_price} onChange={e => setQForm({...qForm, unit_price: Number(e.target.value)})} />
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
 
      {/* Direct Sales Order Creation Modal */}
      {showSOModal && (
        <Modal
          open={showSOModal}
          onOpenChange={(v) => !v && setShowSOModal(false)}
          title="Create Direct Sales Order"
          description="Draft a confirmed commercial order directly."
          footer={
            <>
              <Button variant="outline" onClick={() => setShowSOModal(false)}>Cancel</Button>
              <Button onClick={createSalesOrderDirect} disabled={savingSO} className="bg-green-600 hover:bg-green-700 text-white">
                {savingSO && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                Generate Order
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 text-yellow-800 dark:text-yellow-400 text-xs rounded-lg flex items-start gap-2 border border-yellow-200 dark:border-yellow-900/30">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block mb-0.5">Direct Order Warning</span>
                Sales Order created directly without source quotation. This will bypass the proposal pipeline phase.
              </div>
            </div>
 
            {errorMessage && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 border border-red-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Order Type</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={soForm.order_type} 
                  onChange={e => setSoForm({...soForm, order_type: e.target.value})}
                >
                  <option value="new">New Business</option>
                  <option value="renewal">Renewal</option>
                  <option value="expansion">Expansion</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Order Date</label>
                <Input type="date" value={soForm.order_date} onChange={e => setSoForm({...soForm, order_date: e.target.value})} />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Item Description</label>
                <Input value={soForm.description} onChange={e => setSoForm({...soForm, description: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Quantity</label>
                <Input type="number" min="1" value={soForm.quantity} onChange={e => setSoForm({...soForm, quantity: Number(e.target.value)})} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Unit Price (Value)</label>
                <div className="relative">
                  <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="number" min="0" className="pl-9" value={soForm.unit_price} onChange={e => setSoForm({...soForm, unit_price: Number(e.target.value)})} />
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
