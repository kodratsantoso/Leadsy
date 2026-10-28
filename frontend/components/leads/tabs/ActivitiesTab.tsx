'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Activity, Calendar, Pencil, Plus, Trash2 } from 'lucide-react';

interface ActivitiesTabProps {
  activitiesList: any[];
  onOpenActivityModal: (activity?: any) => void;
  onDeleteActivity: (id: number) => void;
}

export function ActivitiesTab({
  activitiesList,
  onOpenActivityModal,
  onDeleteActivity,
}: ActivitiesTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {activitiesList.length > 0
            ? `${activitiesList.length} interaction${activitiesList.length !== 1 ? 's' : ''} recorded`
            : 'No interactions yet'}
        </p>
        <Button onClick={() => onOpenActivityModal()} size="sm">
          <Plus className="h-3.5 w-3.5" /> Log Activity
        </Button>
      </div>

      {/* Timeline */}
      {activitiesList.length > 0 ? (
        <div className="relative space-y-0">
          <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border" />
          {activitiesList.map((activity: any) => (
            <div key={activity.id} className="relative flex gap-4 pb-6 last:pb-0">
              <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card">
                <Activity className="h-4 w-4 text-[var(--brand)]" />
              </div>
              <div className="flex-1 rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold">{activity.activity_type}</span>
                      {activity.user?.name && (
                        <span className="text-xs text-muted-foreground">by {activity.user.name}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(activity.activity_date).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => onOpenActivityModal(activity)}
                      className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => onDeleteActivity(activity.id)}
                      className="rounded p-1 text-muted-foreground hover:bg-[color-mix(in_oklch,var(--status-danger)_10%,transparent)] hover:text-[var(--status-danger)]"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                {activity.description && (
                  <p className="mt-2 text-sm text-muted-foreground">{activity.description}</p>
                )}
                {activity.outcome && (
                  <div className="mt-2 rounded-lg bg-[color-mix(in_oklch,var(--status-success)_8%,transparent)] border border-[var(--status-success)]/20 px-3 py-2">
                    <p className="text-xs font-medium text-[var(--status-success)]">Outcome</p>
                    <p className="text-sm">{activity.outcome}</p>
                  </div>
                )}
                {activity.activity_type === 'Meeting' &&
                  (activity.budget ||
                    activity.authority ||
                    activity.needs ||
                    activity.timeline ||
                    activity.competitor) && (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                      {[
                        ['Budget', activity.budget],
                        ['Authority', activity.authority],
                        ['Needs', activity.needs],
                        ['Timeline', activity.timeline],
                        ['Competitor', activity.competitor],
                      ]
                        .filter(([, value]) => Boolean(value))
                        .map(([label, value]) => (
                          <div
                            key={label}
                            className="rounded-lg border border-border bg-muted/20 px-3 py-2"
                          >
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                              {label}
                            </p>
                            <p className="mt-1 line-clamp-3 text-xs text-foreground">{value}</p>
                          </div>
                        ))}
                    </div>
                  )}
                {activity.next_follow_up_date && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    Next follow-up: {new Date(activity.next_follow_up_date).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-16 text-center">
          <Activity className="mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">No activities yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Log the first interaction to start the timeline.
          </p>
        </div>
      )}
    </div>
  );
}
