'use client';

import React from 'react';
import { CheckCircle, CornerDownRight, Info } from 'lucide-react';

interface MeetingsTabProps {
  meetingsList: any[];
  onNavigateToActivities: () => void;
}

export function MeetingsTab({
  meetingsList,
  onNavigateToActivities,
}: MeetingsTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-[var(--status-warning)]/40 bg-[color-mix(in_oklch,var(--status-warning)_8%,transparent)] p-4">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--status-warning)]" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-[var(--status-warning)]">
            Meetings are now logged in Activities
          </p>
          <p className="text-xs text-muted-foreground">
            Log new meetings as a <strong>Meeting</strong> activity in the Activities tab. The
            meeting type, summary, outcome, and next follow-up can all be captured there. Existing
            meeting records remain visible below.
          </p>
          <button
            onClick={onNavigateToActivities}
            className="mt-1 flex items-center gap-1 text-xs font-medium text-[var(--brand)] hover:underline"
          >
            Go to Activities <CornerDownRight className="h-3 w-3" />
          </button>
        </div>
      </div>

      {meetingsList.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Existing meeting records
          </p>
          {meetingsList.map((meeting: any) => (
            <div key={meeting.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{meeting.meeting_type}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(meeting.meeting_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
              {meeting.summary && (
                <p className="mt-2 text-sm text-muted-foreground">{meeting.summary}</p>
              )}
              {meeting.key_points?.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Key Points</p>
                  <ul className="space-y-0.5">
                    {meeting.key_points.map((k: string, i: number) => (
                      <li key={i} className="text-xs flex items-start gap-1">
                        <CheckCircle className="h-3 w-3 mt-0.5 shrink-0 text-[var(--status-success)]" />
                        {k}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No legacy meeting records.</p>
      )}
    </div>
  );
}
