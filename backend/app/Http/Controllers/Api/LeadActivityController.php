<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LeadActivity\StoreLeadActivityRequest;
use App\Http\Requests\LeadActivity\UpdateLeadActivityRequest;
use App\Jobs\RunLeadIntelligenceJob;
use App\Models\Lead;
use App\Services\AuditService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Activities, meetings and follow-up progress for a lead.
 *
 * Split out of LeadController. Meetings live here rather than in their own
 * controller because the application treats a meeting as a kind of activity —
 * the deprecated Meetings tab points users at Activities.
 */
class LeadActivityController extends Controller
{
    /** POST /api/leads/{lead}/activities */
    public function logActivity(StoreLeadActivityRequest $request, Lead $lead): JsonResponse
    {
        $data = $request->validated();

        $activity = $lead->activities()->create([
            'activity_type' => $data['activity_type'],
            'description' => $data['description'] ?? '',
            'outcome' => $data['outcome'] ?? null,
            'budget' => $data['budget'] ?? null,
            'authority' => $data['authority'] ?? null,
            'needs' => $data['needs'] ?? null,
            'timeline' => $data['timeline'] ?? null,
            'competitor' => $data['competitor'] ?? null,
            'activity_date' => isset($data['activity_date']) ? $data['activity_date'] : now(),
            'next_follow_up_date' => $data['next_follow_up_date'] ?? null,
            'user_id' => $request->user()?->id,
        ]);

        // Sales explicitly named a competitor on this activity — sync it onto
        // the Lead (previously never happened; only LeadActivity.competitor was
        // written) and auto-generate a battle card for it.
        if (\App\Services\Sales\CompetitiveBattleCardService::isMeaningfulCompetitorName($data['competitor'] ?? null)) {
            $lead->update(['competitor' => $data['competitor']]);
            \App\Jobs\GenerateBattleCardJob::dispatch($lead->id, $data['competitor']);
        }

        if (! empty($data['transcript_id'])) {
            $transcript = $lead->transcripts()->find($data['transcript_id']);
            if ($transcript && ! $transcript->activity_id) {
                $transcript->update(['activity_id' => $activity->id]);
            }
        }

        // Optionally move the lead to a new funnel stage
        if (! empty($data['funnel_stage_id']) && $data['funnel_stage_id'] != $lead->funnel_stage_id) {
            $lead->funnelHistory()->create([
                'from_stage_id' => $lead->funnel_stage_id,
                'to_stage_id' => $data['funnel_stage_id'],
                'moved_by' => $request->user()?->id,
            ]);
            $lead->update(['funnel_stage_id' => $data['funnel_stage_id']]);
            AuditService::log('stage_change_via_activity', 'leads', $lead, null, [
                'from_stage_id' => $lead->funnel_stage_id,
                'to_stage_id' => $data['funnel_stage_id'],
                'activity_id' => $activity->id,
            ]);
        }

        AuditService::log('log_activity', 'lead_activities', $activity, null, [
            'activity_type' => $data['activity_type'],
        ]);

        app(\App\Services\Sales\LeadInteractionRescoreService::class)->triggerRescore($lead, "manual_activity:{$data['activity_type']}");

        return response()->json(['data' => $activity->load('user')], 201);
    }

    /** GET /api/leads/{lead}/activities — Get lead activities */
    public function getActivities(Lead $lead): JsonResponse
    {
        $activities = $lead->activities()
            ->with('user')
            ->orderByDesc('activity_date')
            ->paginate(50);

        return response()->json($activities);
    }

    /** PUT /api/leads/{lead}/activities/{activity} */
    public function updateActivity(UpdateLeadActivityRequest $request, Lead $lead, $activityId): JsonResponse
    {
        $activity = $lead->activities()->findOrFail($activityId);
        $data = $request->validated();
        $activity->update($data);
        AuditService::log('update_activity', 'lead_activities', $activity, $activity->toArray());

        if (\App\Services\Sales\CompetitiveBattleCardService::isMeaningfulCompetitorName($data['competitor'] ?? null)) {
            $lead->update(['competitor' => $data['competitor']]);
            \App\Jobs\GenerateBattleCardJob::dispatch($lead->id, $data['competitor']);
        }

        \App\Jobs\RunLeadIntelligenceJob::dispatch($lead->id);

        return response()->json(['data' => $activity->load('user')]);
    }

    /** DELETE /api/leads/{lead}/activities/{activity} */
    public function deleteActivity(Lead $lead, $activityId): JsonResponse
    {
        $activity = $lead->activities()->findOrFail($activityId);
        $activity->delete();

        AuditService::log('delete_activity', 'lead_activities', $activity, $activity->toArray());

        return response()->json(['message' => 'Activity deleted']);
    }

