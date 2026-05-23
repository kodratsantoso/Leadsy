<?php

namespace App\Services\Sales;

use App\Models\Lead;
use App\Models\LeadActivity;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Auth;

/**
 * Lead Activity Service — Module B (Sales Activity & Lead Evaluation Engine)
 *
 * Implements activity timeline management with:
 * - Activity type routing (Call, WhatsApp, Meeting, Email, Follow-up, Note, etc.)
 * - Timeline queries and filtering
 * - Automatic activity logging for stage changes
 * - Activity counts and recency tracking
 * - BRD §4.1 & §4.2 compliance
 */
class LeadActivityService
{
    /**
     * Activity types enumeration
     */
    public const ACTIVITY_TYPES = [
        'Call',
        'WhatsApp',
        'Meeting',
        'Email',
        'Follow-up',
        'Note',
        'Internal Review',
        'Stage Change',
        'Contact Added',
        'Document Shared',
    ];

    /**
     * Log an activity for a lead
     */
    public function logActivity(
        Lead $lead,
        string $activityType,
        ?string $description = null,
        ?\DateTime $activityDate = null,
        ?int $userId = null
    ): LeadActivity {
        // Validate activity type
        if (! in_array($activityType, self::ACTIVITY_TYPES)) {
            $activityType = 'Note'; // Default to Note for invalid types
        }

        // Create activity
        $activity = $lead->activities()->create([
            'activity_type' => $activityType,
            'description' => $description ?? '',
            'activity_date' => $activityDate ?? Carbon::now(),
            'user_id' => $userId ?? Auth::id(),
        ]);

        return $activity;
    }

    /**
     * Log a stage change as an activity
     */
    public function logStageChange(
        Lead $lead,
        int $toStageId,
        ?int $fromStageId = null,
        ?string $notes = null
    ): LeadActivity {
        // Record in funnel history
        $lead->funnelHistories()->create([
            'from_stage_id' => $fromStageId,
            'to_stage_id' => $toStageId,
            'moved_by' => Auth::id(),
            'notes' => $notes,
        ]);

        // Log as activity
        $description = 'Lead moved to stage '.($lead->funnelStage?->name ?? 'Unknown');
        if ($notes) {
            $description .= ": {$notes}";
        }

        return $this->logActivity($lead, 'Stage Change', $description);
    }

    /**
     * Get activity timeline for a lead
     * Supports filtering by type, date range, user
     */
    public function getTimeline(
        Lead $lead,
        ?string $activityType = null,
        ?Carbon $fromDate = null,
        ?Carbon $toDate = null,
        ?int $limit = null
    ): Collection {
        $query = $lead->activities();

        if ($activityType) {
            $query->where('activity_type', $activityType);
        }

        if ($fromDate) {
            $query->where('activity_date', '>=', $fromDate);
        }

        if ($toDate) {
            $query->where('activity_date', '<=', $toDate);
        }

        $query->orderByDesc('activity_date');

        if ($limit) {
            $query->limit($limit);
        }

        return $query->get();
    }

    /**
     * Get activity counts by type
     */
    public function getActivityCounts(Lead $lead): array
    {
        return $lead->activities()
            ->select('activity_type')
            ->selectRaw('COUNT(*) as count')
            ->groupBy('activity_type')
            ->get()
            ->pluck('count', 'activity_type')
            ->toArray();
    }

    /**
     * Get latest activity of each type
     */
    public function getLatestActivities(Lead $lead, int $limit = 5): Collection
    {
        return $lead->activities()
            ->orderByDesc('activity_date')
            ->limit($limit)
            ->get();
    }

    /**
     * Get last activity date
     */
    public function getLastActivityDate(Lead $lead): ?Carbon
    {
        return $lead->activities()
            ->latest('activity_date')
            ->first()?->activity_date;
    }

    /**
     * Get days since last activity
     */
    public function getDaysSinceLastActivity(Lead $lead): ?int
    {
        $lastActivity = $this->getLastActivityDate($lead);
        if (! $lastActivity) {
            return null;
        }

        return Carbon::now()->diffInDays($lastActivity);
    }

    /**
     * Get activity count in a period
     */
    public function getActivityCountInPeriod(
        Lead $lead,
        int $days = 30
    ): int {
        return $lead->activities()
            ->where('activity_date', '>=', Carbon::now()->subDays($days))
            ->count();
    }

    /**
     * Check if activity is recent
     */
    public function isRecentlyActive(Lead $lead, int $dayThreshold = 7): bool
    {
        $daysSince = $this->getDaysSinceLastActivity($lead);

        return $daysSince !== null && $daysSince <= $dayThreshold;
    }

    /**
     * Delete an activity
     */
    public function deleteActivity(LeadActivity $activity): void
    {
        $activity->delete();
    }

    /**
     * Get activity summary for lead detail page
     */
    public function getActivitySummary(Lead $lead): array
    {
        return [
            'total_activities' => $lead->activities()->count(),
            'by_type' => $this->getActivityCounts($lead),
            'last_activity' => $this->getLastActivityDate($lead),
            'days_since_last' => $this->getDaysSinceLastActivity($lead),
            'activity_count_30days' => $this->getActivityCountInPeriod($lead, 30),
            'is_recently_active' => $this->isRecentlyActive($lead),
            'recent_activities' => $this->getLatestActivities($lead, 3)
                ->map(fn ($a) => [
                    'id' => $a->id,
                    'type' => $a->activity_type,
                    'date' => $a->activity_date,
                    'description' => $a->description,
                ])
                ->toArray(),
        ];
    }
}
