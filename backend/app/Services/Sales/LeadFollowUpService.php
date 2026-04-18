<?php

namespace App\Services\Sales;

use App\Models\Lead;
use App\Models\LeadFollowUp;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;

/**
 * Lead Follow-Up Service — Module B (Sales Activity & Lead Evaluation Engine)
 * 
 * Implements follow-up tracking and management with:
 * - Follow-up creation and status management
 * - Overdue detection
 * - Assignment to team members
 * - Next best action logic
 * - Timeline integration
 * - BRD §4.5 compliance
 */
class LeadFollowUpService
{
    /**
     * Follow-up statuses
     */
    public const FOLLOW_UP_STATUSES = [
        'pending',
        'completed',
        'overdue',
        'cancelled',
    ];

    /**
     * Create a follow-up for a lead
     */
    public function createFollowUp(
        Lead $lead,
        Carbon $dueDate,
        ?string $purpose = null,
        ?int $assignedTo = null
    ): LeadFollowUp {
        $followUp = $lead->followUps()->create([
            'due_date' => $dueDate,
            'status' => 'pending',
            'purpose' => $purpose ?? 'Follow-up',
            'assigned_to' => $assignedTo ?? Auth::id(),
        ]);

        return $followUp;
    }

    /**
     * Mark a follow-up as completed
     */
    public function completeFollowUp(LeadFollowUp $followUp): LeadFollowUp
    {
        $followUp->update(['status' => 'completed']);
        return $followUp->fresh();
    }

    /**
     * Mark a follow-up as cancelled
     */
    public function cancelFollowUp(LeadFollowUp $followUp): LeadFollowUp
    {
        $followUp->update(['status' => 'cancelled']);
        return $followUp->fresh();
    }

    /**
     * Update a follow-up
     */
    public function updateFollowUp(LeadFollowUp $followUp, array $data): LeadFollowUp
    {
        $followUp->update([
            'due_date' => $data['due_date'] ?? $followUp->due_date,
            'purpose' => $data['purpose'] ?? $followUp->purpose,
            'assigned_to' => $data['assigned_to'] ?? $followUp->assigned_to,
        ]);

        return $followUp->fresh();
    }

    /**
     * Delete a follow-up
     */
    public function deleteFollowUp(LeadFollowUp $followUp): void
    {
        $followUp->delete();
    }

    /**
     * Get pending follow-ups for a lead
     */
    public function getPendingFollowUps(Lead $lead): \Illuminate\Database\Eloquent\Collection
    {
        return $lead->followUps()
            ->where('status', 'pending')
            ->orderBy('due_date')
            ->get();
    }

    /**
     * Get overdue follow-ups for a lead
     */
    public function getOverdueFollowUps(Lead $lead): \Illuminate\Database\Eloquent\Collection
    {
        return $lead->followUps()
            ->where('status', 'pending')
            ->where('due_date', '<', Carbon::now())
            ->orderBy('due_date')
            ->get();
    }

    /**
     * Get next follow-up for a lead
     */
    public function getNextFollowUp(Lead $lead): ?LeadFollowUp
    {
        return $lead->followUps()
            ->where('status', 'pending')
            ->orderBy('due_date')
            ->first();
    }

    /**
     * Check if lead is overdue for follow-up
     */
    public function isOverdueForFollowUp(Lead $lead): bool
    {
        return $this->getOverdueFollowUps($lead)->count() > 0;
    }

    /**
     * Get days until next follow-up
     */
    public function getDaysUntilNextFollowUp(Lead $lead): ?int
    {
        $nextFollowUp = $this->getNextFollowUp($lead);
        if (!$nextFollowUp) {
            return null;
        }

        $diff = Carbon::now()->diffInDays($nextFollowUp->due_date, false);
        return $diff > 0 ? $diff : null; // null if overdue
    }

