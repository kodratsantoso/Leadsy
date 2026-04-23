<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\QualificationWorkflowReview;
use App\Services\AuditService;
use App\Services\Lead\HumanVerificationWorkflowService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class QualificationWorkflowReviewController extends Controller
{
    public function __construct(private readonly HumanVerificationWorkflowService $workflowService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $query = $this->workflowService->queueQuery()->orderByDesc('id');

        if ($request->filled('status')) {
            if ($request->status === 'open') {
                $query->whereIn('status', ['pending', 'in_review']);
            } else {
                $query->where('status', $request->status);
            }
        }

        if ($request->filled('decision')) {
            $query->where('decision', $request->decision);
        }

        if ($request->filled('reviewer_id')) {
            $query->where('reviewed_by', $request->reviewer_id);
        }

        if ($request->filled('search')) {
            $search = '%' . $request->search . '%';
            $query->where(function ($inner) use ($search) {
                $inner->whereHas('lead', fn ($lead) => $lead->where('company_name', 'ilike', $search))
                    ->orWhereHas('requester', fn ($user) => $user->where('name', 'ilike', $search))
                    ->orWhereHas('reviewer', fn ($user) => $user->where('name', 'ilike', $search))
                    ->orWhere('justification', 'ilike', $search)
                    ->orWhere('decision_reason', 'ilike', $search);
            });
        }

        $reviews = $query->get();

        return response()->json(['data' => $reviews]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'workflow_id' => 'required|exists:qualification_workflows,id',
            'lead_id' => 'nullable|exists:leads,id',
            'lead_qualification_id' => 'nullable|exists:lead_qualifications,id',
            'recommended_status' => 'nullable|string|max:50',
            'justification' => 'required|string',
            'review_payload' => 'nullable|array',
            'due_at' => 'nullable|date',
        ]);

        $review = QualificationWorkflowReview::create([
            'tenant_id' => $request->user()?->tenant_id,
            ...$data,
            'status' => 'pending',
            'requested_by' => $request->user()?->id,
        ]);

        AuditService::logCreated('qualification_workflow_reviews', $review);

        return response()->json(['data' => $review->load(['workflow.stages', 'lead', 'qualification'])], 201);
    }

    public function update(Request $request, int $qualificationWorkflowReview): JsonResponse
    {
        $review = QualificationWorkflowReview::findOrFail($qualificationWorkflowReview);

        $data = $request->validate([
            'status' => 'nullable|in:pending,in_review,approved,rejected,overridden',
            'current_stage_code' => 'nullable|string|max:100',
            'final_status' => 'nullable|string|max:50',
            'justification' => 'nullable|string',
            'override_reason' => 'nullable|string',
            'review_payload' => 'nullable|array',
        ]);

        $original = $review->toArray();

        $review->update([
            ...$data,
            'reviewed_by' => $request->user()?->id,
            'reviewed_at' => now(),
        ]);

        $review->refresh();

        AuditService::logUpdated('qualification_workflow_reviews', $review, $original);

        return response()->json([
            'data' => $review->load(['workflow.stages', 'lead', 'qualification', 'requester', 'reviewer']),
        ]);
    }

    public function decide(Request $request, QualificationWorkflowReview $qualificationWorkflowReview): JsonResponse
    {
        $data = $request->validate([
            'decision' => 'required|in:approve,reject,hold,override_score',
            'reason' => 'required|string',
            'final_status' => 'nullable|in:pending,eligible,potential,not_eligible',
            'score_override' => 'nullable|integer|min:0|max:100',
            'current_stage_code' => 'nullable|string|max:100',
        ]);

        $review = $this->workflowService->decide(
            $qualificationWorkflowReview,
            $request->user(),
            $data
        );

        return response()->json(['data' => $review]);
    }
}
