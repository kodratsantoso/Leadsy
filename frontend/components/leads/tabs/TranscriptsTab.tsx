'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import DateTimePicker from '@/components/ui/date-time-picker';
import { AnalysisReportDialog } from '@/components/leads/reports/AnalysisReportDialog';
import { apiFetch } from '@/lib/apiFetch';
import { useToast } from '@/components/ui/toast';
import {
  Loader2,
  RefreshCw,
  Plus,
  CheckCircle,
  AlertCircle,
  Trash2,
  FileText,
  Sparkles,
  FileDown,
  Link as LinkIcon,
  Printer,
  Target,
} from 'lucide-react';

export const TRANSCRIPT_SOURCES: Record<string, string> = {
  manual: 'Manual / Copy-Paste',
  link: 'Link',
  whatsapp: 'WhatsApp Conversation',
  audio: 'Audio File',
  video: 'Video File',
  transcript: 'Transcript File',
};

interface TranscriptsTabProps {
  leadData: any;
  lead: any;
  transcriptsList: any[];
  evaluationsList: any[];
  activitiesList: any[];
  expandedEvalId: number | string | null;
  setExpandedEvalId: React.Dispatch<React.SetStateAction<number | null>> | ((id: any) => void);
  evaluatingTranscriptId: number | string | null;
  setEvaluatingTranscriptId: React.Dispatch<React.SetStateAction<number | null>> | ((id: any) => void);
  evaluateTranscriptMutation: any;
  fetchTranscriptLinkMutation: any;
  generateMeetingSummaryPdfMutation: any;
  deleteTranscriptMutation: any;
  storeTranscriptMutation: any;
  showTranscriptForm: boolean;
  setShowTranscriptForm: React.Dispatch<React.SetStateAction<boolean>>;
  transcriptForm: any;
  setTranscriptForm: React.Dispatch<React.SetStateAction<any>>;
  transcriptFeedback: { type: 'success' | 'error'; msg: string } | null;
  setPdfPreviewUrl: (url: string | null) => void;
  setShowPdfModal: (show: boolean) => void;
}