    /**
     * Get follow-up summary for lead detail
     */
    public function getFollowUpSummary(Lead $lead): array
    {
        $nextFollowUp = $this->getNextFollowUp($lead);
        $overdueCount = $this->getOverdueFollowUps($lead)->count();
        $pendingCount = $this->getPendingFollowUps($lead)->count();

        return [
            'total_follow_ups' => $lead->followUps()->count(),
            'pending_count' => $pendingCount,
            'overdue_count' => $overdueCount,
            'is_overdue' => $overdueCount > 0,
            'next_follow_up' => $nextFollowUp ? [
                'id' => $nextFollowUp->id,
                'due_date' => $nextFollowUp->due_date,
                'purpose' => $nextFollowUp->purpose,
                'assigned_to' => $nextFollowUp->assigned_to,
                'days_until' => $this->getDaysUntilNextFollowUp($lead),
            ] : null,
            'overdue_details' => $this->getOverdueFollowUps($lead)
                ->map(fn($f) => [
                    'id' => $f->id,
                    'due_date' => $f->due_date,
                    'purpose' => $f->purpose,
                    'days_overdue' => Carbon::now()->diffInDays($f->due_date),
                ])
                ->toArray(),
        ];
    }

    /**
     * Suggest next follow-up based on activity
     */
    public function suggestNextFollowUpDate(Lead $lead): Carbon
    {
        $activityService = app(LeadActivityService::class);
        $daysSinceActivity = $activityService->getDaysSinceLastActivity($lead);

        // Suggest based on last activity and current status
        if ($daysSinceActivity === null || $daysSinceActivity > 30) {
            // No recent activity - follow up soon
            return Carbon::now()->addDays(3);
        }

        if ($daysSinceActivity > 14) {
            // Some activity but not recent
            return Carbon::now()->addDays(7);
        }

        // Recent activity - follow up in 10-14 days
        return Carbon::now()->addDays(rand(10, 14));
    }

    /**
     * Suggest next follow-up based on meeting outcome
     */
    public function suggestFollowUpFromMeeting(Lead $lead, ?\Carbon $meetingDate = null): Carbon
    {
        $meetingDate = $meetingDate ?? Carbon::now();

        // Check if meeting had explicit follow-up date
        $lastMeeting = $lead->meetings()
            ->where('meeting_date', '<=', $meetingDate)
            ->latest('meeting_date')
            ->first();

        if ($lastMeeting && $lastMeeting->follow_up_date) {
            return $lastMeeting->follow_up_date;
        }

        // Default: follow-up within 3-7 days
        return $meetingDate->addDays(rand(3, 7));
    }

    /**
     * Create follow-up from activity
     */
    public function createFollowUpFromActivity(Lead $lead, string $activityType): ?LeadFollowUp
    {
        // Different follow-up times based on activity type
        $daysToAdd = match ($activityType) {
            'Call' => 7,
            'Meeting' => 3,
            'Email' => 5,
            'WhatsApp' => 4,
            default => 7,
        };

        $dueDate = Carbon::now()->addDays($daysToAdd);

        return $this->createFollowUp(
            $lead,
            $dueDate,
            "Follow-up from {$activityType}",
            Auth::id()
        );
    }

    /**
     * Get follow-ups due in next N days for multiple leads (for scheduling/reminders)
     */
    public function getFollowUpsDueInDays(int $days = 7): \Illuminate\Database\Eloquent\Collection
    {
        return LeadFollowUp::where('status', 'pending')
            ->whereBetween('due_date', [
                Carbon::now(),
                Carbon::now()->addDays($days),
            ])
            ->with('lead')
            ->orderBy('due_date')
            ->get();
    }

    /**
     * Get all overdue follow-ups (for team dashboard)
     */
    public function getAllOverdueFollowUps(): \Illuminate\Database\Eloquent\Collection
    {
        return LeadFollowUp::where('status', 'pending')
            ->where('due_date', '<', Carbon::now())
            ->with('lead', 'assignedUser')
            ->orderBy('due_date')
            ->get();
    }
}
