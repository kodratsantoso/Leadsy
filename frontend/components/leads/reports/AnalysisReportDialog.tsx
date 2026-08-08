"use client";

import React from 'react';
import { Modal } from '@/components/ui/modal';
import { MeetingSummaryReport } from './MeetingSummaryReport';

interface AnalysisReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transcript: any;
  lead: any;
}

export function AnalysisReportDialog({ open, onOpenChange, transcript, lead }: AnalysisReportDialogProps) {
  if (!transcript) return null;

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Meeting Summary" size="full">
      <div className="overflow-y-auto max-h-[85vh]">
        <MeetingSummaryReport transcript={transcript} lead={lead} />
      </div>
    </Modal>
  );
}
