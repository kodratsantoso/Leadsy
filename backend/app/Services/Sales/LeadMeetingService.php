<?php

namespace App\Services\Sales;

use App\Models\Lead;
use App\Models\LeadMeeting;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Auth;

/**
 * Lead Meeting Service — Module B (Sales Activity & Lead Evaluation Engine)
 *
 * Implements meeting management with:
 * - CRUD operations for meeting records
 * - Meeting timeline integration
 * - Auto-activity logging on creation
 * - Meeting details persistence (date, type, participants, summary, outcomes)
 * - Follow-up tracking integration
 * - BRD §4.2 compliance
 */
class LeadMeetingService
{
    /**
     * Meeting types enumeration
     */
    public const MEETING_TYPES = [
        'Virtual',
        'In-Person',
        'Phone Call',
        'Video Conference',
        'Hybrid',
    ];

    /**
     * Create a meeting for a lead
     */
    public function createMeeting(
        Lead $lead,
        array $data
    ): LeadMeeting {
        $meeting = $lead->meetings()->create([
            'meeting_date' => $data['meeting_date'],
            'meeting_type' => $data['meeting_type'] ?? 'Virtual',
            'participants' => $data['participants'] ?? [],
            'summary' => $data['summary'] ?? '',
            'key_points' => $data['key_points'] ?? [],
            'objections' => $data['objections'] ?? [],
            'next_steps' => $data['next_steps'] ?? [],
            'follow_up_date' => $data['follow_up_date'] ?? null,
            'created_by' => Auth::id(),
        ]);

        // Auto-log as activity
        $activityService = app(LeadActivityService::class);
        $summary = substr($meeting->summary, 0, 100).(strlen($meeting->summary) > 100 ? '...' : '');
        $activityService->logActivity(
            $lead,
            'Meeting',
            "{$meeting->meeting_type} meeting: {$summary}",
            $meeting->meeting_date
        );

        // Create follow-up if specified
        if ($meeting->follow_up_date) {
            $this->createFollowUp(
                $lead,
                $meeting->follow_up_date,
                'Follow up from '.$meeting->meeting_date->format('M d, Y'),
                Auth::id()
            );
        }

        return $meeting;
    }

    /**
     * Update a meeting
     */
    public function updateMeeting(LeadMeeting $meeting, array $data): LeadMeeting
    {
        $meeting->update([
            'meeting_date' => $data['meeting_date'] ?? $meeting->meeting_date,
            'meeting_type' => $data['meeting_type'] ?? $meeting->meeting_type,
            'participants' => $data['participants'] ?? $meeting->participants,
            'summary' => $data['summary'] ?? $meeting->summary,
            'key_points' => $data['key_points'] ?? $meeting->key_points,
            'objections' => $data['objections'] ?? $meeting->objections,
            'next_steps' => $data['next_steps'] ?? $meeting->next_steps,
            'follow_up_date' => $data['follow_up_date'] ?? $meeting->follow_up_date,
        ]);

        return $meeting->fresh();
    }

    /**
     * Delete a meeting
     */
    public function deleteMeeting(LeadMeeting $meeting): void
    {
        // Delete related follow-ups if needed
        if ($meeting->follow_up_date) {
            $meeting->lead->followUps()
                ->where('due_date', $meeting->follow_up_date)
                ->delete();
        }

        $meeting->delete();
    }

    /**
     * Get meetings timeline for a lead
     */
    public function getTimeline(
        Lead $lead,
        ?Carbon $fromDate = null,
        ?Carbon $toDate = null
    ): Collection {
        $query = $lead->meetings();

        if ($fromDate) {
            $query->where('meeting_date', '>=', $fromDate);
        }

        if ($toDate) {
            $query->where('meeting_date', '<=', $toDate);
        }

        return $query->orderByDesc('meeting_date')->get();
    }

    /**
     * Get upcoming meetings for a lead
     */
    public function getUpcomingMeetings(Lead $lead, int $daysAhead = 30): Collection
    {
        return $lead->meetings()
            ->whereBetween('meeting_date', [
                Carbon::now(),
                Carbon::now()->addDays($daysAhead),
            ])
            ->orderBy('meeting_date')
            ->get();
    }

    /**
     * Get past meetings for a lead
     */
    public function getPastMeetings(Lead $lead, int $limit = 10): Collection
    {
        return $lead->meetings()
            ->where('meeting_date', '<', Carbon::now())
            ->orderByDesc('meeting_date')
            ->limit($limit)
            ->get();
    }

    /**
     * Get last meeting
     */
    public function getLastMeeting(Lead $lead): ?LeadMeeting
    {
        return $lead->meetings()
            ->where('meeting_date', '<=', Carbon::now())
            ->latest('meeting_date')
            ->first();
    }

    /**
     * Get meeting count
     */
    public function getMeetingCount(Lead $lead): int
    {
        return $lead->meetings()->count();
    }

    /**
     * Get meeting summary for lead detail
     */
    public function getMeetingSummary(Lead $lead): array
    {
        $lastMeeting = $this->getLastMeeting($lead);
        $upcomingMeetings = $this->getUpcomingMeetings($lead, 30);

        return [
            'total_meetings' => $this->getMeetingCount($lead),
            'last_meeting' => $lastMeeting ? [
                'date' => $lastMeeting->meeting_date,
                'type' => $lastMeeting->meeting_type,
                'summary' => $lastMeeting->summary,
                'next_steps' => $lastMeeting->next_steps,
            ] : null,
            'upcoming_count' => $upcomingMeetings->count(),
            'upcoming' => $upcomingMeetings
                ->map(fn ($m) => [
                    'id' => $m->id,
                    'date' => $m->meeting_date,
                    'type' => $m->meeting_type,
                ])
                ->toArray(),
        ];
    }

    /**
     * Create a follow-up from meeting
     */
    private function createFollowUp(Lead $lead, Carbon $dueDate, string $purpose, ?int $userId = null): void
    {
        $lead->followUps()->create([
            'due_date' => $dueDate,
            'status' => 'pending',
            'purpose' => $purpose,
            'assigned_to' => $userId ?? Auth::id(),
        ]);
    }

    /**
     * Export meeting summary (for reports)
     */
    public function exportMeetingSummary(Lead $lead, Carbon $fromDate, Carbon $toDate): array
    {
        $meetings = $this->getTimeline($lead, $fromDate, $toDate);

        return [
            'lead_id' => $lead->id,
            'company_name' => $lead->company_name,
            'period' => $fromDate->format('Y-m-d').' to '.$toDate->format('Y-m-d'),
            'total_meetings' => $meetings->count(),
            'meetings' => $meetings->map(fn ($m) => [
                'date' => $m->meeting_date->format('Y-m-d H:i'),
                'type' => $m->meeting_type,
                'participants' => $m->participants,
                'summary' => $m->summary,
                'key_points' => $m->key_points,
                'objections' => $m->objections,
                'next_steps' => $m->next_steps,
            ])->toArray(),
        ];
    }
}
