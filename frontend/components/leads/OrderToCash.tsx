'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiFetch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, Plus, Receipt, CheckCircle, XCircle, ArrowRight, Loader2, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useNumberFormat } from '@/lib/hooks/use-number-format';
import { Modal } from '@/components/ui/modal';

export function OrderToCash({ leadId }: { leadId: string | number }) {
  const qc = useQueryClient();
  const { formatCurrency } = useNumberFormat();
  
  const [showQModal, setShowQModal] = useState(false);
  const [savingQ, setSavingQ] = useState(false);
  const [qForm, setQForm] = useState({
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    currency: 'USD',
    description: 'Platform Subscription',
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
    try {
      const payload = {
        valid_until: qForm.valid_until,
        currency: qForm.currency,
        items: [
          {
            description: qForm.description,
            quantity: qForm.quantity,
            unit_price: qForm.unit_price,
            tax_amount: 0
          }
        ]
      };
      const res = await apiFetch(`/leads/${leadId}/quotations`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to create quotation');
      qc.invalidateQueries({ queryKey: ['lead-quotations', leadId] });
      setShowQModal(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingQ(false);
    }
  };

  const updateQuotationStatus = async (id: number, action: 'accept' | 'reject') => {
    try {
      const res = await apiFetch(`/quotations/${id}/${action}`, { method: 'POST' });
      if (!res.ok) throw new Error(`Failed to ${action} quotation`);
      
      if (action === 'accept') {
        await apiFetch(`/quotations/${id}/convert`, { method: 'POST' });
      }
      
      qc.invalidateQueries({ queryKey: ['lead-quotations', leadId] });
      qc.invalidateQueries({ queryKey: ['lead-sales-orders', leadId] });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const renderStatus = (status: string) => {
    if (status === 'draft') return <Badge variant="neutral">Draft</Badge>;
    if (status === 'sent') return <Badge variant="info">Sent</Badge>;
    if (status === 'accepted') return <Badge variant="success">Accepted</Badge>;
    if (status === 'rejected') return <Badge variant="danger">Rejected</Badge>;
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
                Quotations
              </CardTitle>
              <CardDescription>Generated proposals for this lead.</CardDescription>
            </div>
            <Button size="sm" onClick={() => setShowQModal(true)}>
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
                        <p className="text-xs text-muted-foreground mt-0.5">Valid until {new Date(q.valid_until).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold tabular-nums">{formatCurrency(q.total_amount)}</p>
                        <div className="mt-1">{renderStatus(q.status)}</div>
                      </div>
                    </div>
                    
                    {['draft', 'sent'].includes(q.status) && (
                      <div className="flex gap-2 pt-2 border-t border-border">
                        <Button size="sm" variant="outline" className="flex-1 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => updateQuotationStatus(q.id, 'accept')}>
                          <CheckCircle className="h-4 w-4 mr-1.5" /> Accept & Convert
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => updateQuotationStatus(q.id, 'reject')}>
                          <XCircle className="h-4 w-4 mr-1.5" /> Reject
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sales Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-green-500" />
              Sales Orders
            </CardTitle>
            <CardDescription>Confirmed orders and revenue realization.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingSO ? (
              <div className="flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : salesOrders.length === 0 ? (
              <div className="text-center p-6 border border-dashed rounded-lg text-sm text-muted-foreground">
                No sales orders yet. Accept a quotation to generate one.
              </div>
            ) : (
              <div className="space-y-4">
                {salesOrders.map((so: any) => (
                  <div key={so.id} className="p-4 rounded-xl border border-green-500/30 bg-green-500/5 shadow-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm">{so.order_number}</p>
                          {so.is_renewal ? <Badge variant="warning" className="text-[10px]">Renewal</Badge> : <Badge variant="success" className="text-[10px]">New Business</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">Date: {new Date(so.order_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                        {so.quotation && (
                          <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                            <ArrowRight className="h-3 w-3" /> From {so.quotation.quotation_number}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold tabular-nums text-green-700">{formatCurrency(so.total_amount)}</p>
                        <div className="mt-1">
                          {so.status === 'confirmed' ? <Badge variant="success">Confirmed</Badge> : <Badge>{so.status}</Badge>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>

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
            <div className="grid grid-cols-2 gap-4">
              <div>
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
              <div>
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
    </div>
  );
}
