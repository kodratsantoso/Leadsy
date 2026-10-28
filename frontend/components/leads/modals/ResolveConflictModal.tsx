import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface ResolveConflictModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  initialValue?: string;
  onApplyOverride: (data: {
    override_value: string;
    override_type: string;
    justification: string;
  }) => void;
}

export function ResolveConflictModal({
  open,
  onOpenChange,
  isPending,
  initialValue = '',
  onApplyOverride,
}: ResolveConflictModalProps) {
  const [overrideType, setOverrideType] = useState('legal_name');
  const [overrideValue, setOverrideValue] = useState(initialValue);
  const [overrideJustification, setOverrideJustification] = useState('');

  React.useEffect(() => {
    if (initialValue) {
      setOverrideValue(initialValue);
    }
  }, [initialValue]);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Resolve Legal Entity Name Match Conflict"
      description="Override automatically resolved brand/legal company mapping names."
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              onApplyOverride({
                override_value: overrideValue,
                override_type: overrideType,
                justification: overrideJustification,
              })
            }
            disabled={isPending || !overrideValue}
          >
            {isPending ? 'Resolving…' : 'Apply Override'}
          </Button>
        </>
      }
    >
      <div className="space-y-4 py-2">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase">Override Type</label>
          <select
            value={overrideType}
            onChange={(e) => setOverrideType(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)] text-foreground"
          >
            <option value="legal_name">Legal Entity Name (PT/CV)</option>
            <option value="brand">Brand / Trading Name</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase">Override Value</label>
          <Input
            type="text"
            value={overrideValue}
            onChange={(e) => setOverrideValue(e.target.value)}
            placeholder="e.g. PT Example Indonesia Tbk"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase">Auditor Justification Notes</label>
          <Input
            type="text"
            value={overrideJustification}
            onChange={(e) => setOverrideJustification(e.target.value)}
            placeholder="Provide evidence sources or validation notes"
          />
        </div>
      </div>
    </Modal>
  );
}