    /** POST /api/leads/{lead}/meetings */
    public function logMeeting(Request $request, Lead $lead): JsonResponse
    {
        $data = $request->validate([
            'meeting_date' => 'required|date',
            'meeting_type' => 'nullable|string',
            'summary' => 'nullable|string',
            'participants' => 'nullable|array',
            'key_points' => 'nullable|array',
            'objections' => 'nullable|array',
            'next_steps' => 'nullable|array',
            'follow_up_date' => 'nullable|date',
        ]);

        $data['created_by'] = $request->user()?->id;

        $meeting = $lead->meetings()->create($data);

        // Also log it on the timeline globally
        $lead->activities()->create([
            'activity_type' => 'Meeting',
            'description' => 'Logged a meeting: '.($data['summary'] ?? 'No summary'),
            'activity_date' => $data['meeting_date'],
            'related_entity_type' => get_class($meeting),
            'related_entity_id' => $meeting->id,
            'user_id' => $request->user()?->id,
        ]);

        return response()->json(['data' => $meeting], 201);
    }

    /** GET /api/leads/{lead}/meetings */
    public function getMeetings(Lead $lead): JsonResponse
    {
        $meetings = $lead->meetings()
            ->orderByDesc('meeting_date')
            ->paginate(50);

        return response()->json($meetings);
    }

    /** PUT /api/leads/{lead}/meetings/{meeting} */
    public function updateMeeting(Request $request, Lead $lead, $meetingId): JsonResponse
    {
        $meeting = $lead->meetings()->findOrFail($meetingId);
        $data = $request->validate([
            'meeting_date' => 'sometimes|date',
            'meeting_type' => 'nullable|string',
            'summary' => 'nullable|string',
            'participants' => 'nullable|array',
            'key_points' => 'nullable|array',
            'objections' => 'nullable|array',
            'next_steps' => 'nullable|array',
            'follow_up_date' => 'nullable|date',
        ]);
        $meeting->update($data);

        return response()->json(['data' => $meeting]);
    }

    /** DELETE /api/leads/{lead}/meetings/{meeting} */
    public function deleteMeeting(Lead $lead, $meetingId): JsonResponse
    {
        $meeting = $lead->meetings()->findOrFail($meetingId);
        $meeting->delete();

        AuditService::log('delete_meeting', 'lead_meetings', $meeting, $meeting->toArray());

        return response()->json(['message' => 'Meeting deleted']);
    }

    /** GET /api/leads/{lead}/follow-ups */
    public function getFollowUps(Lead $lead): JsonResponse
    {
        $followUps = $lead->followUps()
            ->orderBy('due_date')
            ->paginate(50);

        return response()->json($followUps);
    }

    /* ═══════════════════════════════════════════════════════════ */
    /*  MODULE C: Contact Enrichment Engine (Tier 2.5) */
    /* ═══════════════════════════════════════════════════════════ */

    /** GET /api/leads/{lead}/progress — Get lead progress summary */
    public function getProgress(Lead $lead): JsonResponse
    {
        $latestActivity = $lead->activities()->latest('activity_date')->first();
        $latestMeeting = $lead->meetings()->latest('meeting_date')->first();
        $latestEvaluation = $lead->aiEvaluations()->latest()->first();
        
        $nextFollowUpActivity = $lead->activities()
            ->whereNotNull('next_follow_up_date')
            ->orderBy('activity_date', 'desc')
            ->first();

        $latestScore = $lead->scores()->latest()->first();
        $latestQualification = $lead->qualifications()->latest()->first();

        return response()->json([
            'lead_id' => $lead->id,
            'total_activities' => $lead->activities()->count(),
            'activity_breakdown' => $lead->activities()
                ->select('activity_type')
                ->selectRaw('COUNT(*) as count')
                ->groupBy('activity_type')
                ->get(),
            'last_interaction' => $latestActivity ? [
                'date' => $latestActivity->activity_date,
                'type' => $latestActivity->activity_type,
                'description' => $latestActivity->description,
            ] : null,
            'last_meeting' => $latestMeeting ? [
                'date' => $latestMeeting->meeting_date,
                'type' => $latestMeeting->meeting_type,
                'summary' => $latestMeeting->summary,
            ] : null,
            'latest_evaluation' => $latestEvaluation ? [
                'sentiment' => $latestEvaluation->sentiment,
                'intent_level' => $latestEvaluation->intent_level,
                'interest_level' => $latestEvaluation->interest_level,
                'buying_signals' => $latestEvaluation->buying_signals,
            ] : null,
            'next_follow_up' => $nextFollowUpActivity ? [
                'due_date' => $nextFollowUpActivity->next_follow_up_date,
                'purpose' => $nextFollowUpActivity->activity_type . ': ' . \Illuminate\Support\Str::limit($nextFollowUpActivity->description, 50),
                'assigned_to' => $nextFollowUpActivity->user_id,
                'is_overdue' => \Carbon\Carbon::parse($nextFollowUpActivity->next_follow_up_date)->endOfDay()->isPast(),
            ] : null,
            'current_stage' => $lead->funnelStage?->name,
            'current_score' => $latestScore?->score ?? $lead->lead_score,
            'current_grade' => $latestScore?->grade,
            'current_qualification' => $latestQualification?->qualified,
        ]);
    }

    /* ═══════════════════════════════════════════════════════════ */
    /*  MODULE B: Sales Activity & Evaluation */
    /* ═══════════════════════════════════════════════════════════ */
}
