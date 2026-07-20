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
  const { formatCurrency, formatNumber, formatAmountInput, normalizeAmountInput } = useNumberFormat();
  
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
 
  // Fetch Tax Codes
  const { data: taxCodesData } = useQuery({
    queryKey: ['o2c-tax-codes'],
    queryFn: () => apiFetch('/settings/o2c/tax-codes').then(r => r.json()),
  });
  const taxCodes = taxCodesData?.data || [];
 
  // Fetch Withholding Tax Codes
  const { data: whtCodesData } = useQuery({
    queryKey: ['o2c-withholding-tax-codes'],
    queryFn: () => apiFetch('/settings/o2c/withholding-tax-codes').then(r => r.json()),
  });
  const whtCodes = whtCodesData?.data || [];
 
  // Fetch Item Settings
  const { data: itemSettingsData } = useQuery({
    queryKey: ['o2c-item-settings'],
    queryFn: () => apiFetch('/settings/o2c/item-settings').then(r => r.json()),
  });
  const itemSettings = itemSettingsData?.data || [];
 
  const settingRequireTierObj = itemSettings.find((s: any) => s.setting_key === 'require_product_tier_for_saas_product');
  const settingRequireTier = settingRequireTierObj ? !!settingRequireTierObj.setting_value_json?.enabled : false;
 
  const settingAllowOverrideObj = itemSettings.find((s: any) => s.setting_key === 'allow_price_override');
  const settingAllowOverride = settingAllowOverrideObj ? !!settingAllowOverrideObj.setting_value_json?.enabled : true;
 
  const settingAllowDiscountObj = itemSettings.find((s: any) => s.setting_key === 'allow_discount');
  const settingAllowDiscount = settingAllowDiscountObj ? !!settingAllowDiscountObj.setting_value_json?.enabled : true;
 
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
    header_discount_value: '0',
    other_cost: '0',
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
        product_tier_id: '',
        pricing_model: 'flat_rate',
        price_source: 'manual',
        tax_code_id: '',
        withholding_tax_code_id: '',
        withholding_tax_rate: 0,
        item_name: 'Platform Subscription',
        description: 'Platform Access License',
        quantity: '1',
        unit: 'license',
        unit_price: '0',
        billing_period: 'monthly',
        line_discount_type: 'none',
        line_discount_value: '0',
        tax_code: '',
        tax_rate: 0,
        start_date: '',
        end_date: '',
        duration_value: '',
        duration_unit: 'month',
      }
    ]
  });
 
  useEffect(() => {
    if (leadObj && showQModal) {
      setQForm(prev => ({
        ...prev,
        customer_name: String(leadObj.company_name || ''),
        sales_owner_id: String(leadObj.owner_id || ''),
      }));
    }
  }, [leadObj, showQModal]);

 
  const [soActiveTab, setSoActiveTab] = useState<'primary' | 'sales' | 'classification' | 'items' | 'billing' | 'summary'>('primary');
  const [editingSOId, setEditingSOId] = useState<number | null>(null);

  const [soForm, setSoForm] = useState({
    source_type: 'direct', // 'direct' or 'quotation_conversion'
    quotation_id: '',
    sales_order_number: '',
    order_date: new Date().toISOString().split('T')[0],
    start_date: '',
    end_date: '',
    spk_number: '',
    customer_po_number: '',
    currency_code: 'IDR',
    memo: '',
    
    order_type: 'new', // new, renewal, expansion, upsell, cross_sell, add_on
    sales_owner_id: '',
    presales_owner_id: '',
    account_manager_id: '',
    lead_source: '',
    channel: '',
    expected_fulfillment_date: '',
    sales_effective_date: '',

    department: '',
    cost_center: '',
    location: '',
    industry: '',
    business_category: '',

    payment_terms: 'Net 30',
    billing_frequency: 'monthly',
    delivery_timeline: '',
    fulfillment_notes: '',
    customer_notes: '',
    internal_notes: '',
    terms_conditions: '',

    customer_name: '',
    billing_entity: '',
    contact_id: '',
    tax_included: false,
    header_discount_type: 'none',
    header_discount_value: '0',
    other_cost: '0',
    scope_of_work: '',
    exclusions: '',
    warranty_support_terms: '',

    items: [
      {
        product_id: '',
        product_tier_id: '',
        pricing_model: 'flat_rate',
        price_source: 'manual',
        tax_code_id: '',
        withholding_tax_code_id: '',
        withholding_tax_rate: 0,
        item_name: 'Platform Subscription',
        description: 'Platform Access License',
        quantity: '1',
        unit: 'license',
        unit_price: '0',
        billing_period: 'monthly',
        line_discount_type: 'none',
        line_discount_value: '0',
        tax_code: '',
        tax_rate: 0,
        start_date: '',
        end_date: '',
        duration_value: '',
        duration_unit: 'month',
      }
    ]
  });

  useEffect(() => {
    if (leadObj && showSOModal && !editingSOId) {
      setSoForm(prev => ({
        ...prev,
        customer_name: String(leadObj.company_name || ''),
        sales_owner_id: String(leadObj.owner_id || ''),
        lead_source: String(leadObj.lead_source || ''),
        channel: String(leadObj.channel || ''),
        industry: String(leadObj.industry || ''),
        business_category: String(leadObj.business_category_name || ''),
      }));
    }
  }, [leadObj, showSOModal, editingSOId]);
 
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
 
  const isSaaSProduct = (productId: string) => {
    const prod = products.find((p: any) => String(p.id) === productId);
    return prod && String(prod.category || '').toLowerCase().includes('saas');
  };
 
  const calculateEndDate = (startDateStr: string, durationVal: number, durationUnit: string): string => {
    if (!startDateStr || !durationVal) return '';
    const date = new Date(startDateStr);
    if (isNaN(date.getTime())) return '';
    
    if (durationUnit === 'day') {
      date.setDate(date.getDate() + durationVal);
    } else if (durationUnit === 'month') {
      date.setMonth(date.getMonth() + durationVal);
    } else if (durationUnit === 'year') {
      date.setFullYear(date.getFullYear() + durationVal);
    }
    return date.toISOString().split('T')[0];
  };
 
  const calculateDuration = (startDateStr: string, endDateStr: string, durationUnit: string): number => {
    if (!startDateStr || !endDateStr) return 0;
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    if (end < start) return 0;
    
    if (durationUnit === 'day') {
      const diffTime = Math.abs(end.getTime() - start.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } else if (durationUnit === 'month') {
      const yearsDiff = end.getFullYear() - start.getFullYear();
      const monthsDiff = end.getMonth() - start.getMonth();
      return yearsDiff * 12 + monthsDiff;
    } else if (durationUnit === 'year') {
      return end.getFullYear() - start.getFullYear();
    }
    return 0;
  };
 
  const handleStartDateChange = (index: number, val: string) => {
    const newItems = [...qForm.items];
    const item = newItems[index];
    item.start_date = val;
    
    if (val && item.duration_value) {
      item.end_date = calculateEndDate(val, Number(normalizeAmountInput(item.duration_value)), item.duration_unit || 'month');
    } else if (val && item.end_date) {
      item.duration_value = String(calculateDuration(val, item.end_date, item.duration_unit || 'month'));
    }
    setQForm({ ...qForm, items: newItems });
  };
 
  const handleEndDateChange = (index: number, val: string) => {
    const newItems = [...qForm.items];
    const item = newItems[index];
    item.end_date = val;
    
    if (item.start_date && val) {
      item.duration_value = String(calculateDuration(item.start_date, val, item.duration_unit || 'month'));
    }
    setQForm({ ...qForm, items: newItems });
  };
 
  const handleDurationValueChange = (index: number, val: string) => {
    const newItems = [...qForm.items];
    const item = newItems[index];
    item.duration_value = val;
    
    if (item.start_date && val) {
      item.end_date = calculateEndDate(item.start_date, Number(normalizeAmountInput(val)), item.duration_unit || 'month');
    }
    setQForm({ ...qForm, items: newItems });
  };
 
  const handleDurationUnitChange = (index: number, val: string) => {
    const newItems = [...qForm.items];
    const item = newItems[index];
    item.duration_unit = val;
    
    if (item.start_date && item.duration_value) {
      item.end_date = calculateEndDate(item.start_date, Number(normalizeAmountInput(item.duration_value)), val);
    } else if (item.start_date && item.end_date) {
      item.duration_value = String(calculateDuration(item.start_date, item.end_date, val));
    }
    setQForm({ ...qForm, items: newItems });
  };
 
  const calculateFrontendSummary = () => {
    let subtotal = 0;
    let totalLineDiscount = 0;
    let totalTax = 0;
    let totalWithholdingTax = 0;
 
    const itemsCalculated = qForm.items.map(item => {
      const qty = Number(normalizeAmountInput(String(item.quantity))) || 0;
      const price = Number(normalizeAmountInput(String(item.unit_price))) || 0;
      const duration = Number(normalizeAmountInput(String(item.duration_value))) || 1;
      const discVal = Number(normalizeAmountInput(String(item.line_discount_value))) || 0;
      const taxRate = Number(item.tax_rate) || 0;
      const whtRate = Number(item.withholding_tax_rate) || 0;
 
      const baseAmount = qty * price * duration;
      let lineDiscountAmount = 0;
      if (item.line_discount_type === 'percentage') {
        lineDiscountAmount = baseAmount * (discVal / 100);
      } else if (item.line_discount_type === 'amount') {
        lineDiscountAmount = discVal;
      }
 
      const taxableAmount = baseAmount - lineDiscountAmount;
      const lineTaxAmount = taxableAmount * (taxRate / 100);
      const lineTotalBeforeWht = taxableAmount + lineTaxAmount;
      
      const lineWhtAmount = taxableAmount * (whtRate / 100);
      const lineTotalAfterWht = lineTotalBeforeWht - lineWhtAmount;
 
      subtotal += baseAmount;
      totalLineDiscount += lineDiscountAmount;
      totalTax += lineTaxAmount;
      totalWithholdingTax += lineWhtAmount;
 
      return {
        ...item,
        line_subtotal: baseAmount,
        line_discount_amount: lineDiscountAmount,
        line_tax_amount: lineTaxAmount,
        line_withholding_tax_amount: lineWhtAmount,
        line_total_before_wht: lineTotalBeforeWht,
        line_total_after_wht: lineTotalAfterWht,
        line_total: lineTotalAfterWht
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
    const grandTotalBeforeWht = subtotal - totalLineDiscount - headerDiscountAmount + totalTax + otherCost;
    const grandTotalAfterWht = grandTotalBeforeWht - totalWithholdingTax;
 
    return {
      subtotal,
      totalLineDiscount,
      headerDiscountAmount,
      totalTax,
      totalWithholdingTax,
      grandTotalBeforeWht,
      grandTotal: Math.max(0, grandTotalAfterWht),
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
        header_discount_value: Number(normalizeAmountInput(String(qForm.header_discount_value))) || 0,
        other_cost: Number(normalizeAmountInput(String(qForm.other_cost))) || 0,
        contract_start_date: qForm.contract_start_date || null,
        contract_end_date: qForm.contract_end_date || null,
        expected_close_date: qForm.expected_close_date || null,
        items: qForm.items.map(item => ({
          ...item,
          product_id: item.product_id ? Number(item.product_id) : null,
          product_tier_id: item.product_tier_id ? Number(item.product_tier_id) : null,
          tax_code_id: item.tax_code_id ? Number(item.tax_code_id) : null,
          withholding_tax_code_id: item.withholding_tax_code_id ? Number(item.withholding_tax_code_id) : null,
          quantity: Number(normalizeAmountInput(String(item.quantity))) || 0,
          unit_price: Number(normalizeAmountInput(String(item.unit_price))) || 0,
          line_discount_value: Number(normalizeAmountInput(String(item.line_discount_value))) || 0,
          start_date: item.start_date || null,
          end_date: item.end_date || null,
          duration_value: item.duration_value ? Number(normalizeAmountInput(String(item.duration_value))) : null,
          duration_unit: item.duration_unit || null,
        }))
      };
      
      const res = await apiFetch(`/leads/${leadId}/quotations`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (err.errors) {
          const detail = Object.values(err.errors).flat().join(', ');
          throw new Error(`${err.message || 'Validation failed'}: ${detail}`);
        }
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
 
  const calculateSOFrontendSummary = () => {
    let subtotal = 0;
    let lineDiscountTotal = 0;
    let taxTotal = 0;
    let whtTotal = 0;

    const itemsCalculated = soForm.items.map(item => {
      const qty = Number(normalizeAmountInput(String(item.quantity))) || 0;
      const price = Number(normalizeAmountInput(String(item.unit_price))) || 0;
      const duration = Number(normalizeAmountInput(String(item.duration_value))) || 1;
      const baseAmount = qty * price * duration;

      let disc = 0;
      const discVal = Number(normalizeAmountInput(String(item.line_discount_value))) || 0;
      if (item.line_discount_type === 'percentage') {
        disc = baseAmount * (discVal / 100);
      } else if (item.line_discount_type === 'amount') {
        disc = discVal;
      }

      const taxable = baseAmount - disc;
      const taxRate = Number(item.tax_rate) || 0;
      const tax = taxable * (taxRate / 100);

      const whtRate = Number(item.withholding_tax_rate) || 0;
      const wht = taxable * (whtRate / 100);

      subtotal += baseAmount;
      lineDiscountTotal += disc;
      taxTotal += tax;
      whtTotal += wht;

      return {
        ...item,
        quantity: qty,
        unit_price: price,
        duration_value: item.duration_value ? Number(item.duration_value) : null,
        line_discount_amount: disc,
        tax_amount: tax,
        withholding_tax_amount: wht,
        total_amount: baseAmount - disc + tax - wht
      };
    });

    const otherCost = Number(normalizeAmountInput(String(soForm.other_cost))) || 0;
    const headerDiscVal = Number(normalizeAmountInput(String(soForm.header_discount_value))) || 0;
    let headerDisc = 0;
    if (soForm.header_discount_type === 'percentage') {
      headerDisc = (subtotal - lineDiscountTotal) * (headerDiscVal / 100);
    } else if (soForm.header_discount_type === 'amount') {
      headerDisc = headerDiscVal;
    }

    const grandTotalBeforeWht = subtotal - lineDiscountTotal - headerDisc + taxTotal + otherCost;
    const grandTotal = grandTotalBeforeWht - whtTotal;

    return {
      subtotal,
      lineDiscountTotal,
      headerDiscountAmount: headerDisc,
      taxTotal,
      whtTotal,
      otherCost,
      grandTotalBeforeWht,
      grandTotal,
      items: itemsCalculated
    };
  };

  const createSalesOrderDirect = async () => {
    setSavingSO(true);
    setErrorMessage(null);
    try {
      const summary = calculateSOFrontendSummary();
      const payload = {
        order_type: soForm.order_type,
        order_date: soForm.order_date,
        customer_name: soForm.customer_name || null,
        billing_entity: soForm.billing_entity || null,
        contact_id: soForm.contact_id ? Number(soForm.contact_id) : null,
        sales_owner_id: soForm.sales_owner_id ? Number(soForm.sales_owner_id) : null,
        presales_owner_id: soForm.presales_owner_id ? Number(soForm.presales_owner_id) : null,
        account_manager_id: soForm.account_manager_id ? Number(soForm.account_manager_id) : null,
        spk_number: soForm.spk_number || null,
        customer_po_number: soForm.customer_po_number || null,
        expected_fulfillment_date: soForm.expected_fulfillment_date || null,
        sales_effective_date: soForm.sales_effective_date || null,
        payment_terms: soForm.payment_terms || null,
        billing_frequency: soForm.billing_frequency || null,
        tax_included: soForm.tax_included,
        header_discount_type: soForm.header_discount_type,
        header_discount_value: Number(normalizeAmountInput(String(soForm.header_discount_value))) || 0,
        other_cost: Number(normalizeAmountInput(String(soForm.other_cost))) || 0,
        scope_of_work: soForm.scope_of_work || null,
        exclusions: soForm.exclusions || null,
        delivery_timeline: soForm.delivery_timeline || null,
        warranty_support_terms: soForm.warranty_support_terms || null,
        customer_notes: soForm.customer_notes || null,
        internal_notes: soForm.internal_notes || null,
        terms_conditions: soForm.terms_conditions || null,
        department: soForm.department || null,
        cost_center: soForm.cost_center || null,
        location: soForm.location || null,
        items: summary.items.map(item => ({
          ...item,
          product_id: item.product_id ? Number(item.product_id) : null,
          product_tier_id: item.product_tier_id ? Number(item.product_tier_id) : null,
          tax_code_id: item.tax_code_id ? Number(item.tax_code_id) : null,
          withholding_tax_code_id: item.withholding_tax_code_id ? Number(item.withholding_tax_code_id) : null,
          start_date: item.start_date || null,
          end_date: item.end_date || null,
          duration_value: item.duration_value ? Number(item.duration_value) : null,
          duration_unit: item.duration_unit || null,
        }))
      };

      const url = editingSOId 
        ? `/sales-orders/${editingSOId}` 
        : `/leads/${leadId}/sales-orders`;
      const method = editingSOId ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (err.errors) {
          const detail = Object.values(err.errors).flat().join(', ');
          throw new Error(`${err.message || 'Validation failed'}: ${detail}`);
        }
        throw new Error(err.message || 'Failed to save sales order');
      }
      qc.invalidateQueries({ queryKey: ['lead-sales-orders', leadId] });
      setShowSOModal(false);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSavingSO(false);
    }
  };

  const startEditSO = (so: any) => {
    setErrorMessage(null);
    setEditingSOId(so.id);
    setSoActiveTab('primary');
    setSoForm({
      source_type: so.source_type || 'direct',
      quotation_id: so.quotation_id ? String(so.quotation_id) : '',
      sales_order_number: so.sales_order_number || '',
      order_date: so.order_date ? so.order_date.split('T')[0] : new Date().toISOString().split('T')[0],
      start_date: so.contract_start_date ? so.contract_start_date.split('T')[0] : '',
      end_date: so.contract_end_date ? so.contract_end_date.split('T')[0] : '',
      spk_number: so.spk_number || '',
      customer_po_number: so.customer_po_number || '',
      currency_code: so.currency || 'IDR',
      memo: so.internal_notes || '',
      order_type: so.order_type || 'new',
      sales_owner_id: so.sales_owner_id ? String(so.sales_owner_id) : '',
      presales_owner_id: so.presales_owner_id ? String(so.presales_owner_id) : '',
      account_manager_id: so.account_manager_id ? String(so.account_manager_id) : '',
      lead_source: so.lead_source || '',
      channel: so.channel || '',
      expected_fulfillment_date: so.expected_fulfillment_date ? so.expected_fulfillment_date.split('T')[0] : '',
      sales_effective_date: so.sales_effective_date ? so.sales_effective_date.split('T')[0] : '',
      department: so.department || '',
      cost_center: so.cost_center || '',
      location: so.location || '',
      industry: so.industry || '',
      business_category: so.business_category || '',
      payment_terms: so.payment_terms || 'Net 30',
      billing_frequency: so.billing_frequency || 'monthly',
      delivery_timeline: so.delivery_timeline || '',
      fulfillment_notes: '',
      customer_notes: so.customer_notes || '',
      internal_notes: so.internal_notes || '',
      terms_conditions: so.terms_conditions || '',
      customer_name: so.customer_name || '',
      billing_entity: so.billing_entity || '',
      contact_id: so.contact_id ? String(so.contact_id) : '',
      tax_included: !!so.tax_included,
      header_discount_type: so.header_discount_type || 'none',
      header_discount_value: String(so.header_discount_value || '0'),
      other_cost: String(so.other_cost || '0'),
      scope_of_work: so.scope_of_work || '',
      exclusions: so.exclusions || '',
      warranty_support_terms: so.warranty_support_terms || '',
      items: (so.items || []).map((item: any) => ({
        product_id: item.product_id ? String(item.product_id) : '',
        product_tier_id: item.product_tier_id ? String(item.product_tier_id) : '',
        pricing_model: item.pricing_model || 'flat_rate',
        price_source: item.price_source || 'manual',
        tax_code_id: item.tax_code_id ? String(item.tax_code_id) : '',
        withholding_tax_code_id: item.withholding_tax_code_id ? String(item.withholding_tax_code_id) : '',
        withholding_tax_rate: Number(item.withholding_tax_rate) || 0,
        item_name: item.item_name || '',
        description: item.description || '',
        quantity: String(item.quantity || '1'),
        unit: item.unit || 'license',
        unit_price: String(item.unit_price || '0'),
        billing_period: item.billing_period || 'monthly',
        line_discount_type: item.line_discount_type || 'none',
        line_discount_value: String(item.line_discount_value || '0'),
        tax_code: item.tax_code || '',
        tax_rate: Number(item.tax_rate) || 0,
        start_date: item.service_start_date ? item.service_start_date.split('T')[0] : '',
        end_date: item.service_end_date ? item.service_end_date.split('T')[0] : '',
        duration_value: item.duration_value ? String(item.duration_value) : '',
        duration_unit: item.duration_unit || 'month',
      }))
    });
    setShowSOModal(true);
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
        product_tier_id: '',
        item_name: prod.name,
        description: prod.description || '',
        unit_price: formatAmountInput(String(prod.base_price || 0)),
        price_source: 'product_base_price',
        pricing_model: 'flat_rate',
      };
      setQForm({ ...qForm, items: newItems });
    }
  };
 
  const handleTierSelect = (index: number, tierId: string) => {
    const productId = qForm.items[index].product_id;
    const prod = products.find((p: any) => String(p.id) === productId);
    if (!prod) return;
    
    const tier = prod.tiers?.find((t: any) => String(t.id) === tierId);
    if (tier) {
      const newItems = [...qForm.items];
      newItems[index] = {
        ...newItems[index],
        product_tier_id: tierId,
        item_name: `${prod.name} — ${tier.name}`,
        description: tier.features ? tier.features.join(', ') : (prod.description || ''),
        unit_price: formatAmountInput(String(tier.price || 0)),
        billing_period: tier.billing_period || 'monthly',
        pricing_model: tier.pricing_type || 'flat_rate',
        price_source: 'product_tier',
      };
      setQForm({ ...qForm, items: newItems });
    }
  };
 
  const handleTaxCodeSelect = (index: number, taxCodeId: string) => {
    const code = taxCodes.find((c: any) => String(c.id) === taxCodeId);
    const newItems = [...qForm.items];
    newItems[index] = {
      ...newItems[index],
      tax_code_id: taxCodeId,
      tax_code: code ? code.tax_code : '',
      tax_rate: code ? Number(code.rate_percentage) : 0,
    };
    setQForm({ ...qForm, items: newItems });
  };
 
  const handleWhtCodeSelect = (index: number, whtCodeId: string) => {
    const code = whtCodes.find((c: any) => String(c.id) === whtCodeId);
    const newItems = [...qForm.items];
    newItems[index] = {
      ...newItems[index],
      withholding_tax_code_id: whtCodeId,
      withholding_tax_rate: code ? Number(code.rate_percentage) : 0,
    };
    setQForm({ ...qForm, items: newItems });
  };
 
  const addLineItem = () => {
    setQForm({
      ...qForm,
      items: [
        ...qForm.items,
        {
          product_id: '',
          product_tier_id: '',
          pricing_model: 'flat_rate',
          price_source: 'manual',
          tax_code_id: '',
          withholding_tax_code_id: '',
          withholding_tax_rate: 0,
          item_name: 'Custom Item',
          description: '',
          quantity: '1',
          unit: 'license',
          unit_price: '0',
          billing_period: 'monthly',
          line_discount_type: 'none',
          line_discount_value: '0',
          tax_code: '',
          tax_rate: 0,
          start_date: '',
          end_date: '',
          duration_value: '',
          duration_unit: 'month',
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
          product_tier_id: '',
          pricing_model: 'flat_rate',
          price_source: 'manual',
          tax_code_id: '',
          withholding_tax_code_id: '',
          withholding_tax_rate: 0,
          item_name: 'Custom Item',
          description: '',
          quantity: '1',
          unit: 'license',
          unit_price: '0',
          billing_period: 'monthly',
          line_discount_type: 'none',
          line_discount_value: '0',
          tax_code: '',
          tax_rate: 0,
          start_date: '',
          end_date: '',
          duration_value: '',
          duration_unit: 'month',
        }
      ]
    });
  };

  const handleSOProductSelect = (index: number, productId: string) => {
    const prod = products.find((p: any) => String(p.id) === productId);
    if (prod) {
      const newItems = [...soForm.items];
      newItems[index] = {
        ...newItems[index],
        product_id: productId,
        product_tier_id: '',
        item_name: prod.name,
        description: prod.description || '',
        unit_price: formatAmountInput(String(prod.base_price || 0)),
        price_source: 'product_base_price',
        pricing_model: 'flat_rate',
      };
      setSoForm({ ...soForm, items: newItems });
    }
  };

  const handleSOTierSelect = (index: number, tierId: string) => {
    const productId = soForm.items[index].product_id;
    const prod = products.find((p: any) => String(p.id) === productId);
    if (!prod) return;
    
    const tier = prod.tiers?.find((t: any) => String(t.id) === tierId);
    if (tier) {
      const newItems = [...soForm.items];
      newItems[index] = {
        ...newItems[index],
        product_tier_id: tierId,
        item_name: `${prod.name} — ${tier.name}`,
        description: tier.features ? tier.features.join(', ') : (prod.description || ''),
        unit_price: formatAmountInput(String(tier.price || 0)),
        billing_period: tier.billing_period || 'monthly',
        pricing_model: tier.pricing_type || 'flat_rate',
        price_source: 'product_tier',
      };
      setSoForm({ ...soForm, items: newItems });
    }
  };

  const handleSOTaxCodeSelect = (index: number, taxCodeId: string) => {
    const code = taxCodes.find((c: any) => String(c.id) === taxCodeId);
    const newItems = [...soForm.items];
    newItems[index] = {
      ...newItems[index],
      tax_code_id: taxCodeId,
      tax_code: code ? code.tax_code : '',
      tax_rate: code ? Number(code.rate_percentage) : 0,
    };
    setSoForm({ ...soForm, items: newItems });
  };

  const handleSOWhtCodeSelect = (index: number, whtCodeId: string) => {
    const code = whtCodes.find((c: any) => String(c.id) === whtCodeId);
    const newItems = [...soForm.items];
    newItems[index] = {
      ...newItems[index],
      withholding_tax_code_id: whtCodeId,
      withholding_tax_rate: code ? Number(code.rate_percentage) : 0,
    };
    setSoForm({ ...soForm, items: newItems });
  };

  const addSOLineItem = () => {
    setSoForm({
      ...soForm,
      items: [
        ...soForm.items,
        {
          product_id: '',
          product_tier_id: '',
          pricing_model: 'flat_rate',
          price_source: 'manual',
          tax_code_id: '',
          withholding_tax_code_id: '',
          withholding_tax_rate: 0,
          item_name: 'Custom Item',
          description: '',
          quantity: '1',
          unit: 'license',
          unit_price: '0',
          billing_period: 'monthly',
          line_discount_type: 'none',
          line_discount_value: '0',
          tax_code: '',
          tax_rate: 0,
          start_date: '',
          end_date: '',
          duration_value: '',
          duration_unit: 'month',
        }
      ]
    });
  };

  const removeSOLineItem = (index: number) => {
    if (soForm.items.length <= 1) return;
    const newItems = soForm.items.filter((_, i) => i !== index);
    setSoForm({ ...soForm, items: newItems });
  };

  const duplicateSOLineItem = (index: number) => {
    const itemToCopy = soForm.items[index];
    setSoForm({
      ...soForm,
      items: [...soForm.items, { ...itemToCopy }]
    });
  };

  const clearAllSOItems = () => {
    setSoForm({
      ...soForm,
      items: [
        {
          product_id: '',
          product_tier_id: '',
          pricing_model: 'flat_rate',
          price_source: 'manual',
          tax_code_id: '',
          withholding_tax_code_id: '',
          withholding_tax_rate: 0,
          item_name: 'Custom Item',
          description: '',
          quantity: '1',
          unit: 'license',
          unit_price: '0',
          billing_period: 'monthly',
          line_discount_type: 'none',
          line_discount_value: '0',
          tax_code: '',
          tax_rate: 0,
          start_date: '',
          end_date: '',
          duration_value: '',
          duration_unit: 'month',
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
            <Button size="sm" variant="outline" className="border-green-500/30 text-green-700 hover:bg-green-50" onClick={() => {
              setErrorMessage(null);
              setEditingSOId(null);
              setSoActiveTab('primary');
              setSoForm({
                source_type: 'direct',
                quotation_id: '',
                sales_order_number: '',
                order_date: new Date().toISOString().split('T')[0],
                start_date: '',
                end_date: '',
                spk_number: '',
                customer_po_number: '',
                currency_code: 'IDR',
                memo: '',
                order_type: 'new',
                sales_owner_id: leadObj ? String(leadObj.owner_id || '') : '',
                presales_owner_id: '',
                account_manager_id: '',
                lead_source: leadObj ? String(leadObj.lead_source || '') : '',
                channel: leadObj ? String(leadObj.channel || '') : '',
                expected_fulfillment_date: '',
                sales_effective_date: '',
                department: '',
                cost_center: '',
                location: '',
                industry: leadObj ? String(leadObj.industry || '') : '',
                business_category: leadObj ? String(leadObj.business_category_name || '') : '',
                payment_terms: 'Net 30',
                billing_frequency: 'monthly',
                delivery_timeline: '',
                fulfillment_notes: '',
                customer_notes: '',
                internal_notes: '',
                terms_conditions: '',
                customer_name: leadObj ? String(leadObj.company_name || '') : '',
                billing_entity: '',
                contact_id: '',
                tax_included: false,
                header_discount_type: 'none',
                header_discount_value: '0',
                other_cost: '0',
                scope_of_work: '',
                exclusions: '',
                warranty_support_terms: '',
                items: [
                  {
                    product_id: '',
                    product_tier_id: '',
                    pricing_model: 'flat_rate',
                    price_source: 'manual',
                    tax_code_id: '',
                    withholding_tax_code_id: '',
                    withholding_tax_rate: 0,
                    item_name: 'Platform Subscription',
                    description: 'Platform Access License',
                    quantity: '1',
                    unit: 'license',
                    unit_price: '0',
                    billing_period: 'monthly',
                    line_discount_type: 'none',
                    line_discount_value: '0',
                    tax_code: '',
                    tax_rate: 0,
                    start_date: '',
                    end_date: '',
                    duration_value: '',
                    duration_unit: 'month',
                  }
                ]
              });
              setShowSOModal(true);
            }}>
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
                          <Button size="xs" variant="outline" className="text-blue-600 hover:bg-blue-100/50" onClick={() => startEditSO(so)}>
                            Edit
                          </Button>
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
          size="7xl"
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
                    <Input value={qForm.other_cost} onChange={e => setQForm({...qForm, other_cost: formatAmountInput(normalizeAmountInput(e.target.value))})} />
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
                      <Input value={qForm.header_discount_value} onChange={e => setQForm({...qForm, header_discount_value: formatAmountInput(normalizeAmountInput(e.target.value))})} />
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
                          <th className="p-2 font-semibold w-[15%]">Product & Tier</th>
                          <th className="p-2 font-semibold w-[10%]">Item Name</th>
                          <th className="p-2 font-semibold w-[10%]">Start Date</th>
                          <th className="p-2 font-semibold w-[12%]">Duration</th>
                          <th className="p-2 font-semibold w-[10%]">End Date</th>
                          <th className="p-2 font-semibold w-[5%]">Qty</th>
                          <th className="p-2 font-semibold w-[8%]">Unit Price</th>
                          <th className="p-2 font-semibold w-[8%]">Line Discount</th>
                          <th className="p-2 font-semibold w-[8%]">Tax Code</th>
                          <th className="p-2 font-semibold w-[8%]">WHT Code</th>
                          <th className="p-2 font-semibold w-[8%] text-right">Total</th>
                          <th className="p-2 font-semibold w-[6%] text-center">Actions</th>
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
                                  <option value="">-- Custom / Manual --</option>
                                  {products.map((p: any) => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                  ))}
                                </select>
                                {item.product_id && (() => {
                                  const prod = products.find((p: any) => String(p.id) === item.product_id);
                                  if (prod && prod.tiers && prod.tiers.length > 0) {
                                    return (
                                      <select
                                        className="w-full rounded border border-input bg-background p-1 text-[10px] mt-1"
                                        value={item.product_tier_id}
                                        onChange={e => handleTierSelect(index, e.target.value)}
                                      >
                                        <option value="">-- Select Tier --</option>
                                        {prod.tiers.map((t: any) => (
                                          <option key={t.id} value={t.id}>{t.name} ({formatCurrency(t.price)})</option>
                                        ))}
                                      </select>
                                    );
                                  }
                                  return null;
                                })()}
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
                                  type="date"
                                  className="h-8 p-1 text-xs" 
                                  value={item.start_date || ''} 
                                  onChange={e => handleStartDateChange(index, e.target.value)}
                                />
                              </td>
                              <td className="p-1">
                                <div className="flex gap-1 items-center">
                                  <Input 
                                    className="h-8 p-1 text-xs w-[50px]" 
                                    value={item.duration_value || ''} 
                                    onChange={e => handleDurationValueChange(index, formatAmountInput(normalizeAmountInput(e.target.value)))}
                                    placeholder="1"
                                  />
                                  <select
                                    className="rounded border border-input bg-background p-1 text-[10px] h-8"
                                    value={item.duration_unit || 'month'}
                                    onChange={e => handleDurationUnitChange(index, e.target.value)}
                                  >
                                    <option value="day">Days</option>
                                    <option value="month">Months</option>
                                    <option value="year">Years</option>
                                  </select>
                                </div>
                              </td>
                              <td className="p-1">
                                <Input 
                                  type="date"
                                  className="h-8 p-1 text-xs" 
                                  value={item.end_date || ''} 
                                  onChange={e => handleEndDateChange(index, e.target.value)}
                                />
                              </td>
                              <td className="p-1">
                                <Input 
                                  className="h-8 p-1 text-xs" 
                                  value={item.quantity} 
                                  onChange={e => {
                                    const newItems = [...qForm.items];
                                    newItems[index].quantity = formatAmountInput(normalizeAmountInput(e.target.value));
                                    setQForm({...qForm, items: newItems});
                                  }} 
                                />
                              </td>
                              <td className="p-1">
                                <Input 
                                  className="h-8 p-1 text-xs" 
                                  disabled={!settingAllowOverride && item.price_source === 'product_tier'}
                                  value={item.unit_price} 
                                  onChange={e => {
                                    const newItems = [...qForm.items];
                                    newItems[index].unit_price = formatAmountInput(normalizeAmountInput(e.target.value));
                                    newItems[index].price_source = 'manual';
                                    setQForm({...qForm, items: newItems});
                                  }} 
                                />
                              </td>
                              <td className="p-1">
                                <div className="flex gap-1">
                                  <select 
                                    className="rounded border border-input bg-background p-0.5 text-[10px]"
                                    disabled={!settingAllowDiscount}
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
                                  {item.line_discount_type !== 'none' && settingAllowDiscount && (
                                    <Input 
                                      className="h-8 p-1 text-xs w-[60px]" 
                                      value={item.line_discount_value} 
                                      onChange={e => {
                                        const newItems = [...qForm.items];
                                        newItems[index].line_discount_value = formatAmountInput(normalizeAmountInput(e.target.value));
                                        setQForm({...qForm, items: newItems});
                                      }} 
                                    />
                                  )}
                                </div>
                              </td>
                              <td className="p-1">
                                <select
                                  className="w-full rounded border border-input bg-background p-1 text-xs"
                                  value={item.tax_code_id || ''}
                                  onChange={e => handleTaxCodeSelect(index, e.target.value)}
                                >
                                  <option value="">No Tax</option>
                                  {taxCodes.filter((c: any) => c.is_active).map((c: any) => (
                                    <option key={c.id} value={c.id}>{c.tax_code} ({c.rate_percentage}%)</option>
                                  ))}
                                </select>
                              </td>
                              <td className="p-1">
                                <select
                                  className="w-full rounded border border-input bg-background p-1 text-xs"
                                  value={item.withholding_tax_code_id || ''}
                                  onChange={e => handleWhtCodeSelect(index, e.target.value)}
                                >
                                  <option value="">No WHT</option>
                                  {whtCodes.filter((c: any) => c.is_active).map((c: any) => (
                                    <option key={c.id} value={c.id}>{c.wht_code} ({c.rate_percentage}%)</option>
                                  ))}
                                </select>
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
                      {Number(normalizeAmountInput(String(qForm.other_cost))) > 0 && (
                        <div className="flex justify-between text-xs font-medium text-muted-foreground">
                          <span>Other Cost:</span>
                          <span className="tabular-nums font-bold text-foreground">+{formatCurrency(normalizeAmountInput(String(qForm.other_cost)))}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-xs font-medium text-muted-foreground border-t pt-1">
                        <span>Grand Total Before WHT:</span>
                        <span className="tabular-nums font-bold text-foreground">{formatCurrency(summary.grandTotalBeforeWht)}</span>
                      </div>
                      <div className="flex justify-between text-xs font-medium text-muted-foreground">
                        <span>Withholding Tax (WHT):</span>
                        <span className="tabular-nums font-bold text-red-600">-{formatCurrency(summary.totalWithholdingTax)}</span>
                      </div>
                      <div className="border-t border-border pt-2 flex justify-between text-sm font-bold text-blue-700 dark:text-blue-400">
                        <span>Net Grand Total:</span>
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
      {/* Direct/Edit Sales Order Creation Modal */}
      {showSOModal && (() => {
        const soSummary = calculateSOFrontendSummary();
        return (
          <Modal
            open={showSOModal}
            onOpenChange={(v) => !v && setShowSOModal(false)}
            title={editingSOId ? "Edit Sales Order" : "Create Sales Order"}
            description={editingSOId ? "Update details of this commercial booking." : "Draft a NetSuite-style detailed commercial order."}
            size="7xl"
            footer={
              <div className="flex justify-between w-full items-center">
                <div className="text-sm font-bold text-green-700">
                  Grand Total: {formatCurrency(soSummary.grandTotal)}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowSOModal(false)}>Cancel</Button>
                  <Button onClick={createSalesOrderDirect} disabled={savingSO} className="bg-green-600 hover:bg-green-700 text-white">
                    {savingSO && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                    {editingSOId ? "Update Order" : "Save as Draft"}
                  </Button>
                </div>
              </div>
            }
          >
            <div className="space-y-4">
              {soForm.source_type === 'direct' ? (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 text-yellow-800 dark:text-yellow-400 text-xs rounded-lg flex items-start gap-2 border border-yellow-200 dark:border-yellow-900/30">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block mb-0.5">Direct Order Warning</span>
                    Sales Order created directly without source quotation. This will bypass the proposal pipeline phase.
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-green-50 dark:bg-green-950/20 text-green-800 dark:text-green-400 text-xs rounded-lg flex items-start gap-2 border border-green-200 dark:border-green-900/30">
                  <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block mb-0.5">Converted from Quotation</span>
                    Copied from Quotation ID: {soForm.quotation_id}. Line items and snapshot totals are preserved.
                  </div>
                </div>
              )}

              {errorMessage && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 border border-red-200">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Pill navigation */}
              <div className="flex border-b border-border pb-1 gap-1 overflow-x-auto">
                {(['primary', 'sales', 'classification', 'items', 'billing', 'summary'] as const).map((tab, idx) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setSoActiveTab(tab)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors capitalize whitespace-nowrap ${soActiveTab === tab ? 'bg-green-600 text-white' : 'hover:bg-muted text-muted-foreground'}`}
                  >
                    {idx + 1}. {tab === 'primary' ? 'Primary Info' : tab === 'sales' ? 'Sales Info' : tab === 'billing' ? 'Billing & Terms' : tab === 'summary' ? 'Review Summary' : tab}
                  </button>
                ))}
              </div>

              <div className="min-h-[300px] py-2">
                {/* Tab 1: Primary Information */}
                {soActiveTab === 'primary' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Sales Order Number (Auto)</label>
                      <Input value={soForm.sales_order_number || "[Auto-Generated on Save]"} disabled className="bg-muted" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Source Type</label>
                      <Input value={soForm.source_type} disabled className="bg-muted capitalize" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Customer / Company Snapshot</label>
                      <Input value={soForm.customer_name} onChange={e => setSoForm({...soForm, customer_name: e.target.value})} disabled={soForm.source_type === 'quotation_conversion'} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Billing Entity Name</label>
                      <Input placeholder="Acme Billing LLC" value={soForm.billing_entity} onChange={e => setSoForm({...soForm, billing_entity: e.target.value})} disabled={soForm.source_type === 'quotation_conversion'} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Primary Contact Person</label>
                      <select 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={soForm.contact_id}
                        onChange={e => setSoForm({...soForm, contact_id: e.target.value})}
                        disabled={soForm.source_type === 'quotation_conversion'}
                      >
                        <option value="">-- Select Contact --</option>
                        {contacts.map((c: any) => (
                          <option key={c.id} value={c.id}>{c.first_name} {c.last_name} ({c.job_title || 'No Title'})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Order Date</label>
                      <Input type="date" value={soForm.order_date} onChange={e => setSoForm({...soForm, order_date: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Contract Start Date</label>
                      <Input type="date" value={soForm.start_date} onChange={e => setSoForm({...soForm, start_date: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Contract End Date</label>
                      <Input type="date" value={soForm.end_date} onChange={e => setSoForm({...soForm, end_date: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">SPK / Contract Reference Number</label>
                      <Input placeholder="SPK-2026-XXXX" value={soForm.spk_number} onChange={e => setSoForm({...soForm, spk_number: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Customer PO Number</label>
                      <Input placeholder="PO-XXXXXX" value={soForm.customer_po_number} onChange={e => setSoForm({...soForm, customer_po_number: e.target.value})} />
                    </div>
                  </div>
                )}

                {/* Tab 2: Sales Information */}
                {soActiveTab === 'sales' && (
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
                        <option value="upsell">Upsell</option>
                        <option value="cross_sell">Cross-sell</option>
                        <option value="add_on">Add-on</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Sales Owner</label>
                      <select 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={soForm.sales_owner_id}
                        onChange={e => setSoForm({...soForm, sales_owner_id: e.target.value})}
                        disabled={soForm.source_type === 'quotation_conversion'}
                      >
                        <option value="">-- Select Owner --</option>
                        {assignableUsers.map((u: any) => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Presales Owner / Solution Architect</label>
                      <select 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={soForm.presales_owner_id}
                        onChange={e => setSoForm({...soForm, presales_owner_id: e.target.value})}
                        disabled={soForm.source_type === 'quotation_conversion'}
                      >
                        <option value="">-- Select Presales --</option>
                        {assignableUsers.map((u: any) => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Account Manager</label>
                      <select 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={soForm.account_manager_id}
                        onChange={e => setSoForm({...soForm, account_manager_id: e.target.value})}
                      >
                        <option value="">-- Select AM --</option>
                        {assignableUsers.map((u: any) => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Lead Source</label>
                      <Input value={soForm.lead_source} disabled className="bg-muted" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Channel</label>
                      <Input value={soForm.channel} disabled className="bg-muted" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Expected Fulfillment Date</label>
                      <Input type="date" value={soForm.expected_fulfillment_date} onChange={e => setSoForm({...soForm, expected_fulfillment_date: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Sales Effective Date</label>
                      <Input type="date" value={soForm.sales_effective_date} onChange={e => setSoForm({...soForm, sales_effective_date: e.target.value})} />
                    </div>
                  </div>
                )}

                {/* Tab 3: Classification */}
                {soActiveTab === 'classification' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Department</label>
                      <Input placeholder="e.g. Sales, Professional Services" value={soForm.department} onChange={e => setSoForm({...soForm, department: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Cost Center</label>
                      <Input placeholder="e.g. CC-GLOBAL-01" value={soForm.cost_center} onChange={e => setSoForm({...soForm, cost_center: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Location</label>
                      <Input placeholder="e.g. Jakarta HQ, Singapore Branch" value={soForm.location} onChange={e => setSoForm({...soForm, location: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Industry Classification</label>
                      <Input value={soForm.industry} disabled className="bg-muted" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Business Category Name</label>
                      <Input value={soForm.business_category} disabled className="bg-muted" />
                    </div>
                  </div>
                )}

                {/* Tab 4: Line Items */}
                {soActiveTab === 'items' && (
                  <div className="space-y-4">
                    {soForm.source_type === 'quotation_conversion' && (
                      <div className="text-[11px] text-muted-foreground bg-muted p-2 rounded flex items-center gap-1.5 border border-border">
                        <AlertCircle className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                        Converted Sales Order line items are preserved from Quotation snapshot, but can be updated or overridden if draft.
                      </div>
                    )}
                    <div className="overflow-x-auto border rounded-lg max-h-[350px]">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-muted sticky top-0 text-[10px] uppercase text-muted-foreground border-b">
                          <tr>
                            <th className="p-2 w-[180px]">Product / Service</th>
                            <th className="p-2 w-[150px]">Billing Info</th>
                            <th className="p-2 w-[80px]">Qty</th>
                            <th className="p-2 w-[110px]">Unit Price</th>
                            <th className="p-2 w-[110px]">Line Discount</th>
                            <th className="p-2 w-[110px]">Tax Setting</th>
                            <th className="p-2 w-[110px]">WHT Setting</th>
                            <th className="p-2 w-[150px]">Duration & Period</th>
                            <th className="p-2 w-[90px]">Total Amount</th>
                            <th className="p-2 w-[40px]"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {soForm.items.map((item, index) => (
                            <tr key={index} className="hover:bg-muted/30">
                              <td className="p-1">
                                <select 
                                  className="w-full rounded border border-input bg-background p-1 text-[10px]"
                                  value={item.product_id}
                                  onChange={e => handleSOProductSelect(index, e.target.value)}
                                >
                                  <option value="">-- Custom / Manual --</option>
                                  {products.map((p: any) => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                  ))}
                                </select>
                                {item.product_id && (() => {
                                  const prod = products.find((p: any) => String(p.id) === item.product_id);
                                  if (prod && prod.tiers && prod.tiers.length > 0) {
                                    return (
                                      <select
                                        className="w-full rounded border border-input bg-background p-1 text-[10px] mt-1"
                                        value={item.product_tier_id}
                                        onChange={e => handleSOTierSelect(index, e.target.value)}
                                      >
                                        <option value="">-- Select Tier --</option>
                                        {prod.tiers.map((t: any) => (
                                          <option key={t.id} value={t.id}>{t.name} ({formatCurrency(t.price)})</option>
                                        ))}
                                      </select>
                                    );
                                  }
                                  return null;
                                })()}
                                <Input 
                                  className="text-[10px] h-6 mt-1"
                                  placeholder="Item Name Override"
                                  value={item.item_name}
                                  onChange={e => {
                                    const newItems = [...soForm.items];
                                    newItems[index].item_name = e.target.value;
                                    setSoForm({...soForm, items: newItems});
                                  }}
                                />
                                <textarea
                                  className="w-full rounded border border-input bg-background p-1 text-[10px] mt-1 h-12 resize-none"
                                  placeholder="Line item description"
                                  value={item.description}
                                  onChange={e => {
                                    const newItems = [...soForm.items];
                                    newItems[index].description = e.target.value;
                                    setSoForm({...soForm, items: newItems});
                                  }}
                                />
                              </td>
                              <td className="p-1 space-y-1">
                                <div>
                                  <label className="text-[9px] text-muted-foreground font-semibold uppercase">Period</label>
                                  <select 
                                    className="w-full rounded border border-input bg-background p-1 text-[10px]"
                                    value={item.billing_period}
                                    onChange={e => {
                                      const newItems = [...soForm.items];
                                      newItems[index].billing_period = e.target.value;
                                      setSoForm({...soForm, items: newItems});
                                    }}
                                  >
                                    <option value="one_time">One Time</option>
                                    <option value="monthly">Monthly</option>
                                    <option value="quarterly">Quarterly</option>
                                    <option value="yearly">Yearly</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[9px] text-muted-foreground font-semibold uppercase">Pricing Model</label>
                                  <select 
                                    className="w-full rounded border border-input bg-background p-1 text-[10px]"
                                    value={item.pricing_model}
                                    onChange={e => {
                                      const newItems = [...soForm.items];
                                      newItems[index].pricing_model = e.target.value;
                                      setSoForm({...soForm, items: newItems});
                                    }}
                                  >
                                    <option value="flat_rate">Flat Rate</option>
                                    <option value="per_user">Per User</option>
                                    <option value="per_license">Per License</option>
                                    <option value="per_package">Per Package</option>
                                    <option value="per_mandays">Per Manday</option>
                                    <option value="usage_based">Usage Based</option>
                                    <option value="custom">Custom</option>
                                  </select>
                                </div>
                              </td>
                              <td className="p-1">
                                <Input 
                                  className="text-[10px] h-7"
                                  value={item.quantity}
                                  onChange={e => {
                                    const newItems = [...soForm.items];
                                    newItems[index].quantity = formatAmountInput(normalizeAmountInput(e.target.value));
                                    setSoForm({...soForm, items: newItems});
                                  }}
                                />
                                <Input 
                                  className="text-[9px] h-6 mt-1"
                                  placeholder="unit (e.g. user)"
                                  value={item.unit}
                                  onChange={e => {
                                    const newItems = [...soForm.items];
                                    newItems[index].unit = e.target.value;
                                    setSoForm({...soForm, items: newItems});
                                  }}
                                />
                              </td>
                              <td className="p-1">
                                <div className="relative">
                                  <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground font-bold">Rp</span>
                                  <Input 
                                    className="pl-5 text-[10px] h-7 font-semibold"
                                    value={item.unit_price}
                                    onChange={e => {
                                      const newItems = [...soForm.items];
                                      newItems[index].unit_price = formatAmountInput(normalizeAmountInput(e.target.value));
                                      newItems[index].price_source = 'manual';
                                      setSoForm({...soForm, items: newItems});
                                    }}
                                  />
                                </div>
                                <span className="text-[8px] text-muted-foreground mt-0.5 block italic capitalize">Source: {item.price_source.replace(/_/g, ' ')}</span>
                              </td>
                              <td className="p-1 space-y-1">
                                <select 
                                  className="w-full rounded border border-input bg-background p-1 text-[10px]"
                                  value={item.line_discount_type}
                                  onChange={e => {
                                    const newItems = [...soForm.items];
                                    newItems[index].line_discount_type = e.target.value;
                                    newItems[index].line_discount_value = '0';
                                    setSoForm({...soForm, items: newItems});
                                  }}
                                >
                                  <option value="none">None</option>
                                  <option value="amount">Amount</option>
                                  <option value="percentage">Percentage (%)</option>
                                </select>
                                {item.line_discount_type !== 'none' && (
                                  <Input 
                                    className="text-[10px] h-7"
                                    value={item.line_discount_value}
                                    onChange={e => {
                                      const newItems = [...soForm.items];
                                      newItems[index].line_discount_value = formatAmountInput(normalizeAmountInput(e.target.value));
                                      setSoForm({...soForm, items: newItems});
                                    }}
                                  />
                                )}
                              </td>
                              <td className="p-1">
                                <select 
                                  className="w-full rounded border border-input bg-background p-1 text-[10px]"
                                  value={item.tax_code_id}
                                  onChange={e => handleSOTaxCodeSelect(index, e.target.value)}
                                >
                                  <option value="">-- Tax Code --</option>
                                  {taxCodes.map((c: any) => (
                                    <option key={c.id} value={c.id}>{c.tax_code} ({c.rate_percentage}%)</option>
                                  ))}
                                </select>
                                {item.tax_rate > 0 && (
                                  <span className="text-[9px] text-muted-foreground block mt-1 font-semibold">Rate: {item.tax_rate}%</span>
                                )}
                              </td>
                              <td className="p-1">
                                <select 
                                  className="w-full rounded border border-input bg-background p-1 text-[10px]"
                                  value={item.withholding_tax_code_id}
                                  onChange={e => handleSOWhtCodeSelect(index, e.target.value)}
                                >
                                  <option value="">-- WHT Code --</option>
                                  {whtCodes.map((c: any) => (
                                    <option key={c.id} value={c.id}>{c.wht_code} ({c.rate_percentage}%)</option>
                                  ))}
                                </select>
                                {item.withholding_tax_rate > 0 && (
                                  <span className="text-[9px] text-red-600 block mt-1 font-semibold">Deduct: {item.withholding_tax_rate}%</span>
                                )}
                              </td>
                              <td className="p-1 space-y-1">
                                <div>
                                  <label className="text-[8px] text-muted-foreground uppercase font-bold">Start Date</label>
                                  <Input 
                                    type="date" 
                                    className="text-[10px] h-6 p-1" 
                                    value={item.start_date}
                                    onChange={e => {
                                      const newItems = [...soForm.items];
                                      newItems[index].start_date = e.target.value;
                                      if (e.target.value && item.duration_value) {
                                        newItems[index].end_date = calculateEndDate(e.target.value, Number(item.duration_value), item.duration_unit);
                                      }
                                      setSoForm({...soForm, items: newItems});
                                    }}
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-1">
                                  <div>
                                    <label className="text-[8px] text-muted-foreground uppercase font-bold">Duration</label>
                                    <Input 
                                      className="text-[10px] h-6 p-1" 
                                      value={item.duration_value}
                                      onChange={e => {
                                        const newItems = [...soForm.items];
                                        newItems[index].duration_value = formatAmountInput(normalizeAmountInput(e.target.value));
                                        if (item.start_date && e.target.value) {
                                          newItems[index].end_date = calculateEndDate(item.start_date, Number(normalizeAmountInput(e.target.value)), item.duration_unit);
                                        }
                                        setSoForm({...soForm, items: newItems});
                                      }}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[8px] text-muted-foreground uppercase font-bold">Unit</label>
                                    <select
                                      className="w-full rounded border border-input bg-background p-1 text-[9px] h-6"
                                      value={item.duration_unit}
                                      onChange={e => {
                                        const newItems = [...soForm.items];
                                        newItems[index].duration_unit = e.target.value;
                                        if (item.start_date && item.duration_value) {
                                          newItems[index].end_date = calculateEndDate(item.start_date, Number(item.duration_value), e.target.value);
                                        }
                                        setSoForm({...soForm, items: newItems});
                                      }}
                                    >
                                      <option value="day">Day</option>
                                      <option value="month">Month</option>
                                      <option value="year">Year</option>
                                    </select>
                                  </div>
                                </div>
                                <div>
                                  <label className="text-[8px] text-muted-foreground uppercase font-bold">End Date</label>
                                  <Input 
                                    type="date" 
                                    className="text-[10px] h-6 p-1" 
                                    value={item.end_date}
                                    onChange={e => {
                                      const newItems = [...soForm.items];
                                      newItems[index].end_date = e.target.value;
                                      if (item.start_date && e.target.value) {
                                        const days = calculateDuration(item.start_date, e.target.value, item.duration_unit || 'day');
                                        newItems[index].duration_value = String(days);
                                        newItems[index].duration_unit = 'day';
                                      }
                                      setSoForm({...soForm, items: newItems});
                                    }}
                                  />
                                </div>
                              </td>
                              <td className="p-2 font-semibold tabular-nums text-right">
                                {formatCurrency(soSummary.items[index].total_amount)}
                              </td>
                              <td className="p-1">
                                <div className="flex flex-col gap-1 items-center">
                                  <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => duplicateSOLineItem(index)} title="Duplicate Row">
                                    <Copy className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => removeSOLineItem(index)} disabled={soForm.items.length <= 1} title="Delete Row">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={addSOLineItem} className="text-xs">
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add Row
                      </Button>
                      <Button size="sm" variant="ghost" onClick={clearAllSOItems} className="text-xs text-red-600 hover:bg-red-50 hover:text-red-700">
                        Clear All Lines
                      </Button>
                    </div>
                  </div>
                )}

                {/* Tab 5: Billing & Terms */}
                {soActiveTab === 'billing' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Payment Terms</label>
                      <select 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={soForm.payment_terms}
                        onChange={e => setSoForm({...soForm, payment_terms: e.target.value})}
                      >
                        <option value="Net 7">Net 7</option>
                        <option value="Net 14">Net 14</option>
                        <option value="Net 30">Net 30</option>
                        <option value="Due on Receipt">Due on Receipt</option>
                        <option value="Annual Upfront">Annual Upfront</option>
                        <option value="Monthly Billing">Monthly Billing</option>
                        <option value="Custom">Custom / Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Billing Frequency</label>
                      <select 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={soForm.billing_frequency}
                        onChange={e => setSoForm({...soForm, billing_frequency: e.target.value})}
                      >
                        <option value="One-time">One-time</option>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Delivery Timeline Reference</label>
                      <Input placeholder="e.g. 2 weeks after contract signed" value={soForm.delivery_timeline} onChange={e => setSoForm({...soForm, delivery_timeline: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Other Custom Cost / Implementation Surcharge</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Rp</span>
                        <Input className="pl-8" value={soForm.other_cost} onChange={e => setSoForm({...soForm, other_cost: formatAmountInput(normalizeAmountInput(e.target.value))})} />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Header Discount Type</label>
                      <select 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={soForm.header_discount_type}
                        onChange={e => setSoForm({...soForm, header_discount_type: e.target.value, header_discount_value: '0'})}
                      >
                        <option value="none">None</option>
                        <option value="amount">Fixed Amount</option>
                        <option value="percentage">Percentage (%)</option>
                      </select>
                    </div>
                    {soForm.header_discount_type !== 'none' && (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Header Discount Value</label>
                        <Input value={soForm.header_discount_value} onChange={e => setSoForm({...soForm, header_discount_value: formatAmountInput(normalizeAmountInput(e.target.value))})} />
                      </div>
                    )}
                    <div className="col-span-2 flex items-center space-x-2 py-1">
                      <input 
                        type="checkbox" 
                        id="so_tax_included" 
                        checked={soForm.tax_included} 
                        onChange={e => setSoForm({...soForm, tax_included: e.target.checked})} 
                        className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500" 
                      />
                      <label htmlFor="so_tax_included" className="text-xs font-semibold text-foreground cursor-pointer">
                        Tax / PPN is already included in prices (PPN Dalam Harga)
                      </label>
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Internal Memo / Fulfillment Notes</label>
                      <textarea 
                        className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Internal only billing references..." 
                        value={soForm.memo} 
                        onChange={e => setSoForm({...soForm, memo: e.target.value})} 
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Contract Terms & Commercial Conditions</label>
                      <textarea 
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="These terms will appear on the printed Sales Order copy..." 
                        value={soForm.terms_conditions} 
                        onChange={e => setSoForm({...soForm, terms_conditions: e.target.value})} 
                      />
                    </div>
                  </div>
                )}

                {/* Tab 6: Review Summary */}
                {soActiveTab === 'summary' && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold border-b pb-1 text-foreground">Summary Audit Sheet</h3>
                    <div className="grid grid-cols-2 gap-6 text-xs">
                      <div className="space-y-2 border-r pr-6">
                        <div className="flex justify-between"><span className="text-muted-foreground">Order Status:</span><span className="font-semibold capitalize">{editingSOId ? 'Editing Draft' : 'New Draft'}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Order Date:</span><span className="font-semibold">{soForm.order_date}</span></div>
                        {soForm.start_date && (
                          <div className="flex justify-between"><span className="text-muted-foreground">Contract Period:</span><span className="font-semibold">{soForm.start_date} to {soForm.end_date}</span></div>
                        )}
                        <div className="flex justify-between"><span className="text-muted-foreground">Customer Snapshot:</span><span className="font-semibold text-right">{soForm.customer_name}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Terms:</span><span className="font-semibold">{soForm.payment_terms} ({soForm.billing_frequency})</span></div>
                        {soForm.spk_number && (
                          <div className="flex justify-between"><span className="text-muted-foreground">SPK / Contract Reference:</span><span className="font-semibold">{soForm.spk_number}</span></div>
                        )}
                        {soForm.customer_po_number && (
                          <div className="flex justify-between"><span className="text-muted-foreground">Customer PO:</span><span className="font-semibold">{soForm.customer_po_number}</span></div>
                        )}
                      </div>
                      <div className="space-y-2.5">
                        <div className="flex justify-between text-foreground">
                          <span>Subtotal (Qty * Price * Duration):</span>
                          <span className="font-bold tabular-nums">{formatCurrency(soSummary.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-red-600">
                          <span>Line Discounts Total:</span>
                          <span className="font-semibold tabular-nums">- {formatCurrency(soSummary.lineDiscountTotal)}</span>
                        </div>
                        {soSummary.headerDiscountAmount > 0 && (
                          <div className="flex justify-between text-red-600">
                            <span>Header Discount Amount ({soForm.header_discount_type === 'percentage' ? `${soForm.header_discount_value}%` : 'Fixed'}):</span>
                            <span className="font-semibold tabular-nums">- {formatCurrency(soSummary.headerDiscountAmount)}</span>
                          </div>
                        )}
                        {soSummary.otherCost > 0 && (
                          <div className="flex justify-between text-green-700">
                            <span>Other Implementation Costs:</span>
                            <span className="font-semibold tabular-nums">+ {formatCurrency(soSummary.otherCost)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-green-700">
                          <span>Estimated Tax / VAT / PPN:</span>
                          <span className="font-bold tabular-nums">+ {formatCurrency(soSummary.taxTotal)}</span>
                        </div>
                        <div className="flex justify-between border-t pt-1.5 font-bold text-foreground">
                          <span>Grand Total Before WHT:</span>
                          <span className="tabular-nums">{formatCurrency(soSummary.grandTotalBeforeWht)}</span>
                        </div>
                        <div className="flex justify-between text-red-600">
                          <span>Withholding Tax (WHT / PPh Deductions):</span>
                          <span className="font-semibold tabular-nums">- {formatCurrency(soSummary.whtTotal)}</span>
                        </div>
                        <div className="flex justify-between border-t border-double border-green-600 pt-2 font-extrabold text-sm text-green-700">
                          <span>Net Grand Total (Total Booked Value):</span>
                          <span className="tabular-nums text-lg">{formatCurrency(soSummary.grandTotal)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
}