export function TranscriptsTab({
  leadData,
  lead,
  transcriptsList,
  evaluationsList,
  activitiesList,
  expandedEvalId,
  setExpandedEvalId,
  evaluatingTranscriptId,
  setEvaluatingTranscriptId,
  evaluateTranscriptMutation,
  fetchTranscriptLinkMutation,
  generateMeetingSummaryPdfMutation,
  deleteTranscriptMutation,
  storeTranscriptMutation,
  showTranscriptForm,
  setShowTranscriptForm,
  transcriptForm,
  setTranscriptForm,
  transcriptFeedback,
  setPdfPreviewUrl,
  setShowPdfModal,
}: TranscriptsTabProps) {
  const toast = useToast();
  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {transcriptsList.length > 0
            ? `${transcriptsList.length} transcript${transcriptsList.length !== 1 ? 's' : ''}`
            : 'No transcripts yet'}
        </p>
        <div className="flex gap-2">
          {leadData?.meeting_link && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => fetchTranscriptLinkMutation.mutate(leadData.meeting_link)}
              disabled={fetchTranscriptLinkMutation.isPending}
            >
              {fetchTranscriptLinkMutation.isPending ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              )}
              Fetch from Lark
            </Button>
          )}
          <Button size="sm" onClick={() => setShowTranscriptForm((v) => !v)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            {showTranscriptForm ? 'Cancel' : 'Add Transcript'}
          </Button>
        </div>
      </div>

      {/* Feedback banner */}
      {transcriptFeedback && (
        <div
          className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium ${
            transcriptFeedback.type === 'success'
              ? 'bg-[color-mix(in_oklch,var(--status-success)_10%,transparent)] text-[var(--status-success)]'
              : 'bg-[color-mix(in_oklch,var(--status-danger)_10%,transparent)] text-[var(--status-danger)]'
          }`}
        >
          {transcriptFeedback.type === 'success' ? (
            <CheckCircle className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          {transcriptFeedback.msg}
        </div>
      )}

      {/* Add Transcript Form */}
      {showTranscriptForm && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h4 className="font-semibold text-sm">New Transcript</h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Title</label>
              <Input
                value={transcriptForm.title}
                onChange={(e) => setTranscriptForm((f: any) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Discovery meeting transcript"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Meeting Type</label>
              <Select
                value={transcriptForm.meeting_type}
                onChange={(e) => setTranscriptForm((f: any) => ({ ...f, meeting_type: e.target.value }))}
              >
                <option value="General">General</option>
                <option value="Discovery">Discovery</option>
                <option value="Demo">Demo</option>
                <option value="Follow-up">Follow-up</option>
                <option value="Proposal Discussion">Proposal Discussion</option>
                <option value="Closing Discussion">Closing Discussion</option>
                <option value="Handover to CSM">Handover to CSM</option>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Related Activity</label>
              <Select
                value={transcriptForm.activity_id}
                onChange={(e) => setTranscriptForm((f: any) => ({ ...f, activity_id: e.target.value }))}
                placeholder="— Not linked —"
              >
                {activitiesList.map((activity: any) => (
                  <option key={activity.id} value={String(activity.id)}>
                    {activity.activity_type} · {new Date(activity.activity_date).toLocaleDateString()}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Source Type</label>
              <Select
                value={transcriptForm.source_type}
                onChange={(e) => setTranscriptForm((f: any) => ({ ...f, source_type: e.target.value }))}
              >
                {Object.entries(TRANSCRIPT_SOURCES).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Recorded At</label>
              <DateTimePicker
                value={transcriptForm.recorded_at}
                onChange={(d: Date | null) =>
                  setTranscriptForm((f: any) => ({ ...f, recorded_at: d ? d.toISOString() : '' }))
                }
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Format: DD/MM/YYYY, HH:mm. Kosongkan untuk memakai waktu saat disimpan.
              </p>
            </div>
            {['video', 'audio', 'transcript'].includes(transcriptForm.source_type) && (
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">File</label>
                <Input
                  type="file"
                  accept=".txt,.vtt,.srt,audio/*,video/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setTranscriptForm((f: any) => ({
                      ...f,
                      transcript_file: file,
                      source_type: file?.type.startsWith('audio/')
                        ? 'audio'
                        : file?.type.startsWith('video/')
                          ? 'video'
                          : file
                            ? 'transcript'
                            : f.source_type,
                    }));
                  }}
                />
              </div>
            )}
            {transcriptForm.source_type === 'link' && (
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Minutes / Meeting Link
                </label>
                <Input
                  value={transcriptForm.meeting_link}
                  onChange={(e) => setTranscriptForm((f: any) => ({ ...f, meeting_link: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
            )}
          </div>
          {transcriptForm.source_type === 'manual' && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Transcript Text / Notes
              </label>
              <textarea
                value={transcriptForm.transcript_text}
                onChange={(e) => setTranscriptForm((f: any) => ({ ...f, transcript_text: e.target.value }))}
                rows={8}
                placeholder="Paste your meeting notes, call transcript, or conversation here..."
                className="min-h-[160px] w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground shadow-xs outline-none transition placeholder:text-muted-foreground focus-visible:border-[var(--brand)] focus-visible:ring-3 focus-visible:ring-[color:var(--brand)]/15"
              />
            </div>
          )}
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={transcriptForm.analyze_after_save}
              onChange={(e) => setTranscriptForm((f: any) => ({ ...f, analyze_after_save: e.target.checked }))}
              className="h-4 w-4 rounded border-border"
            />
            Analyze with AI after saving when text is available
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowTranscriptForm(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (transcriptForm.source_type === 'link') {
                  fetchTranscriptLinkMutation.mutate(transcriptForm.meeting_link);
                } else {
                  storeTranscriptMutation.mutate(transcriptForm);
                }
              }}
              disabled={
                storeTranscriptMutation.isPending ||
                fetchTranscriptLinkMutation.isPending ||
                (transcriptForm.source_type === 'manual' && !transcriptForm.transcript_text.trim()) ||
                (['video', 'audio', 'transcript'].includes(transcriptForm.source_type) &&
                  !transcriptForm.transcript_file) ||
                (transcriptForm.source_type === 'link' && !transcriptForm.meeting_link.trim())
              }
            >
              {(storeTranscriptMutation.isPending || fetchTranscriptLinkMutation.isPending) && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
              {transcriptForm.source_type === 'link' ? 'Import & Analyze' : 'Save Transcript'}
            </Button>
          </div>
        </div>
      )}

      {/* Transcript list */}
      {transcriptsList.length === 0 && !showTranscriptForm ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-16 text-center">
          <FileText className="mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">No transcripts yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Paste meeting notes or call transcripts and run AI analysis.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {transcriptsList.map((tr: any) => {
            const evaluation = evaluationsList.find(
              (ev: any) => ev.source_id === tr.id && ev.source_type?.endsWith('LeadTranscript')
            );
            const isExpanded = expandedEvalId === tr.id;
            return (
              <div key={tr.id} className="rounded-xl border border-border bg-card overflow-hidden">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 p-4">
                  <div className="space-y-1">
                    {tr.title && <p className="text-sm font-semibold">{tr.title}</p>}
                    <div className="flex items-center gap-2 flex-wrap">
                      {tr.meeting_type && <Badge variant="info">{tr.meeting_type}</Badge>}
                      {tr.meeting_type &&
                        ![
                          'discovery',
                          'demo',
                          'follow-up',
                          'proposal discussion',
                          'closing discussion',
                          'handover to csm',
                        ].includes(tr.meeting_type.toLowerCase()) && (
                          <Badge variant="warning" className="text-xs">
                            ⚠️ Unsupported: using General
                          </Badge>
                        )}
                      <Badge variant="neutral">{TRANSCRIPT_SOURCES[tr.source_type] ?? tr.source_type}</Badge>
                      {tr.import_status && !['COMPLETED', 'TRANSCRIPT_IMPORTED'].includes(tr.import_status) && (
                        <Badge variant={tr.import_status === 'FAILED' ? 'danger' : 'warning'}>
                          {tr.import_status === 'FAILED' ? 'Import Failed' : `Importing: ${tr.import_status}`}
                        </Badge>
                      )}
                      <Badge variant={tr.evaluation_status === 'evaluated' ? 'success' : 'warning'}>
                        {tr.evaluation_status}
                      </Badge>
                      {tr.documents?.length > 0 && (
                        <Badge variant={tr.documents[0].generation_status === 'success' ? 'success' : 'neutral'}>
                          PDF: {tr.documents[0].generation_status}
                        </Badge>
                      )}
                      {tr.syncJobs?.length > 0 && (
                        <Badge
                          variant={
                            tr.syncJobs[0].status === 'success'
                              ? 'success'
                              : tr.syncJobs[0].status === 'failed'
                                ? 'danger'
                                : 'neutral'
                          }
                        >
                          Lark Sync: {tr.syncJobs[0].status}
                        </Badge>
                      )}
                      {tr.activity && (
                        <Badge variant="info" className="text-[10px]">
                          Linked: {tr.activity.activity_type}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tr.recorded_at ?? tr.created_at).toLocaleString()}
                      {tr.file_name ? ` · ${tr.file_name}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {tr.evaluation_status !== 'evaluated' && (
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => {
                          setEvaluatingTranscriptId(tr.id);
                          evaluateTranscriptMutation.mutate(tr.id);
                        }}
                        disabled={
                          (evaluateTranscriptMutation.isPending && evaluatingTranscriptId === tr.id) ||
                          tr.evaluation_status === 'pending' ||
                          tr.evaluation_status === 'analyzing' ||
                          !tr.transcript_text?.trim()
                        }
                        title={!tr.transcript_text?.trim() ? 'Add transcript text before AI analysis' : undefined}
                      >
                        {(evaluateTranscriptMutation.isPending && evaluatingTranscriptId === tr.id) ||
                        tr.evaluation_status === 'pending' ||
                        tr.evaluation_status === 'analyzing' ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Sparkles className="h-3 w-3" />
                        )}
                        {(evaluateTranscriptMutation.isPending && evaluatingTranscriptId === tr.id) ||
                        tr.evaluation_status === 'pending' ||
                        tr.evaluation_status === 'analyzing'
                          ? 'Analysing...'
                          : 'Analyse with AI'}
                      </Button>
                    )}
                    {evaluation && (
                      <>
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => {
                            setEvaluatingTranscriptId(tr.id);
                            evaluateTranscriptMutation.mutate(tr.id);
                          }}
                          disabled={
                            (evaluateTranscriptMutation.isPending && evaluatingTranscriptId === tr.id) ||
                            tr.evaluation_status === 'pending' ||
                            tr.evaluation_status === 'analyzing' ||
                            !tr.transcript_text?.trim()
                          }
                          title="Re-run AI Analysis"
                        >
                          {(evaluateTranscriptMutation.isPending && evaluatingTranscriptId === tr.id) ||
                          tr.evaluation_status === 'pending' ||
                          tr.evaluation_status === 'analyzing' ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3 w-3" />
                          )}
                          {(evaluateTranscriptMutation.isPending && evaluatingTranscriptId === tr.id) ||
                          tr.evaluation_status === 'pending' ||
                          tr.evaluation_status === 'analyzing'
                            ? 'Analysing...'
                            : 'Re-analyse'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => setExpandedEvalId(isExpanded ? null : tr.id)}
                        >
                          <span className="flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-[var(--status-success)]"></span>
                            {isExpanded ? 'Hide' : 'View'} Image Analysis
                          </span>
                        </Button>

                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={async (e) => {
                            e.preventDefault();
                            try {
                              const res = await apiFetch(`/transcripts/${tr.id}/meeting-summary/download`);
                              if (!res.ok) {
                                const err = await res.json().catch(() => ({}));
                                toast.fromError(
                                  err,
                                  'The PDF could not be opened. It may not have been generated yet.'
                                );
                                return;
                              }
                              const blob = await res.blob();
                              const url = window.URL.createObjectURL(blob);
                              setPdfPreviewUrl(url);
                              setShowPdfModal(true);
                            } catch (error) {
                              toast.error('The PDF preview could not be loaded.');
                            }
                          }}
                        >
                          <span className="flex items-center gap-1 text-[var(--status-danger)] hover:opacity-80">
                            <FileDown className="h-3.5 w-3.5" />
                            View PDF Analysis
                          </span>
                        </Button>

                        {tr.lark_doc_url ? (
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => window.open(tr.lark_doc_url, '_blank')}
                          >
                            <span className="flex items-center gap-1 text-primary hover:opacity-80">
                              <LinkIcon className="h-3.5 w-3.5" />
                              View Lark Docs Link
                            </span>
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="xs"
                            disabled
                            title="Lark Doc has not been created or synced yet"
                          >
                            <span className="flex items-center gap-1 text-muted-foreground opacity-60">
                              <LinkIcon className="h-3.5 w-3.5" />
                              Lark Docs (Not Synced)
                            </span>
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="xs"
                          disabled={
                            generateMeetingSummaryPdfMutation.isPending && evaluatingTranscriptId === tr.id
                          }
                          onClick={() => {
                            setEvaluatingTranscriptId(tr.id);
                            generateMeetingSummaryPdfMutation.mutate({
                              transcriptId: tr.id,
                              evaluationId: evaluation.id,
                            });
                          }}
                          title="Regenerate summary PDF, render image, build Lark Docs, and push all attachments to Lark Base."
                        >
                          <span className="flex items-center gap-1 text-primary hover:opacity-80">
                            {generateMeetingSummaryPdfMutation.isPending && evaluatingTranscriptId === tr.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3.5 w-3.5" />
                            )}
                            Sync & Push to Lark
                          </span>
                        </Button>
                      </>
                    )}
                    <button
                      onClick={() => deleteTranscriptMutation.mutate(tr.id)}
                      disabled={deleteTranscriptMutation.isPending}
                      className="rounded p-1 text-muted-foreground hover:bg-[color-mix(in_oklch,var(--status-danger)_10%,transparent)] hover:text-[var(--status-danger)]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Transcript text preview */}
                <div className="border-t border-border px-4 py-3 bg-muted/20">
                  {tr.transcript_text ? (
                    <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                      {tr.transcript_text}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Media file saved. Add or paste transcript text before running AI analysis.
                    </p>
                  )}
                </div>

                {/* BANTC Extracted Preview */}
                {(tr.bantc_json || evaluation?.bantc_extracted) && (
                  <div className="border-t border-border px-4 py-3 bg-muted/10">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-semibold text-foreground/85 flex items-center gap-1.5">
                        <Target className="h-3.5 w-3.5 text-primary" />
                        Extracted Meeting BANTC Qualification:
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        Synchronized to Discovery Workspace
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                      {(() => {
                        const b = tr.bantc_json || evaluation?.bantc_extracted || {};
                        return [
                          { label: 'Budget', val: b.budget, icon: '💰' },
                          { label: 'Authority', val: b.authority, icon: '👑' },
                          { label: 'Needs', val: b.needs, icon: '🎯' },
                          { label: 'Timeline', val: b.timeline, icon: '📅' },
                          { label: 'Competitor', val: b.competitor, icon: '⚔️' },
                        ].map((item) => (
                          <div key={item.label} className="p-2 rounded border border-border/60 bg-card">
                            <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                              <span>{item.icon}</span> {item.label}
                            </span>
                            <p
                              className="text-[11px] font-medium mt-0.5 line-clamp-2"
                              title={item.val || 'Not mentioned'}
                            >
                              {item.val || <span className="text-muted-foreground/50 italic">Not mentioned</span>}
                            </p>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}

                {/* Evaluation result */}
                {isExpanded && evaluation && (
                  <div className="border-t border-border bg-[color-mix(in_oklch,var(--brand)_4%,transparent)] p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-[var(--brand)]" />
                      <h4 className="font-semibold text-sm">AI Transcript Analysis</h4>
                    </div>

                    <AnalysisReportDialog
                      open={isExpanded}
                      onOpenChange={(open: boolean) => setExpandedEvalId(open ? tr.id : null)}
                      transcript={tr}
                      lead={lead?.data}
                    />

                    {tr.syncJobs?.length > 0 && (
                      <div className="border-t border-border pt-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                          Lark Base Sync Status
                        </p>
                        <div className="space-y-3">
                          {tr.syncJobs.map((job: any) => {
                            const isSuccess = job.status === 'success';
                            const isFailed = job.status === 'failed';
                            const responseStr = job.response_json || '{}';
                            let response: any = {};
                            try {
                              response = JSON.parse(responseStr);
                            } catch (e) {
                              response = {};
                            }

                            return (
                              <div key={job.id} className="text-sm p-3 border rounded-lg bg-card shadow-sm">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant={isSuccess ? 'success' : isFailed ? 'danger' : 'warning'}>
                                    {job.sync_type} - {job.status}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(job.created_at).toLocaleString()}
                                  </span>
                                </div>

                                {!isSuccess && job.error_message && (
                                  <p className="text-xs text-[var(--status-danger)] mt-2 font-medium">
                                    {job.error_message}
                                  </p>
                                )}
                                {response.action === 'skipped' && (
                                  <p className="text-xs text-muted-foreground mt-2 italic">
                                    Skipped: {response.reason}
                                  </p>
                                )}

                                {!isSuccess && !job.lark_record_id && (
                                  <p className="text-xs text-[var(--status-warning)] mt-2 italic">
                                    Warning: Missing Lark Record ID or Field Mappings. Ensure lead is synced first.
                                  </p>
                                )}

                                {response.payload && Object.keys(response.payload).length > 0 && (
                                  <div className="mt-3 bg-muted/30 p-2 rounded">
                                    <p className="text-[10px] font-bold text-muted-foreground mb-2 uppercase tracking-wider">
                                      Synced Fields Payload
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs">
                                      {Object.entries(response.payload).map(([k, v]) => (
                                        <div key={k} className="flex flex-col">
                                          <span className="font-semibold text-foreground/80">{k}</span>
                                          <span
                                            className="text-muted-foreground line-clamp-2"
                                            title={typeof v === 'object' ? JSON.stringify(v) : String(v)}
                                          >
                                            {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-border">
                      <p className="text-[10px] text-muted-foreground">
                        Analysed {new Date(evaluation.evaluated_at ?? evaluation.created_at).toLocaleString()}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={generateMeetingSummaryPdfMutation.isPending}
                          onClick={() => {
                            setEvaluatingTranscriptId(tr.id);
                            generateMeetingSummaryPdfMutation.mutate({
                              transcriptId: tr.id,
                              evaluationId: evaluation.id,
                            });
                          }}
                        >
                          {generateMeetingSummaryPdfMutation.isPending &&
                          evaluatingTranscriptId === tr.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Printer className="mr-2 h-4 w-4" />
                          )}
                          Generate Summary PDF
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={async (e) => {
                            e.preventDefault();
                            try {
                              const res = await apiFetch(`/transcripts/${tr.id}/meeting-summary/download`);
                              if (!res.ok) {
                                const err = await res.json().catch(() => ({}));
                                toast.fromError(
                                  err,
                                  'The PDF could not be downloaded. It may not have been generated yet.'
                                );
                                return;
                              }
                              const blob = await res.blob();
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              let filename = 'meeting-summary.pdf';
                              const disposition = res.headers.get('Content-Disposition');
                              if (disposition && disposition.indexOf('attachment') !== -1) {
                                const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
                                if (matches != null && matches[1]) {
                                  filename = matches[1].replace(/['"]/g, '');
                                }
                              }
                              a.download = filename;
                              document.body.appendChild(a);
                              a.click();
                              a.remove();
                              window.URL.revokeObjectURL(url);
                            } catch (error) {
                              toast.error('The PDF could not be downloaded.');
                            }
                          }}
                        >
                          <FileDown className="mr-2 h-4 w-4" />
                          Download PDF
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
