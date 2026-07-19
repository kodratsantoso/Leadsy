'use client';
 
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiFetch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, Plus, Receipt, CheckCircle, XCircle, ArrowRight, Loader2, DollarSign, AlertCircle, Trash2, Copy, Layers } from 'lucide-react';
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
  
  // Tab state inside modal
  const [activeTab, setActiveTab] = useState<'primary' | 'commercial' | 'items' | 'terms' | 'summary'>('primary');
 
  // Fetch products
  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: () => apiFetch('/products').then(r => r.json()),
  });
  const products = productsData?.data || [];
 
  // Fetch assignable users
  const { data: usersData } = useQuery({
    queryKey: ['assignable-users'],
    queryFn: () => apiFetch('/leads/assignable-users').then(r => r.json()),
  });
  const assignableUsers = usersData?.data || [];
 
  // Fetch lead data for contacts & details
  const { data: leadDataQuery } = useQuery({
    queryKey: ['lead', leadId],
    queryFn: () => apiFetch(`/leads/${leadId}`).then(r => r.json()),
  });
  const leadObj = leadDataQuery?.data || {};
  const contacts = leadObj.contacts || [];
 
  const [qForm, setQForm] = useState({
    quotation_type: 'new',
    quotation_date: new Date().toISOString().split('T')[0],
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    customer_name: '',
    billing_entity: '',
    contact_id: '',
    sales_owner_id: '',
    presales_owner_id: '',
    payment_terms: 'Net 30',
    billing_frequency: 'monthly',
    contract_start_date: '',
    contract_end_date: '',
    expected_close_date: '',
    probability: 80,
    forecast_type: 'Pipeline',
    tax_included: false,
    header_discount_type: 'none',
    header_discount_value: 0,
    other_cost: 0,
    scope_of_work: '',
    exclusions: '',
    delivery_timeline: '',
    warranty_support_terms: '',
    customer_notes: '',
    internal_notes: '',
    approval_status: 'not_required',
    terms_conditions: '',
    items: [
      {
        product_id: '',
        item_name: 'Platform Subscription',
        description: 'Platform Access License',
        quantity: 1,
        unit: 'license',
        unit_price: 0,
        billing_period: 'monthly',
        line_discount_type: 'none',
        line_discount_value: 0,
        tax_code: 'VAT',
        tax_rate: 0,
      }
    ]
  });
 
  useEffect(() => {
    if (leadObj && showQModal) {
      setQForm(prev => ({
        ...prev,
        customer_name: leadObj.company_name || '',
        sales_owner_id: String(leadObj.owner_id || ''),
      }));
    }
  }, [leadObj, showQModal]);
 
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
 
  const calculateFrontendSummary = () => {
    let subtotal = 0;
    let totalLineDiscount = 0;
    let totalTax = 0;
 
    const itemsCalculated = qForm.items.map(item => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unit_price) || 0;
      const discVal = Number(item.line_discount_value) || 0;
      const taxRate = Number(item.tax_rate) || 0;
 
      const baseAmount = qty * price;
      let lineDiscountAmount = 0;
      if (item.line_discount_type === 'percentage') {
        lineDiscountAmount = baseAmount * (discVal / 100);
      } else if (item.line_discount_type === 'amount') {
        lineDiscountAmount = discVal;
      }
 
      const taxableAmount = baseAmount - lineDiscountAmount;
      const lineTaxAmount = taxableAmount * (taxRate / 100);
      const lineTotal = taxableAmount + lineTaxAmount;
 
      subtotal += baseAmount;
      totalLineDiscount += lineDiscountAmount;
      totalTax += lineTaxAmount;
 
      return {
        ...item,
        line_subtotal: baseAmount,
        line_discount_amount: lineDiscountAmount,
        line_tax_amount: lineTaxAmount,
        line_total: lineTotal
      };
    });
 
    const taxableSubtotal = subtotal - totalLineDiscount;
    let headerDiscountAmount = 0;
    if (qForm.header_discount_type === 'percentage') {
      headerDiscountAmount = taxableSubtotal * (Number(qForm.header_discount_value) / 100);
    } else if (qForm.header_discount_type === 'amount') {
      headerDiscountAmount = Number(qForm.header_discount_value) || 0;
    }
 
    const otherCost = Number(qForm.other_cost) || 0;
    const grandTotal = subtotal - totalLineDiscount - headerDiscountAmount + totalTax + otherCost;
 
    return {
      subtotal,
      totalLineDiscount,
      headerDiscountAmount,
      totalTax,
      grandTotal: Math.max(0, grandTotal),
      items: itemsCalculated
    };
  };
 
  const summary = calculateFrontendSummary();
 
  const createQuotation = async () => {
    setSavingQ(true);
    setErrorMessage(null);
    try {
      const payload = {
        ...qForm,
        contact_id: qForm.contact_id ? Number(qForm.contact_id) : null,
        sales_owner_id: qForm.sales_owner_id ? Number(qForm.sales_owner_id) : null,
        presales_owner_id: qForm.presales_owner_id ? Number(qForm.presales_owner_id) : null,
        probability: qForm.probability ? Number(qForm.probability) : null,
        header_discount_value: Number(qForm.header_discount_value) || 0,
        other_cost: Number(qForm.other_cost) || 0,
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
 
  const handleProductSelect = (index: number, productId: string) => {
    const prod = products.find((p: any) => String(p.id) === productId);
    if (prod) {
      const newItems = [...qForm.items];
      newItems[index] = {
        ...newItems[index],
        product_id: productId,
        item_name: prod.name,
        description: prod.description || '',
        unit_price: Number(prod.base_price || 0)
      };
      setQForm({ ...qForm, items: newItems });
    }
  };
 
  const addLineItem = () => {
    setQForm({
      ...qForm,
      items: [
        ...qForm.items,
        {
          product_id: '',
          item_name: 'Custom Item',
          description: '',
          quantity: 1,
          unit: 'license',
          unit_price: 0,
          billing_period: 'monthly',
          line_discount_type: 'none',
          line_discount_value: 0,
          tax_code: 'VAT',
          tax_rate: 0,
        }
      ]
    });
  };
 
  const removeLineItem = (index: number) => {
    if (qForm.items.length <= 1) return;
    const newItems = qForm.items.filter((_, i) => i !== index);
    setQForm({ ...qForm, items: newItems });
  };
 
  const duplicateLineItem = (index: number) => {
    const itemToCopy = qForm.items[index];
    setQForm({
      ...qForm,
      items: [...qForm.items, { ...itemToCopy }]
    });
  };
 
  const clearAllItems = () => {
    setQForm({
      ...qForm,
      items: [
        {
          product_id: '',
          item_name: 'Custom Item',
          description: '',
          quantity: 1,
          unit: 'license',
          unit_price: 0,
          billing_period: 'monthly',
          line_discount_type: 'none',
          line_discount_value: 0,
          tax_code: 'VAT',
          tax_rate: 0,
        }
      ]
    });
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
        
        {/* Quotations Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                Quotations / Estimates
              </CardTitle>
              <CardDescription>Generated NetSuite-style commercial proposals.</CardDescription>
            </div>
            <Button size="sm" onClick={() => { setErrorMessage(null); setActiveTab('primary'); setShowQModal(true); }}>
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
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm">{q.quotation_number}</p>
                          <Badge variant="outline" className="text-[10px] capitalize">{q.quotation_type}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Date: {new Date(q.quotation_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </p>
                        {q.valid_until && (
                          <p className="text-xs text-muted-foreground">
                            Valid until: {new Date(q.valid_until).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </p>
                        )}
                        {q.sales_owner && (
                          <p className="text-[10px] text-muted-foreground mt-1">
                            Sales Owner: {q.sales_owner.name}
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
                          <Button size="xs" variant="outline" className="text-blue-600 hover:bg-blue-50" onClick={() => updateQuotationStatus(q.id, 'submitted')}>
                            Submit
                          </Button>
                          <Button size="xs" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => updateQuotationStatus(q.id, 'cancelled')}>
                            Cancel
                          </Button>
                        </>
                      )}
                      
                      {q.quotation_status === 'submitted' && (
                        <>
                          <Button size="xs" variant="outline" className="text-green-600 hover:bg-green-50" onClick={() => updateQuotationStatus(q.id, 'approved')}>
                            Approve
                          </Button>
                          <Button size="xs" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => updateQuotationStatus(q.id, 'rejected')}>
                            Reject
                          </Button>
                          <Button size="xs" variant="outline" className="text-neutral-600 hover:bg-neutral-50" onClick={() => updateQuotationStatus(q.id, 'cancelled')}>
                            Cancel
                          </Button>
                        </>
                      )}
 
                      {q.quotation_status === 'approved' && (
                        <>
                          <Button size="xs" variant="outline" className="text-blue-600 hover:bg-blue-50" onClick={() => updateQuotationStatus(q.id, 'sent')}>
                            Mark Sent
                          </Button>
                          <Button size="xs" variant="outline" className="text-green-600 hover:bg-green-50" onClick={() => convertQuotationToSO(q.id)}>
                            Convert to SO
                          </Button>
                          <Button size="xs" variant="outline" className="text-neutral-600 hover:bg-neutral-50" onClick={() => updateQuotationStatus(q.id, 'cancelled')}>
                            Cancel
                          </Button>
                        </>
                      )}
 
                      {q.quotation_status === 'sent' && (
                        <>
                          <Button size="xs" variant="outline" className="text-green-600 hover:bg-green-50" onClick={() => updateQuotationStatus(q.id, 'accepted')}>
                            Mark Accepted
                          </Button>
                          <Button size="xs" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => updateQuotationStatus(q.id, 'cancelled')}>
                            Cancel
                          </Button>
                        </>
                      )}
 
                      {q.quotation_status === 'accepted' && (
                        <>
                          <Button size="xs" variant="outline" className="text-green-600 hover:bg-green-50" onClick={() => convertQuotationToSO(q.id)}>
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
 
        {/* Sales Orders Card */}
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
 
      {/* Enterprise-Style NetSuite-Inspired Quotation Creation Modal */}
      {showQModal && (
        <Modal
          open={showQModal}
          onOpenChange={(v) => !v && setShowQModal(false)}
          title="Create Estimate / Quotation"
          description="Draft a NetSuite-style detailed commercial proposal."
          size="xl"
          footer={
            <div className="flex justify-between w-full items-center">
              <div className="text-sm font-bold text-blue-700">
                Grand Total: {formatCurrency(summary.grandTotal)}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowQModal(false)}>Cancel</Button>
                <Button onClick={createQuotation} disabled={savingQ}>
                  {savingQ && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                  Save as Draft
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-4">
            {errorMessage && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 border border-red-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
 
            {/* Pill-based sub navigation inside modal */}
            <div className="flex border-b border-border pb-1 gap-1">
              <button 
                type="button"
                onClick={() => setActiveTab('primary')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${activeTab === 'primary' ? 'bg-blue-600 text-white' : 'hover:bg-muted text-muted-foreground'}`}
              >
                1. Primary Info
              </button>
              <button 
                type="button"
                onClick={() => setActiveTab('commercial')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${activeTab === 'commercial' ? 'bg-blue-600 text-white' : 'hover:bg-muted text-muted-foreground'}`}
              >
                2. Commercial Info
              </button>
              <button 
                type="button"
                onClick={() => setActiveTab('items')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${activeTab === 'items' ? 'bg-blue-600 text-white' : 'hover:bg-muted text-muted-foreground'}`}
              >
                3. Line Items ({qForm.items.length})
              </button>
              <button 
                type="button"
                onClick={() => setActiveTab('terms')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${activeTab === 'terms' ? 'bg-blue-600 text-white' : 'hover:bg-muted text-muted-foreground'}`}
              >
                4. Terms & Exclusions
              </button>
              <button 
                type="button"
                onClick={() => setActiveTab('summary')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${activeTab === 'summary' ? 'bg-blue-600 text-white' : 'hover:bg-muted text-muted-foreground'}`}
              >
                5. Review Summary
              </button>
            </div>
 
            <div className="min-h-[300px] py-2">
              
              {/* Tab 1: Primary Information */}
              {activeTab === 'primary' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Quotation Number (Auto)</label>
                    <Input value="[Auto-Generated on Save]" disabled className="bg-muted" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Quotation Type</label>
                    <select 
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={qForm.quotation_type} 
                      onChange={e => setQForm({...qForm, quotation_type: e.target.value})}
                    >
                      <option value="new">New Contract</option>
                      <option value="renewal">Renewal</option>
                      <option value="expansion">Expansion</option>
                      <option value="upsell">Upsell</option>
                      <option value="cross-sell">Cross-sell</option>
                      <option value="add-on">Add-on</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Quotation Date</label>
                    <Input type="date" value={qForm.quotation_date} onChange={e => setQForm({...qForm, quotation_date: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Valid Until</label>
                    <Input type="date" value={qForm.valid_until} onChange={e => setQForm({...qForm, valid_until: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Customer Company Name</label>
                    <Input value={qForm.customer_name} onChange={e => setQForm({...qForm, customer_name: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Billing Entity Name</label>
                    <Input placeholder="Acme Billing LLC" value={qForm.billing_entity} onChange={e => setQForm({...qForm, billing_entity: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Contact Person</label>
                    <select 
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={qForm.contact_id} 
                      onChange={e => setQForm({...qForm, contact_id: e.target.value})}
                    >
                      <option value="">-- Select Contact --</option>
                      {contacts.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name} ({c.title || 'No Title'})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Sales Owner</label>
                    <select 
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={qForm.sales_owner_id} 
                      onChange={e => setQForm({...qForm, sales_owner_id: e.target.value})}
                    >
                      <option value="">-- Select Sales Owner --</option>
                      {assignableUsers.map((u: any) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Presales / Solution Architect Owner</label>
                    <select 
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={qForm.presales_owner_id} 
                      onChange={e => setQForm({...qForm, presales_owner_id: e.target.value})}
                    >
                      <option value="">-- None --</option>
                      {assignableUsers.map((u: any) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Forecast Type</label>
                        <select 
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={qForm.forecast_type} 
                          onChange={e => setQForm({...qForm, forecast_type: e.target.value})}
                        >
                          <option value="Omitted">Omitted</option>
                          <option value="Pipeline">Pipeline</option>
                          <option value="Best Case">Best Case</option>
                          <option value="Commit">Commit</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Deal Probability (%)</label>
                        <Input type="number" min="0" max="100" value={qForm.probability} onChange={e => setQForm({...qForm, probability: Number(e.target.value)})} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
 
              {/* Tab 2: Commercial Information */}
              {activeTab === 'commercial' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Payment Terms</label>
                    <select 
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={qForm.payment_terms} 
                      onChange={e => setQForm({...qForm, payment_terms: e.target.value})}
                    >
                      <option value="Due on Receipt">Due on Receipt</option>
                      <option value="Net 7">Net 7</option>
                      <option value="Net 14">Net 14</option>
                      <option value="Net 30">Net 30</option>
                      <option value="50% DP / 50% After Delivery">50% DP / 50% After Delivery</option>
                      <option value="Annual Upfront">Annual Upfront</option>
                      <option value="Monthly Billing">Monthly Billing</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Billing Frequency</label>
                    <select 
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={qForm.billing_frequency} 
                      onChange={e => setQForm({...qForm, billing_frequency: e.target.value})}
                    >
                      <option value="one_time">One-Time</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Contract Start Date</label>
                    <Input type="date" value={qForm.contract_start_date} onChange={e => setQForm({...qForm, contract_start_date: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Contract End Date</label>
                    <Input type="date" value={qForm.contract_end_date} onChange={e => setQForm({...qForm, contract_end_date: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Expected Close Date</label>
                    <Input type="date" value={qForm.expected_close_date} onChange={e => setQForm({...qForm, expected_close_date: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Other Shipping / Cost</label>
                    <Input type="number" min="0" value={qForm.other_cost} onChange={e => setQForm({...qForm, other_cost: Number(e.target.value)})} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Header Discount Type</label>
                    <select 
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={qForm.header_discount_type} 
                      onChange={e => setQForm({...qForm, header_discount_type: e.target.value})}
                    >
                      <option value="none">None</option>
                      <option value="amount">Fixed Amount</option>
                      <option value="percentage">Percentage (%)</option>
                    </select>
                  </div>
                  {qForm.header_discount_type !== 'none' && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Header Discount Value</label>
                      <Input type="number" min="0" value={qForm.header_discount_value} onChange={e => setQForm({...qForm, header_discount_value: Number(e.target.value)})} />
                    </div>
                  )}
                  <div className="col-span-2 flex items-center gap-2 pt-2">
                    <input 
                      type="checkbox" 
                      id="tax_included" 
                      checked={qForm.tax_included} 
                      onChange={e => setQForm({...qForm, tax_included: e.target.checked})}
                      className="rounded border-input text-blue-600 focus:ring-blue-500" 
                    />
                    <label htmlFor="tax_included" className="text-xs font-semibold text-muted-foreground">Tax Included in Prices</label>
                  </div>
                </div>
              )}
 
              {/* Tab 3: Line Items */}
              {activeTab === 'items' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-semibold text-muted-foreground">Product & Service Line Items</h3>
                    <div className="flex gap-2">
                      <Button size="xs" variant="outline" onClick={clearAllItems} className="text-red-600 border-red-200">
                        Clear All
                      </Button>
                      <Button size="xs" onClick={addLineItem}>
                        <Plus className="h-3 w-3 mr-1" /> Add Line
                      </Button>
                    </div>
                  </div>
 
                  <div className="border border-border rounded-lg overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-muted/50 border-b border-border">
                          <th className="p-2 font-semibold w-[20%]">Product</th>
                          <th className="p-2 font-semibold w-[20%]">Item Name</th>
                          <th className="p-2 font-semibold w-[8%]">Qty</th>
                          <th className="p-2 font-semibold w-[12%]">Unit Price</th>
                          <th className="p-2 font-semibold w-[15%]">Line Discount</th>
                          <th className="p-2 font-semibold w-[8%]">Tax %</th>
                          <th className="p-2 font-semibold w-[12%] text-right">Total</th>
                          <th className="p-2 font-semibold w-[10%] text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {qForm.items.map((item, index) => {
                          const lineTotal = summary.items[index]?.line_total || 0;
                          return (
                            <tr key={index} className="border-b border-border hover:bg-muted/10">
                              <td className="p-1">
                                <select 
                                  className="w-full rounded border border-input bg-background p-1 text-xs"
                                  value={item.product_id}
                                  onChange={e => handleProductSelect(index, e.target.value)}
                                >
                                  <option value="">-- Custom --</option>
                                  {products.map((p: any) => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="p-1">
                                <Input 
                                  className="h-8 p-1 text-xs" 
                                  value={item.item_name} 
                                  onChange={e => {
                                    const newItems = [...qForm.items];
                                    newItems[index].item_name = e.target.value;
                                    setQForm({...qForm, items: newItems});
                                  }} 
                                />
                              </td>
                              <td className="p-1">
                                <Input 
                                  className="h-8 p-1 text-xs" 
                                  type="number" 
                                  min="0.01" 
                                  value={item.quantity} 
                                  onChange={e => {
                                    const newItems = [...qForm.items];
                                    newItems[index].quantity = Number(e.target.value);
                                    setQForm({...qForm, items: newItems});
                                  }} 
                                />
                              </td>
                              <td className="p-1">
                                <Input 
                                  className="h-8 p-1 text-xs" 
                                  type="number" 
                                  min="0" 
                                  value={item.unit_price} 
                                  onChange={e => {
                                    const newItems = [...qForm.items];
                                    newItems[index].unit_price = Number(e.target.value);
                                    setQForm({...qForm, items: newItems});
                                  }} 
                                />
                              </td>
                              <td className="p-1">
                                <div className="flex gap-1">
                                  <select 
                                    className="rounded border border-input bg-background p-0.5 text-[10px]"
                                    value={item.line_discount_type}
                                    onChange={e => {
                                      const newItems = [...qForm.items];
                                      newItems[index].line_discount_type = e.target.value;
                                      setQForm({...qForm, items: newItems});
                                    }}
                                  >
                                    <option value="none">None</option>
                                    <option value="amount">Value</option>
                                    <option value="percentage">%</option>
                                  </select>
                                  {item.line_discount_type !== 'none' && (
                                    <Input 
                                      className="h-8 p-1 text-xs w-[60px]" 
                                      type="number" 
                                      value={item.line_discount_value} 
                                      onChange={e => {
                                        const newItems = [...qForm.items];
                                        newItems[index].line_discount_value = Number(e.target.value);
                                        setQForm({...qForm, items: newItems});
                                      }} 
                                    />
                                  )}
                                </div>
                              </td>
                              <td className="p-1">
                                <Input 
                                  className="h-8 p-1 text-xs" 
                                  type="number" 
                                  min="0" 
                                  value={item.tax_rate} 
                                  onChange={e => {
                                    const newItems = [...qForm.items];
                                    newItems[index].tax_rate = Number(e.target.value);
                                    setQForm({...qForm, items: newItems});
                                  }} 
                                />
                              </td>
                              <td className="p-1 text-right font-medium tabular-nums">
                                {formatCurrency(lineTotal)}
                              </td>
                              <td className="p-1">
                                <div className="flex justify-center gap-1">
                                  <Button size="xs" variant="outline" className="h-7 w-7 p-0" onClick={() => duplicateLineItem(index)}>
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                  <Button size="xs" variant="outline" className="h-7 w-7 p-0 text-red-600" disabled={qForm.items.length <= 1} onClick={() => removeLineItem(index)}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
 
              {/* Tab 4: Terms & Notes */}
              {activeTab === 'terms' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Terms & Conditions</label>
                    <textarea 
                      className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={qForm.terms_conditions} 
                      onChange={e => setQForm({...qForm, terms_conditions: e.target.value})}
                      placeholder="e.g. 30 days validity, delivery within 2 weeks"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Scope of Work</label>
                    <textarea 
                      className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={qForm.scope_of_work} 
                      onChange={e => setQForm({...qForm, scope_of_work: e.target.value})}
                      placeholder="Project milestones, user setup..."
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Exclusions</label>
                    <textarea 
                      className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={qForm.exclusions} 
                      onChange={e => setQForm({...qForm, exclusions: e.target.value})}
                      placeholder="Server infrastructure, custom theme development..."
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Customer Notes (Shown on PDF)</label>
                    <textarea 
                      className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={qForm.customer_notes} 
                      onChange={e => setQForm({...qForm, customer_notes: e.target.value})}
                      placeholder="Thank you for your business!"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Internal Notes (Hidden)</label>
                    <textarea 
                      className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={qForm.internal_notes} 
                      onChange={e => setQForm({...qForm, internal_notes: e.target.value})}
                      placeholder="Follow up priority high..."
                    />
                  </div>
                </div>
              )}
 
              {/* Tab 5: Review Summary */}
              {activeTab === 'summary' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground border-b pb-1">Summary Audit Sheet</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2 border-r pr-6">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Quotation Type:</span>
                        <span className="font-bold text-foreground capitalize">{qForm.quotation_type}</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Quotation Date:</span>
                        <span className="font-bold text-foreground">{qForm.quotation_date}</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Valid Until / Expiration:</span>
                        <span className="font-bold text-foreground">{qForm.valid_until}</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Company Name Snapshot:</span>
                        <span className="font-bold text-foreground">{qForm.customer_name}</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Terms:</span>
                        <span className="font-bold text-foreground">{qForm.payment_terms}</span>
                      </div>
                    </div>
 
                    <div className="space-y-3">
                      <div className="flex justify-between text-xs font-medium text-muted-foreground">
                        <span>Subtotal:</span>
                        <span className="tabular-nums font-bold text-foreground">{formatCurrency(summary.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-xs font-medium text-muted-foreground">
                        <span>Line Discounts Total:</span>
                        <span className="tabular-nums font-bold text-red-600">-{formatCurrency(summary.totalLineDiscount)}</span>
                      </div>
                      <div className="flex justify-between text-xs font-medium text-muted-foreground">
                        <span>Header Discount Amount:</span>
                        <span className="tabular-nums font-bold text-red-600">-{formatCurrency(summary.headerDiscountAmount)}</span>
                      </div>
                      <div className="flex justify-between text-xs font-medium text-muted-foreground">
                        <span>Estimated Tax (VAT/PPN):</span>
                        <span className="tabular-nums font-bold text-foreground">+{formatCurrency(summary.totalTax)}</span>
                      </div>
                      {qForm.other_cost > 0 && (
                        <div className="flex justify-between text-xs font-medium text-muted-foreground">
                          <span>Other Cost:</span>
                          <span className="tabular-nums font-bold text-foreground">+{formatCurrency(qForm.other_cost)}</span>
                        </div>
                      )}
                      <div className="border-t border-border pt-2 flex justify-between text-sm font-bold text-blue-700 dark:text-blue-400">
                        <span>Grand Total Amount:</span>
                        <span className="tabular-nums text-lg">{formatCurrency(summary.grandTotal)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
 
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
