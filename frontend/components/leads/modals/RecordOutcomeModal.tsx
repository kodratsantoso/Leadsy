import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useNumberFormat } from '@/lib/hooks/use-number-format';

export interface RecordOutcomeModalProps {
  open: boolean;
  onClose: () => void;
  products: any[];
  defaultSaleType?: string;
  isPending: boolean;
  onSave: (data: {
    outcome: string;
    product_id?: number;
    sale_type?: string;
    deal_size?: number;
    feedback_notes?: string;
  }) => void;
}

export function RecordOutcomeModal({
  open,
  onClose,
  products,
  defaultSaleType = 'new_sales',
  isPending,
  onSave,
}: RecordOutcomeModalProps) {
  const { formatAmountInput, normalizeAmountInput } = useNumberFormat();
  const [form, setForm] = useState({
    outcome: 'won',
    product_id: '',
    sale_type: defaultSaleType,
    deal_size: '',
    feedback_notes: '',
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Record Deal Outcome</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Outcome</label>
            <select
              value={form.outcome}
              onChange={(e) => setForm({ ...form, outcome: e.target.value })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="won">Won</option>
              <option value="lost">Lost</option>
              <option value="churned">Churned</option>
              <option value="disqualified">Disqualified</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Product</label>
            <select
              value={form.product_id}
              onChange={(e) => setForm({ ...form, product_id: e.target.value })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="">Unassigned product</option>
              {products.map((product: any) => (
                <option key={product.id} value={String(product.id)}>{product.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Sales Type</label>
            <select
              value={form.sale_type}
              onChange={(e) => setForm({ ...form, sale_type: e.target.value })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="new_sales">New Sales</option>
              <option value="upsales">Upsales</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Deal Size (optional)</label>
            <input
              inputMode="decimal"
              value={formatAmountInput(form.deal_size)}
              onChange={(e) => setForm({ ...form, deal_size: normalizeAmountInput(e.target.value) })}
              placeholder="e.g. 50,000,000"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Notes</label>
            <textarea
              value={form.feedback_notes}
              onChange={(e) => setForm({ ...form, feedback_notes: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              placeholder="What happened? What did you learn?"
            />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted">
            Cancel
          </button>
          <button
            disabled={isPending}
            onClick={() => {
              onSave({
                outcome: form.outcome,
                product_id: form.product_id ? Number(form.product_id) : undefined,
                sale_type: form.sale_type,
                deal_size: form.deal_size ? parseFloat(form.deal_size) : undefined,
                feedback_notes: form.feedback_notes || undefined,
              });
            }}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--brand)] px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
          >
            {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
            Save Outcome
          </button>
        </div>
      </div>
    </div>
  );
}
