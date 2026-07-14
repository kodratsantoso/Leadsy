<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\EnrichLeadContactsJob;
use App\Jobs\EnrichLeadJob;
use App\Jobs\RunLeadIntelligenceJob;
use App\Jobs\ScoreLeadJob;
use App\Models\FunnelStage;
use App\Models\Lead;
use App\Models\LeadBantcQuestionGuide;
use App\Models\LeadChannelType;
use App\Models\LeadContact;
use App\Models\LeadOutcome;
use App\Models\LeadSourceType;
use App\Models\User;
use App\Services\AuditService;
use App\Services\DeduplicationService;
use App\Services\Lead\HumanVerificationWorkflowService;
use App\Services\Lead\LeadAIAnalysisService;
use App\Services\Lead\LeadDiscoveryService;
use App\Services\Lead\LeadProductMatchingService;
use App\Services\Lead\LeadQualificationService;
use App\Services\Lead\LeadScoringService;
use App\Services\LeadBantcQuestionGenerationService;
use App\Services\Revenue\ConversionPredictionService;
use App\Services\Revenue\ICPMatchingService;
use App\Services\Revenue\PrescriptiveEngineService;
use App\Services\Revenue\RevenueIntelligenceAnalysisService;
use App\Services\Revenue\RevenueRuleEngineService;
use App\Services\Sales\LeadEvaluationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class LeadController extends Controller
{
    public function __construct(
        private readonly DeduplicationService $dedup,
        private readonly LeadDiscoveryService $discovery,
    ) {}

    /** GET /api/leads */
    public function index(Request $request): JsonResponse
    {
        $query = Lead::visibleTo($request->user())
            ->with(['industry', 'subIndustry', 'businessCategory', 'funnelStage', 'owner', 'presalesOwner', 'amOwner', 'csmOwner', 'territory', 'product', 'sources.channelType', 'parentLead:id,company_name']);

        // Filters
        if ($request->filled('industry_id')) {
            $query->where('industry_id', $request->industry_id);
        }
        if ($request->filled('funnel_stage_id')) {
            $query->where('funnel_stage_id', $request->funnel_stage_id);
        }
        if ($request->get('pipeline_status') === 'active') {
            $query->whereHas('funnelStage', fn ($stageQuery) => $stageQuery->whereNotIn('name', ['Won', 'Lost']));
        }
        if ($request->filled('funnel_min_sequence')) {
            $minimumSequence = (int) $request->funnel_min_sequence;
            $query->whereHas('funnelStage', fn ($stageQuery) => $stageQuery
                ->where('sequence', '>=', $minimumSequence)
                ->where('name', '!=', 'Nurture / Hold'));
        }
        if ($request->filled('qualification_status')) {
            $query->where('qualification_status', $request->qualification_status);
        }
        if ($request->get('product_id') === 'unassigned') {
            $query->whereNull('product_id')
                ->whereDoesntHave('outcomes', fn ($outcomeQuery) => $outcomeQuery->whereNotNull('product_id'));
        } elseif ($request->filled('product_id')) {
            $productId = $request->product_id;
            $query->where(function ($productQuery) use ($productId) {
                $productQuery
                    ->where('product_id', $productId)
                    ->orWhereHas('outcomes', fn ($outcomeQuery) => $outcomeQuery->where('product_id', $productId));
            });
        }
        if ($request->filled('territory_id')) {
            $query->where('territory_id', $request->territory_id);
        }
        if ($request->get('duplicate_status') === 'duplicates') {
            $query->where('duplicate_status', '!=', 'new');
        } elseif ($request->filled('duplicate_status')) {
            $query->where('duplicate_status', $request->duplicate_status);
        }
        $roleFieldMap = [
            'owner_id' => 'sales',
            'presales_owner_id' => 'presales',
            'am_owner_id' => 'account_manager',
            'csm_owner_id' => 'csm',
        ];

        foreach ($roleFieldMap as $ownerField => $roleType) {
            if ($request->filled($ownerField)) {
                $val = $request->$ownerField;
                if ($val === 'unassigned') {
                    $query->where(function ($q) use ($ownerField, $roleType) {
                        $q->whereNull($ownerField)
                            ->whereDoesntHave('roleAssignments', function ($rq) use ($roleType) {
                                $rq->where('role_type', $roleType)
                                   ->where('assignment_status', 'active');
                            });
                    });
                } else {
                    $ids = is_array($val) ? $val : array_map('trim', explode(',', $val));
                    $query->where(function ($q) use ($ownerField, $ids, $roleType) {
                        $q->whereIn($ownerField, $ids)
                            ->orWhereHas('roleAssignments', function ($rq) use ($ids, $roleType) {
                                $rq->where('role_type', $roleType)
                                   ->whereIn('user_id', $ids)
                                   ->where('assignment_status', 'active');
                            });
                    });
                }
            }
        }
        if ($request->filled('source_type')) {
            $query->whereHas('sources', fn ($sourceQuery) => $sourceQuery->where('source_type', $request->source_type));
        }
        if ($request->filled('channel_type_id')) {
            $query->whereHas('sources', fn ($sourceQuery) => $sourceQuery->where('channel_type_id', (int) $request->channel_type_id));
        }
        if ($request->filled('min_score')) {
            $query->where('lead_score', '>=', (int) $request->min_score);
        }
        if ($request->filled('max_score')) {
            $query->where('lead_score', '<=', (int) $request->max_score);
        }
        if ($request->get('filter') === 'prospects') {
            $query->whereIn('qualification_status', ['eligible', 'potential']);
        }
        if ($request->filled('outcome')) {
            $query->whereHas('outcomes', fn ($outcomeQuery) => $outcomeQuery->where('outcome', $request->outcome));
        }
        if ($request->filled('closed_from') || $request->filled('closed_to')) {
            $query->whereHas('outcomes', function ($outcomeQuery) use ($request) {
                if ($request->filled('outcome')) {
                    $outcomeQuery->where('outcome', $request->outcome);
                }
                if ($request->filled('closed_from')) {
                    $outcomeQuery->whereDate('closed_at', '>=', $request->date('closed_from')->toDateString());
                }
                if ($request->filled('closed_to')) {
                    $outcomeQuery->whereDate('closed_at', '<=', $request->date('closed_to')->toDateString());
                }
            });
        }
        if ($request->filled('parent_lead_id')) {
            if ($request->parent_lead_id === 'standalone') {
                $query->whereNull('parent_lead_id');
            } else {
                $query->where('parent_lead_id', $request->parent_lead_id);
            }
        }
        if ($request->filled('search')) {
            $s = '%'.$request->search.'%';
            $query->where(function ($q) use ($s) {
                $q->where('company_name', 'ilike', $s)
                    ->orWhere('address', 'ilike', $s)
                    ->orWhere('email', 'ilike', $s);
            });
        }

        // Sorting
        $sortField = $request->get('sort', 'created_at');
        $sortDir = $request->get('dir', 'desc');
        $allowed = ['company_name', 'lead_score', 'created_at', 'qualification_status'];
        if (in_array($sortField, $allowed)) {
            $query->orderBy($sortField, $sortDir === 'asc' ? 'asc' : 'desc');
        }

        $leads = $query->paginate($request->get('per_page', 25));

        return response()->json($leads);
    }

    public function assignableUsers(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = User::query()
            ->with('role:id,name,display_name')
            ->where('is_active', true)
            ->orderBy('name');

        if ($user && ! $user->isSuperAdmin()) {
            $query->whereIn('id', $user->hierarchyUserIds());
        }

        return response()->json([
            'data' => $query->get(['id', 'name', 'email', 'role_id']),
        ]);
    }

    public function show(Lead $lead): JsonResponse
    {
        if (! Lead::visibleTo(request()->user())->whereKey($lead->id)->exists()) {
            abort(403);
        }

        $lead->load([
            'industry', 'subIndustry', 'businessCategory', 'funnelStage', 'owner', 'presalesOwner', 'amOwner', 'csmOwner',
            'territory', 'product', 'contacts.contactSource',
            'sources.channelType', 'funnelHistory.fromStage', 'funnelHistory.toStage',
            'funnelHistory.movedBy', 'creator',
            'scores', 'qualifications', 'productMatches', 'aiAnalyses',
            'activities', 'meetings', 'transcripts', 'aiEvaluations', 'followUps',
            'outcomes.product',
            'qualificationWorkflowReviews.workflow.stages',
            'qualificationWorkflowReviews.requester',
            'qualificationWorkflowReviews.reviewer',
            'bantcQuestionGuide',
            'parentLead:id,company_name',
            'subsidiaries:id,company_name,address,qualification_status,lead_score',
        ]);

        return response()->json(['data' => $lead]);
    }

    public function getBantcQuestions(Lead $lead): JsonResponse
    {
        if (! Lead::visibleTo(request()->user())->whereKey($lead->id)->exists()) {
            abort(403);
        }

        $guide = $lead->bantcQuestionGuide;

        return response()->json([
            'data' => [
                'questions' => $guide?->questions ?? [],
                'ai_generated' => $guide?->ai_generated ?? false,
                'ai_model' => $guide?->ai_model ?? null,
                'updated_at' => $guide?->updated_at?->toIso8601String(),
            ],
        ]);
    }

    public function generateBantcQuestions(Request $request, Lead $lead): JsonResponse
    {
        if (! Lead::visibleTo($request->user())->whereKey($lead->id)->exists()) {
            abort(403);
        }

        $result = app(LeadBantcQuestionGenerationService::class)->generate($lead);

        if (! $result['success']) {
            return response()->json(['error' => $result['error']], 422);
        }

        AuditService::log(
            'ai_lead_bantc_questions_generated',
            'leads',
            $lead,
            null,
            ['ai_model' => $result['ai_model'], 'count' => count($result['questions'])],
        );

        return response()->json([
            'data' => $result['questions'],
            'ai_model' => $result['ai_model'],
        ]);
    }

    public function saveBantcQuestions(Request $request, Lead $lead): JsonResponse
    {
        if (! Lead::visibleTo($request->user())->whereKey($lead->id)->exists()) {
            abort(403);
        }

        $validated = $request->validate([
            'questions' => 'required|array',
            'questions.*.id' => 'required|string|max:64',
            'questions.*.text' => 'required|string|max:1000',
            'questions.*.category' => 'required|string|max:100',
            'questions.*.order' => 'required|integer|min:1',
            'ai_generated' => 'boolean',
            'ai_model' => 'nullable|string|max:200',
        ]);

        $guide = LeadBantcQuestionGuide::updateOrCreate(
            ['lead_id' => $lead->id],
            [
                'questions' => $validated['questions'],
                'ai_generated' => $validated['ai_generated'] ?? false,
                'ai_model' => $validated['ai_model'] ?? null,
                'updated_by' => $request->user()?->id,
            ],
        );

        AuditService::logUpdated('lead_bantc_question_guides', $guide, []);

        return response()->json([
            'data' => [
                'questions' => $guide->questions,
                'ai_generated' => $guide->ai_generated,
                'ai_model' => $guide->ai_model,
                'updated_at' => $guide->updated_at?->toIso8601String(),
            ],
        ]);
    }

    /** POST /api/leads */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'company_name' => 'required|string|max:255',
            'brand' => 'nullable|string|max:255',
            'address' => 'nullable|string',
            'lat' => 'nullable|numeric',
            'lng' => 'nullable|numeric',
            'website' => 'nullable|url|max:500',
            'phone' => 'nullable|string|max:30',
            'email' => 'nullable|email',
            'industry_id' => 'nullable|exists:industries,id',
            'sub_industry_id' => 'nullable|exists:sub_industries,id',
            'business_category' => 'nullable|string|max:255',
            'business_category_id' => 'nullable|exists:business_categories,id',
            'external_place_id' => 'nullable|string|max:255',
            'product_id' => 'nullable|exists:products,id',
            'territory_id' => 'nullable|exists:territories,id',
            'ai_mode' => 'nullable|in:full_ai,hybrid,manual',
            'use_ai_reference' => 'nullable|boolean',
            'company_size_estimate' => 'nullable|string|max:100',
            'estimated_closing_amount' => 'nullable|numeric|min:0',
            'realized_closing_amount' => 'nullable|numeric|min:0',
            'funnel_stage_id' => 'nullable|exists:funnel_stages,id',
            'owner_id' => 'nullable|exists:users,id',
            'presales_owner_id' => 'nullable|exists:users,id',
            'am_owner_id' => 'nullable|exists:users,id',
            'csm_owner_id' => 'nullable|exists:users,id',
            'source_type' => 'nullable|exists:lead_source_types,slug',
            'channel_type_id' => 'nullable|exists:lead_channel_types,id',
            'parent_lead_id' => 'nullable|exists:leads,id',
        ]);
        $sourceType = $data['source_type'] ?? 'manual';
        $channelTypeId = $data['channel_type_id'] ?? null;
        unset($data['source_type']);
        unset($data['channel_type_id']);

        // Extract website domain for dedup
        if (! empty($data['website'])) {
            $data['website_domain'] = parse_url($data['website'], PHP_URL_HOST);
        }

        $data['created_by'] = $request->user()?->id;
        $data['tenant_id'] = $request->user()?->tenant_id;

        // Auto-assign owner to the user who creates it
        $data['owner_id'] = $request->user()?->id;

        // Auto-assign to first funnel stage ("New Lead") when none is provided
        if (empty($data['funnel_stage_id'])) {
            $firstStage = FunnelStage::orderBy('sequence')->first();
            if ($firstStage) {
                $data['funnel_stage_id'] = $firstStage->id;
            }
        }

        // Synchronous dedup check before creation
        $dedupResult = $this->dedup->check($data);
        if ($dedupResult->status === 'exact_duplicate') {
            return response()->json([
                'message' => 'Exact duplicate detected',
                'duplicate' => $dedupResult->toArray(),
            ], 409);
        }

        $data['duplicate_status'] = $dedupResult->status;
        $data['duplicate_of_id'] = $dedupResult->matchedLeadId;

        $lead = Lead::create($data);
        $this->syncLeadSource($lead, $sourceType, $channelTypeId);

        AuditService::logCreated('leads', $lead);

        // Commercial Team assignment: Auto assign as 'sales' (Sales / BD Executive)
        $creator = $request->user();
        if ($creator) {
            \App\Models\LeadRoleAssignment::create([
                'lead_id' => $lead->id,
                'user_id' => $creator->id,
                'role_type' => 'sales',
                'assigned_by' => $creator->id,
                'assigned_at' => now(),
                'assignment_status' => 'active',
            ]);

            // Ensure owner_id is set
            if (empty($lead->owner_id)) {
                $lead->update(['owner_id' => $creator->id]);
            }
        }

        // Trigger the new Enrichment Service
        app(\App\Services\Enrichment\LeadEnrichmentTriggerService::class)->trigger($lead, 'manual_creation');

        // Note: Post-enrichment AI (Scoring, ICP) is now triggered inside EnrichLeadJob via LeadPostEnrichmentAIService

        return response()->json([
            'data' => $lead->load(['industry', 'funnelStage', 'sources.channelType']),
            'duplicate' => $dedupResult->toArray(),
        ], 201);
    }

    /** POST /api/leads/batch-delete */
    public function batchDelete(Request $request): JsonResponse
    {
        abort_unless($request->user()->isSuperAdmin(), 403, 'Hanya super_admin yang dapat melakukan batch delete.');

        $data = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'integer|exists:leads,id',
        ]);

        Lead::whereIn('id', $data['ids'])->delete();

        return response()->json(['message' => 'Leads deleted successfully']);
    }

    /** PUT /api/leads/{lead} */
    public function update(Request $request, Lead $lead): JsonResponse
    {
        if (! Lead::visibleTo($request->user())->whereKey($lead->id)->exists()) {
            abort(403);
        }

        $original = $lead->getAttributes();

        $data = $request->validate([
            'company_name' => 'sometimes|string|max:255',
            'brand' => 'nullable|string|max:255',
            'address' => 'nullable|string',
            'lat' => 'nullable|numeric',
            'lng' => 'nullable|numeric',
            'website' => 'nullable|url|max:500',
            'phone' => 'nullable|string|max:30',
            'email' => 'nullable|email',
            'industry_id' => 'nullable|exists:industries,id',
            'sub_industry_id' => 'nullable|exists:sub_industries,id',
            'business_category' => 'nullable|string|max:255',
            'business_category_id' => 'nullable|exists:business_categories,id',
            'company_size_estimate' => 'nullable|string|max:100',
            'lead_score' => 'nullable|integer|min:0|max:100',
            'estimated_closing_amount' => 'nullable|numeric|min:0',
            'realized_closing_amount' => 'nullable|numeric|min:0',
            'qualification_status' => 'nullable|in:pending,eligible,potential,not_eligible',
            'ai_explanation' => 'nullable|string',
            'funnel_stage_id' => 'nullable|exists:funnel_stages,id',
            'owner_id' => 'nullable|exists:users,id',
            'presales_owner_id' => 'nullable|exists:users,id',
            'am_owner_id' => 'nullable|exists:users,id',
            'csm_owner_id' => 'nullable|exists:users,id',
            'product_id' => 'nullable|exists:products,id',
            'source_type' => 'nullable|exists:lead_source_types,slug',
            'channel_type_id' => 'nullable|exists:lead_channel_types,id',
            'parent_lead_id' => ['nullable', 'exists:leads,id', function ($attribute, $value, $fail) use ($lead) {
                if ((int) $value === $lead->id) {
                    $fail('A lead cannot be a subsidiary of itself.');
                }
            }],
        ]);
        $sourceType = $data['source_type'] ?? null;
        $channelTypeId = $data['channel_type_id'] ?? null;
        unset($data['source_type']);
        unset($data['channel_type_id']);

        if (isset($data['website'])) {
            $data['website_domain'] = parse_url($data['website'], PHP_URL_HOST);
        }

        if (
            isset($data['funnel_stage_id']) &&
            $data['funnel_stage_id'] != $lead->funnel_stage_id
        ) {
            $this->ensureLeadReadyForPipeline($request, $lead);
        }

        // Track funnel stage change
        if (isset($data['funnel_stage_id']) && $data['funnel_stage_id'] != $lead->funnel_stage_id) {
            $lead->funnelHistory()->create([
                'from_stage_id' => $lead->funnel_stage_id,
                'to_stage_id' => $data['funnel_stage_id'],
                'moved_by' => $request->user()?->id,
            ]);
        }

        $lead->update($data);
        $this->syncLeadSource($lead, $sourceType, $channelTypeId);

        AuditService::logUpdated('leads', $lead, $original);

        return response()->json(['data' => $lead->fresh(['industry', 'funnelStage', 'sources.channelType'])]);
    }

    public function claim(Request $request, Lead $lead): JsonResponse
    {
        if (! Lead::visibleTo($request->user())->whereKey($lead->id)->exists()) {
            abort(403);
        }

        if ($lead->owner_id) {
            return response()->json(['message' => 'Lead is already assigned.'], 422);
        }

        $original = $lead->getAttributes();
        $claimer = $request->user();
        
        if ($claimer) {
            $lead->update(['owner_id' => $claimer->id]);

            $existingRole = \App\Models\LeadRoleAssignment::where('lead_id', $lead->id)
                ->where('user_id', $claimer->id)
                ->first();
            
            if (!$existingRole) {
                \App\Models\LeadRoleAssignment::create([
                    'lead_id' => $lead->id,
                    'user_id' => $claimer->id,
                    'role_type' => 'sales',
                    'assigned_by' => $claimer->id,
                    'assigned_at' => now(),
                    'assignment_status' => 'active',
                ]);
            } elseif ($existingRole->role_type !== 'sales') {
                $existingRole->update(['role_type' => 'sales']);
            }
        }

        AuditService::log(
            'lead_claimed',
            'leads',
            $lead,
            ['owner_id' => $original['owner_id'] ?? null],
            ['owner_id' => $lead->owner_id],
        );

        return response()->json([
            'data' => $lead->fresh(['industry', 'funnelStage', 'owner', 'sources.channelType']),
        ]);
    }

    public function assign(Request $request, Lead $lead): JsonResponse
    {
        if (! Lead::visibleTo($request->user())->whereKey($lead->id)->exists()) {
            abort(403);
        }

        $data = $request->validate([
            'owner_id' => 'nullable|exists:users,id',
        ]);

        $ownerId = $data['owner_id'] ?? null;

        if ($ownerId) {
            $assignableIds = $request->user()?->isSuperAdmin()
                ? User::where('is_active', true)->pluck('id')->all()
                : $request->user()?->hierarchyUserIds() ?? [];

            if (! in_array((int) $ownerId, $assignableIds, true)) {
                return response()->json(['message' => 'Selected owner is outside your assignable team.'], 422);
            }
        }

        $original = $lead->getAttributes();
        $lead->update(['owner_id' => $ownerId]);

        AuditService::log(
            'lead_assigned',
            'leads',
            $lead,
            ['owner_id' => $original['owner_id'] ?? null],
            ['owner_id' => $lead->owner_id],
        );

        return response()->json([
            'data' => $lead->fresh(['industry', 'funnelStage', 'owner', 'sources.channelType']),
        ]);
    }

    private function syncLeadSource(Lead $lead, ?string $sourceType, ?int $channelTypeId = null): void
    {
        if (! $sourceType && ! $channelTypeId) {
            return;
        }

        $channel = $channelTypeId ? LeadChannelType::with('sourceType')->find($channelTypeId) : null;
        $sourceType = $channel?->sourceType?->slug
            ?? LeadSourceType::where('slug', $sourceType)->value('slug')
            ?? 'other';

        $source = $lead->sources()->orderBy('id')->first();
        $payload = [
            'source_type' => $sourceType,
            'channel_type_id' => $channel?->id,
            'confidence' => 'medium',
            'last_verified_at' => now()->toDateString(),
        ];

        if ($source) {
            $source->update($payload);

            return;
        }

        $lead->sources()->create($payload);
    }

    /** DELETE /api/leads/{lead} */
    public function destroy(Lead $lead): JsonResponse
    {
        AuditService::logDeleted('leads', $lead);

        $lead->delete();

        return response()->json(null, 204);
    }

    /** POST /api/leads/{lead}/push-to-funnel */
    public function pushToFunnel(Request $request, Lead $lead): JsonResponse
    {
        $data = $request->validate([
            'funnel_stage_id' => 'required|exists:funnel_stages,id',
        ]);

        $this->ensureLeadReadyForPipeline($request, $lead);

        $lead->funnelHistory()->create([
            'from_stage_id' => $lead->funnel_stage_id,
            'to_stage_id' => $data['funnel_stage_id'],
            'moved_by' => $request->user()?->id,
        ]);

        $lead->update(['funnel_stage_id' => $data['funnel_stage_id']]);

        AuditService::log('funnel_push', 'leads', $lead, null, $data);

        return response()->json(['data' => $lead->fresh('funnelStage')]);
    }

    /** POST /api/leads/{lead}/rescore */
    public function rescore(Lead $lead): JsonResponse
    {
        // Run scoring synchronously — no dedicated queue worker in this deployment.
        // ScoreLeadJob is preserved for background use; manual rescore executes inline.
        try {
            $lead->update(['ai_processing_status' => 'processing']);
            
            // 1. Scoring
            $service = app(LeadScoringService::class);
            $result = $service->scoreLead($lead);
            
            // 2. ICP Match
            $icpResult = app(ICPMatchingService::class)->matchLead($lead);
            AuditService::log('icp_match', 'leads', $lead, null, $icpResult);
            
            // 3. Qualification
            $qualResult = app(LeadQualificationService::class)->qualifyLead($lead, useAi: true);
            if ($qualResult->classification === 'need_review' && $request = request()) {
                app(HumanVerificationWorkflowService::class)->requestReview($lead->fresh('funnelStage'), $request->user(), [
                    'justification' => $qualResult->qualification_reason,
                    'recommended_status' => 'pending',
                ]);
            }
            AuditService::log('qualify', 'leads', $lead, $lead->toArray(), [
                'qualified' => $qualResult->qualified,
                'business_type' => $qualResult->business_type,
            ]);

            $lead->update(['ai_processing_status' => 'completed']);

            AuditService::log('rescore', 'leads', $lead, null, [
                'score' => $result->score,
                'grade' => $result->grade,
            ]);

            return response()->json([
                'message' => 'Lead rescored, ICP matched, and qualified successfully',
                'data' => $result,
            ]);
        } catch (\Throwable $e) {
            $lead->update(['ai_processing_status' => 'failed']);

            return response()->json(['message' => 'Scoring failed: '.$e->getMessage()], 500);
        }
    }

    /** POST /api/leads/{lead}/activities */
    public function logActivity(Request $request, Lead $lead): JsonResponse
    {
        $data = $request->validate([
            'activity_type' => 'required|string|max:100',
            'description' => 'nullable|string',
            'outcome' => 'nullable|string|max:1000',
            'budget' => 'nullable|string',
            'authority' => 'nullable|string',
            'needs' => 'nullable|string',
            'timeline' => 'nullable|string',
            'competitor' => 'nullable|string',
            'activity_date' => 'nullable|date',
            'next_follow_up_date' => 'nullable|date',
            'funnel_stage_id' => 'nullable|exists:funnel_stages,id',
        ]);

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

        \App\Jobs\RunLeadIntelligenceJob::dispatch($lead->id);

        return response()->json(['data' => $activity->load('user')], 201);
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

    /** POST /api/leads/{lead}/contacts/{contact}/set-primary */
    public function setPrimaryContact(Lead $lead, LeadContact $contact): JsonResponse
    {
        if ($contact->lead_id !== $lead->id) {
            abort(403);
        }

        $lead->contacts()->update(['is_primary' => false]);
        $contact->update(['is_primary' => true]);

        return response()->json(['message' => 'Primary contact updated', 'data' => $contact]);
    }

    /** POST /api/leads/{lead}/contacts */
    public function addContact(Request $request, Lead $lead): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string',
            'title' => 'nullable|string',
            'email' => 'nullable|email',
            'phone' => 'nullable|string',
            'linkedin_url' => 'nullable|string|max:500',
        ]);

        if (! empty($data['linkedin_url'])) {
            $data['linkedin_url'] = $this->normalizeLinkedinUrl($data['linkedin_url']);
        }

        $data['source'] = 'manual';
        $data['confidence'] = 'high';
        $data['confidence_score'] = 100;

        $contact = $lead->contacts()->create($data);

        return response()->json(['data' => $contact], 201);
    }

    /** PUT /api/leads/{lead}/contacts/{contact} */
    public function updateContact(Request $request, Lead $lead, LeadContact $contact): JsonResponse
    {
        if ($contact->lead_id !== $lead->id) {
            abort(403);
        }

        $data = $request->validate([
            'name' => 'sometimes|string',
            'title' => 'nullable|string',
            'email' => 'nullable|email',
            'phone' => 'nullable|string',
            'linkedin_url' => 'nullable|string|max:500',
        ]);

        if (array_key_exists('linkedin_url', $data) && ! empty($data['linkedin_url'])) {
            $data['linkedin_url'] = $this->normalizeLinkedinUrl($data['linkedin_url']);
        }

        // If manual update happens, we mark the confidence as explicitly upgraded
        $data['source'] = 'manual';
        $data['confidence'] = 'high';
        $data['confidence_score'] = 100;

        $contact->update($data);

        return response()->json(['data' => $contact]);
    }

    private function normalizeLinkedinUrl(string $url): string
    {
        $url = trim($url);
        if ($url === '') {
            return '';
        }

        if (str_starts_with($url, 'http://') || str_starts_with($url, 'https://')) {
            return $url;
        }

        if (str_starts_with($url, 'linkedin.com') || str_starts_with($url, 'www.linkedin.com')) {
            return 'https://'.$url;
        }

        return 'https://www.linkedin.com/in/'.ltrim($url, '@/');
    }

    /** POST /api/leads/discover — Map-based lead discovery */
    public function discover(Request $request): JsonResponse
    {
        $data = $request->validate([
            'lat' => 'required|numeric|between:-90,90',
            'lng' => 'required|numeric|between:-180,180',
            'radius' => 'required|integer|min:100|max:50000',
            'keyword' => 'nullable|string|max:255',
            'type' => 'nullable|string|max:100',
        ]);

        $results = $this->discovery->discoverNearby(
            $data['lat'],
            $data['lng'],
            $data['radius'],
            $data['keyword'] ?? '',
            $data['type'] ?? 'establishment',
        );

        // Run dedup check on each result
        $enrichedResults = collect($results['results'])->map(function ($place) {
            $dedupResult = $this->dedup->check($place);
            $place['dedup'] = $dedupResult->toArray();

            return $place;
        });

        return response()->json([
            'data' => $enrichedResults,
            'next_page_token' => $results['next_page_token'] ?? null,
            'error' => $results['error'] ?? null,
        ]);
    }

    /** POST /api/leads/bulk-import — Import discovered leads into database */
    public function bulkImport(Request $request): JsonResponse
    {
        $data = $request->validate([
            'leads' => 'required|array|min:1|max:500',
            'leads.*.company_name' => 'required|string|max:255',
            'leads.*.brand' => 'nullable|string|max:255',
            'leads.*.address' => 'nullable|string',
            'leads.*.lat' => 'nullable|numeric',
            'leads.*.lng' => 'nullable|numeric',
            'leads.*.phone' => 'nullable|string',
            'leads.*.email' => 'nullable|email',
            'leads.*.website' => 'nullable|url',
            'leads.*.external_place_id' => 'nullable|string',
            'leads.*.business_category' => 'nullable|string',
            'leads.*.industry_id' => 'nullable|exists:industries,id',
            'leads.*.sub_industry_id' => 'nullable|exists:sub_industries,id',
            'leads.*.company_size_estimate' => 'nullable|string|max:100',
            'leads.*.branch_count' => 'nullable|integer|min:0',
            'leads.*.operating_hours' => 'nullable|string|max:255',
            'leads.*.lead_score' => 'nullable|integer|min:0|max:100',
            'leads.*.qualification_status' => 'nullable|in:pending,eligible,potential,not_eligible',
            'leads.*.estimated_closing_amount' => 'nullable|numeric|min:0',
            'leads.*.realized_closing_amount' => 'nullable|numeric|min:0',
            'leads.*.funnel_stage_id' => 'nullable|exists:funnel_stages,id',
            'leads.*.owner_id' => 'nullable|exists:users,id',
            'leads.*.territory_id' => 'nullable|exists:territories,id',
            'leads.*.product_id' => 'nullable|exists:products,id',
            'leads.*.source_type' => 'nullable|exists:lead_source_types,slug',
            'leads.*.channel_type_id' => 'nullable|exists:lead_channel_types,id',
            'leads.*.contacts' => 'nullable|array|max:10',
            'leads.*.contacts.*.name' => 'sometimes|required|string|max:255',
            'leads.*.contacts.*.title' => 'nullable|string|max:255',
            'leads.*.contacts.*.email' => 'nullable|email',
            'leads.*.contacts.*.phone' => 'nullable|string|max:30',
            'leads.*.contacts.*.linkedin_url' => 'nullable|string|max:500',
            'leads.*.contacts.*.confidence' => 'nullable|in:high,medium,low',
            'leads.*.contacts.*.is_primary' => 'nullable|boolean',
            'leads.*.contacts.*.do_not_contact' => 'nullable|boolean',
            'territory_id' => 'nullable|exists:territories,id',
            'product_id' => 'nullable|exists:products,id',
            'source_type' => 'nullable|exists:lead_source_types,slug',
            'channel_type_id' => 'nullable|exists:lead_channel_types,id',
            'ai_mode' => 'nullable|in:full_ai,hybrid,manual',
        ]);

        $created = [];
        $skipped = [];
        $aiMode = $data['ai_mode'] ?? 'manual';
        $createdContacts = 0;

        $defaultStageId = FunnelStage::orderBy('sequence')->value('id');

        foreach ($data['leads'] as $leadData) {
            $contacts = $leadData['contacts'] ?? [];
            $sourceType = $leadData['source_type'] ?? $data['source_type'] ?? 'csv_import';
            $channelTypeId = $leadData['channel_type_id'] ?? $data['channel_type_id'] ?? null;
            unset($leadData['contacts'], $leadData['source_type'], $leadData['channel_type_id']);

            // Domain extraction
            if (! empty($leadData['website'])) {
                $leadData['website_domain'] = parse_url($leadData['website'], PHP_URL_HOST);
            }

            // Dedup
            $dedupResult = $this->dedup->check($leadData);
            if ($dedupResult->status === 'exact_duplicate') {
                $skipped[] = [
                    'company_name' => $leadData['company_name'],
                    'reason' => "Duplicate of #{$dedupResult->matchedLeadId}",
                ];

                continue;
            }

            $leadData['territory_id'] = $leadData['territory_id'] ?? $data['territory_id'] ?? null;
            $leadData['product_id'] = $leadData['product_id'] ?? $data['product_id'] ?? null;
            $leadData['ai_mode'] = $aiMode;
            $leadData['duplicate_status'] = $dedupResult->status;
            $leadData['duplicate_of_id'] = $dedupResult->matchedLeadId;
            $leadData['created_by'] = $request->user()?->id;
            $leadData['tenant_id'] = $request->user()?->tenant_id;
            $leadData['funnel_stage_id'] = $leadData['funnel_stage_id'] ?? $defaultStageId;
            $leadData['qualification_status'] = $leadData['qualification_status'] ?? 'pending';

            $lead = Lead::create($leadData);
            $this->syncLeadSource($lead, $sourceType, $channelTypeId ? (int) $channelTypeId : null);

            foreach ($contacts as $index => $contactData) {
                if (empty($contactData['name'])) {
                    continue;
                }

                $lead->contacts()->create([
                    'name' => $contactData['name'],
                    'title' => $contactData['title'] ?? null,
                    'email' => $contactData['email'] ?? null,
                    'phone' => $contactData['phone'] ?? null,
                    'linkedin_url' => $contactData['linkedin_url'] ?? null,
                    'confidence' => $contactData['confidence'] ?? 'medium',
                    'is_primary' => (bool) ($contactData['is_primary'] ?? $index === 0),
                    'do_not_contact' => (bool) ($contactData['do_not_contact'] ?? false),
                    'source' => 'import',
                    'confidence_score' => ($contactData['confidence'] ?? 'medium') === 'high' ? 90 : 70,
                ]);
                $createdContacts++;
            }

            app(\App\Services\Enrichment\LeadEnrichmentTriggerService::class)->trigger($lead, 'import');

            $created[] = $lead;
        }

        AuditService::log('bulk_import', 'leads', null, null, [
            'created' => count($created),
            'skipped' => count($skipped),
            'contacts' => $createdContacts,
        ]);

        return response()->json([
            'created' => count($created),
            'contacts_created' => $createdContacts,
            'skipped' => $skipped,
            'leads' => collect($created)->map->only(['id', 'company_name', 'duplicate_status']),
        ], 201);
    }

    /** GET /api/leads/export — CSV export */
    public function export(Request $request): StreamedResponse
    {
        $query = Lead::with(['industry', 'funnelStage', 'product']);

        if ($request->filled('industry_id')) {
            $query->where('industry_id', $request->industry_id);
        }
        if ($request->filled('qualification_status')) {
            $query->where('qualification_status', $request->qualification_status);
        }

        $leads = $query->orderBy('lead_score', 'desc')->get();

        AuditService::log('export', 'leads', null, null, ['count' => $leads->count()]);

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="leads_export_'.now()->format('Ymd_His').'.csv"',
        ];

        return response()->stream(function () use ($leads) {
            $out = fopen('php://output', 'w');
            fputcsv($out, [
                'ID', 'Company', 'Address', 'Industry', 'Email', 'Phone',
                'Score', 'Status', 'Funnel Stage', 'Product', 'Created',
            ]);

            foreach ($leads as $lead) {
                fputcsv($out, [
                    $lead->id, $lead->company_name, $lead->address,
                    $lead->industry?->name, $lead->email, $lead->phone,
                    $lead->lead_score, $lead->qualification_status,
                    $lead->funnelStage?->name, $lead->product?->name,
                    $lead->created_at?->toDateTimeString(),
                ]);
            }

            fclose($out);
        }, 200, $headers);
    }

    /* ═══════════════════════════════════════════════════════════ */
    /*  MODULE A: Lead Intelligence Engine */
    /* ═══════════════════════════════════════════════════════════ */

    /** POST /api/leads/{lead}/qualify — Qualify lead */
    public function qualify(Lead $lead): JsonResponse
    {
        $service = app(LeadQualificationService::class);
        $result = $service->qualifyLead($lead, useAi: true);

        if ($result->classification === 'need_review' && $request = request()) {
            app(HumanVerificationWorkflowService::class)->requestReview($lead->fresh('funnelStage'), $request->user(), [
                'justification' => $result->qualification_reason,
                'recommended_status' => 'pending',
            ]);
        }

        AuditService::log('qualify', 'leads', $lead, $lead->toArray(), [
            'qualified' => $result->qualified,
            'business_type' => $result->business_type,
        ]);

        return response()->json(['data' => $result], 201);
    }

    /** POST /api/leads/{lead}/analyze — Analyze lead with AI */
    public function analyze(Lead $lead): JsonResponse
    {
        $service = app(LeadAIAnalysisService::class);
        $result = $service->analyzeLead($lead);

        AuditService::log('analyze', 'leads', $lead, null, [
            'relevance_score' => $result->relevance_score,
            'urgency_level' => $result->urgency_level,
            'risk_insight' => $result->risk_insight,
        ]);

        return response()->json(['data' => $result], 201);
    }

    /** POST /api/leads/{lead}/match-products — Match lead to products (BANT + Competitor AI) */
    public function matchProducts(Request $request, Lead $lead): JsonResponse
    {
        $service = app(LeadProductMatchingService::class);
        $matches = $service->matchLeadToProducts($lead, $request->user()?->id);

        // Reload with product relation for response
        $lead->loadMissing('productMatches.product');
        $enriched = $lead->productMatches()
            ->with('product')
            ->orderByDesc('match_score')
            ->get();

        AuditService::log('match_products', 'leads', $lead, null, [
            'matches_count' => count($matches),
            'recommended_count' => $enriched->where('is_recommended', true)->count(),
        ]);

        return response()->json([
            'data' => $enriched,
            'summary' => [
                'total_evaluated' => $enriched->count(),
                'recommended' => $enriched->where('is_recommended', true)->count(),
                'top_match' => $enriched->first()?->product?->name,
                'top_match_score' => $enriched->first()?->match_score,
                'top_match_level' => $enriched->first()?->match_level,
            ],
        ], 201);
    }

    /** POST /api/leads/{lead}/run-profiling-strategy — Consolidated AI Profiling and Strategy */
    public function runProfilingStrategy(Request $request, Lead $lead): JsonResponse
    {
        $service = app(\App\Services\Lead\LeadProfilingAndStrategyService::class);
        $result = $service->profileAndStrategize($lead, $request->user()?->id);

        if (!$result['success']) {
            return response()->json(['message' => $result['message']], 400);
        }

        // Reload relationships for response
        $lead->loadMissing(['productMatches.product', 'aiAnalyses']);
        
        $enrichedProducts = $lead->productMatches()
            ->with('product')
            ->orderByDesc('match_score')
            ->get();

        AuditService::log('run_profiling_strategy', 'leads', $lead, null, [
            'matches_count' => $enrichedProducts->count(),
            'recommended_count' => $enrichedProducts->where('is_recommended', true)->count(),
        ]);

        return response()->json([
            'analysis' => $result['analysis'],
            'product_matches' => $enrichedProducts,
            'summary' => [
                'total_evaluated' => $enrichedProducts->count(),
                'recommended' => $enrichedProducts->where('is_recommended', true)->count(),
                'top_match' => $enrichedProducts->first()?->product?->name,
            ],
        ], 201);
    }

    /** GET /api/leads/{lead}/intelligence — Get all lead intelligence */
    public function intelligence(Lead $lead): JsonResponse
    {
        $lead->load([
            'scores' => fn ($q) => $q->latest()->limit(1),
            'qualifications' => fn ($q) => $q->latest()->limit(1),
            'productMatches' => fn ($q) => $q->with('product')->orderByDesc('match_score')->limit(5),
            'aiAnalyses' => fn ($q) => $q->latest()->limit(1),
            'qualificationWorkflowReviews' => fn ($q) => $q->with(['workflow.stages', 'requester', 'reviewer'])->latest()->limit(1),
        ]);

        return response()->json([
            'lead_id' => $lead->id,
            'latest_score' => $lead->scores->first(),
            'latest_qualification' => $lead->qualifications->first(),
            'recommended_products' => $lead->productMatches,
            'latest_analysis' => $lead->aiAnalyses->first(),
            'latest_verification_review' => $lead->qualificationWorkflowReviews->first(),
        ]);
    }

    public function requestVerificationReview(Request $request, Lead $lead): JsonResponse
    {
        $data = $request->validate([
            'justification' => 'nullable|string',
            'recommended_status' => 'nullable|in:pending,eligible,potential,not_eligible',
        ]);

        $review = app(HumanVerificationWorkflowService::class)->requestReview($lead, $request->user(), $data);

        return response()->json(['data' => $review], 201);
    }

    public function verificationStatus(Lead $lead): JsonResponse
    {
        $snapshot = app(HumanVerificationWorkflowService::class)->verificationSnapshot($lead);

        return response()->json(['data' => $snapshot]);
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

    /** GET /api/leads/{lead}/progress — Get lead progress summary */
    public function getProgress(Lead $lead): JsonResponse
    {
        $latestActivity = $lead->activities()->latest('activity_date')->first();
        $latestMeeting = $lead->meetings()->latest('meeting_date')->first();
        $latestEvaluation = $lead->aiEvaluations()->latest()->first();
        $nextFollowUp = $lead->followUps()->where('status', 'pending')->orderBy('due_date')->first();
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
            'next_follow_up' => $nextFollowUp ? [
                'due_date' => $nextFollowUp->due_date,
                'purpose' => $nextFollowUp->purpose,
                'assigned_to' => $nextFollowUp->assigned_to,
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

    /** PUT /api/leads/{lead}/activities/{activity} */
    public function updateActivity(Request $request, Lead $lead, $activityId): JsonResponse
    {
        $activity = $lead->activities()->findOrFail($activityId);
        $data = $request->validate([
            'activity_type' => 'sometimes|string|max:100',
            'description' => 'nullable|string',
            'outcome' => 'nullable|string|max:1000',
            'budget' => 'nullable|string',
            'authority' => 'nullable|string',
            'needs' => 'nullable|string',
            'timeline' => 'nullable|string',
            'competitor' => 'nullable|string',
            'activity_date' => 'nullable|date',
            'next_follow_up_date' => 'nullable|date',
        ]);
        $activity->update($data);
        AuditService::log('update_activity', 'lead_activities', $activity, $activity->toArray());

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

    /** GET /api/leads/{lead}/transcripts */
    public function getTranscripts(Lead $lead): JsonResponse
    {
        $transcripts = $lead->transcripts()
            ->with(['activity:id,activity_type,activity_date,description', 'documents', 'syncJobs'])
            ->orderByDesc('recorded_at')
            ->paginate(50);

        return response()->json($transcripts);
    }

    /** POST /api/leads/{lead}/activities/analyze-transcript */
    public function analyzeActivityTranscript(Request $request, Lead $lead): JsonResponse
    {
        try {
            $data = $request->validate([
                'transcript_text' => 'nullable|string',
                'transcript_file' => 'nullable|file|max:51200|mimes:txt,vtt,srt,mp3,wav,m4a,mp4,mov,webm',
            ]);

            $filePath = null;
            $fileName = null;
            $fileMime = null;
            $fileSize = null;
            $transcriptText = $data['transcript_text'] ?? null;

            if ($request->hasFile('transcript_file')) {
                $file = $request->file('transcript_file');
                $filePath = $file->store('lead-transcripts', 'public');
                $fileName = $file->getClientOriginalName();
                $fileMime = $file->getMimeType();
                $fileSize = $file->getSize();

                $extension = strtolower($file->getClientOriginalExtension());
                if (in_array($extension, ['txt', 'vtt', 'srt'], true)) {
                    $fileText = file_get_contents($file->getRealPath());
                    if (is_string($fileText) && trim($fileText) !== '') {
                        $transcriptText = trim($transcriptText ? "{$transcriptText}\n\n{$fileText}" : $fileText);
                    }
                }
            }

            if (! $transcriptText && ! $filePath) {
                abort(422, 'Transcript text or a transcript file is required.');
            }

            $transcript = $lead->transcripts()->create([
                'title' => 'Meeting Transcript ('.now()->format('Y-m-d').')',
                'source_type' => 'meeting',
                'transcript_text' => $transcriptText,
                'file_path' => $filePath,
                'file_name' => $fileName,
                'file_mime' => $fileMime,
                'file_size' => $fileSize,
                'recorded_at' => now(),
                'evaluation_status' => 'pending',
            ]);

            AuditService::log('create_transcript_for_activity', 'lead_transcripts', $transcript, null, [
                'source_type' => 'meeting',
            ]);

            $analysisResult = null;
            if ($transcriptText) {
                $service = app(LeadEvaluationService::class);
                $analysisResult = $service->evaluateActivityTranscript($lead, $transcriptText);

                try {
                    $service->evaluateTranscript($lead, $transcript);
                } catch (\Exception $e) {
                    // Ignore standard evaluation error
                }
            }

            return response()->json([
                'data' => [
                    'transcript' => $transcript,
                    'analysis' => $analysisResult,
                ],
            ], 201);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'An unexpected server error occurred.',
                'actual_error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ], 500);
        }
    }

    /** POST /api/leads/{lead}/transcripts */
    public function storeTranscript(Request $request, Lead $lead): JsonResponse
    {
        $data = $request->validate([
            'title' => 'nullable|string|max:255',
            'activity_id' => 'nullable|integer|exists:lead_activities,id',
            'source_type' => 'required|in:whatsapp,meeting,manual,call,audio,video,file',
            'transcript_text' => 'nullable|string',
            'transcript_file' => 'nullable|file|max:51200|mimes:txt,vtt,srt,mp3,wav,m4a,mp4,mov,webm',
            'source_id' => 'nullable|integer',
            'recorded_at' => 'nullable|date',
            'meeting_type' => 'nullable|string|max:100',
        ]);

        if (! empty($data['activity_id']) && ! $lead->activities()->whereKey($data['activity_id'])->exists()) {
            abort(422, 'Selected activity does not belong to this lead.');
        }

        $filePath = null;
        $fileName = null;
        $fileMime = null;
        $fileSize = null;
        $transcriptText = $data['transcript_text'] ?? null;

        if ($request->hasFile('transcript_file')) {
            $file = $request->file('transcript_file');
            $filePath = $file->store('lead-transcripts', 'public');
            $fileName = $file->getClientOriginalName();
            $fileMime = $file->getMimeType();
            $fileSize = $file->getSize();

            $extension = strtolower($file->getClientOriginalExtension());
            if (in_array($extension, ['txt', 'vtt', 'srt'], true)) {
                $fileText = file_get_contents($file->getRealPath());
                if (is_string($fileText) && trim($fileText) !== '') {
                    $transcriptText = trim($transcriptText ? "{$transcriptText}\n\n{$fileText}" : $fileText);
                }
            }
        }

        if (! $transcriptText && ! $filePath) {
            abort(422, 'Transcript text or a transcript file is required.');
        }

        $transcript = $lead->transcripts()->create([
            'activity_id' => $data['activity_id'] ?? null,
            'title' => $data['title'] ?? null,
            'source_type' => $data['source_type'],
            'transcript_text' => $transcriptText,
            'source_id' => $data['source_id'] ?? null,
            'file_path' => $filePath,
            'file_name' => $fileName,
            'file_mime' => $fileMime,
            'file_size' => $fileSize,
            'recorded_at' => $data['recorded_at'] ?? now(),
            'evaluation_status' => 'pending',
            'meeting_type' => $data['meeting_type'] ?? 'General',
        ]);

        AuditService::log('create_transcript', 'lead_transcripts', $transcript, null, [
            'source_type' => $data['source_type'],
        ]);

        if (!empty($transcriptText)) {
            \Illuminate\Support\Facades\Bus::chain([
                new \App\Jobs\AnalyzeTranscriptJob($transcript->id),
                new \App\Jobs\SaveTranscriptAnalysisJob($transcript->id),
                new \App\Jobs\SyncTranscriptAnalysisToLarkBaseJob($transcript->id),
                new \App\Jobs\GenerateMeetingSummaryPdfJob($transcript->id),
                new \App\Jobs\SyncMeetingSummaryPdfToLarkBaseJob($transcript->id),
            ])->dispatch();
        }

        return response()->json(['data' => $transcript->load('activity:id,activity_type,activity_date,description')], 201);
    }

    /** PUT /api/leads/{lead}/transcripts/{transcript} */
    public function updateTranscript(Request $request, Lead $lead, $transcriptId): JsonResponse
    {
        $transcript = $lead->transcripts()->findOrFail($transcriptId);

        $data = $request->validate([
            'title' => 'nullable|string|max:255',
            'recorded_at' => 'nullable|date',
            'meeting_type' => 'nullable|string|max:100',
            'transcript_text' => 'nullable|string',
        ]);

        $updateData = [];
        if (array_key_exists('title', $data)) $updateData['title'] = $data['title'];
        if (array_key_exists('recorded_at', $data)) $updateData['recorded_at'] = $data['recorded_at'] ? Carbon::parse($data['recorded_at']) : null;
        if (array_key_exists('meeting_type', $data)) $updateData['meeting_type'] = $data['meeting_type'];
        if (array_key_exists('transcript_text', $data)) $updateData['transcript_text'] = $data['transcript_text'];

        $transcript->update($updateData);

        AuditService::log('update_transcript', 'lead_transcripts', $transcript, null, $updateData);

        return response()->json(['data' => $transcript]);
    }

    /** POST /api/leads/{lead}/transcripts/fetch-link */
    public function fetchTranscriptFromLink(Request $request, Lead $lead): JsonResponse
    {
        $data = $request->validate([
            'meeting_link' => 'required|url',
        ]);

        $url = $data['meeting_link'];

        if (!$lead->meeting_link) {
            $lead->update(['meeting_link' => $url]);
        }

        $integration = \App\Models\LarkIntegration::where('tenant_id', $lead->tenant_id)->where('is_active', true)->first();
        if (!$integration) {
            abort(400, 'No active Lark integration found for this tenant.');
        }

        $larkService = new \App\Services\Lark\LarkMeetingService($integration);

        $minuteToken = null;
        if (preg_match('/minutes\/([a-zA-Z0-9]+)/', $url, $matches)) {
            $minuteToken = $matches[1];
        }

        if (!$minuteToken) {
            abort(400, 'Invalid Lark Minutes URL. Could not find minute token.');
        }

        $transcriptData = $larkService->getMinuteTranscript($minuteToken);
        if (!$transcriptData) {
            abort(400, 'Failed to fetch transcript from Lark API. Ensure integration has permissions.');
        }

        $transcriptText = $transcriptData['content'] ?? ($transcriptData['transcript'] ?? json_encode($transcriptData));

        $transcript = $lead->transcripts()->create([
            'title' => 'Lark Meeting Transcript',
            'source_type' => 'meeting',
            'transcript_text' => $transcriptText,
            'recorded_at' => now(),
            'evaluation_status' => 'pending',
        ]);

        \App\Services\AuditService::log('create_transcript', 'lead_transcripts', $transcript, null, [
            'source_type' => 'meeting',
            'fetch_source' => 'lark_link',
        ]);

        // Automatically run evaluation
        $service = app(\App\Services\Sales\LeadEvaluationService::class);
        $evaluation = $service->evaluateTranscript($lead, $transcript);
        $transcript->update(['evaluation_status' => 'evaluated']);

        return response()->json([
            'data' => $transcript->load('activity:id,activity_type,activity_date,description'),
            'evaluation' => $evaluation,
            'message' => 'Transcript fetched and analyzed successfully.',
        ], 201);
    }

    /** DELETE /api/leads/{lead}/transcripts/{transcript} */
    public function deleteTranscript(Lead $lead, $transcriptId): JsonResponse
    {
        $transcript = $lead->transcripts()->findOrFail($transcriptId);
        if ($transcript->file_path) {
            Storage::disk('public')->delete($transcript->file_path);
        }
        $transcript->delete();

        AuditService::log('delete_transcript', 'lead_transcripts', $transcript, $transcript->toArray());

        return response()->json(['message' => 'Transcript deleted']);
    }

    /** POST /api/leads/{lead}/transcripts/{transcript}/evaluate */
    public function evaluateTranscript(Lead $lead, $transcriptId): JsonResponse
    {
        $transcript = $lead->transcripts()->findOrFail($transcriptId);

        if (! trim((string) $transcript->transcript_text)) {
            return response()->json([
                'message' => 'This transcript has no text content yet. Add/paste transcript text before running AI analysis.',
            ], 422);
        }

        $service = app(LeadEvaluationService::class);
        $evaluation = $service->evaluateTranscript($lead, $transcript);

        $transcript->update(['evaluation_status' => 'evaluated']);

        return response()->json(['data' => $evaluation], 201);
    }

    /** GET /api/leads/{lead}/evaluations */
    public function getEvaluations(Lead $lead): JsonResponse
    {
        $evaluations = $lead->aiEvaluations()
            ->orderByDesc('evaluated_at')
            ->paginate(50);

        return response()->json($evaluations);
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

    /** DELETE /api/leads/{lead}/contacts/{contact} */
    public function deleteContact(Lead $lead, LeadContact $contact): JsonResponse
    {
        if ($contact->lead_id !== $lead->id) {
            abort(403, 'Contact does not belong to this lead');
        }

        AuditService::log('delete_contact', 'lead_contacts', $contact, $contact->toArray());

        $contact->payloads()->delete();
        $contact->delete();

        return response()->json(['message' => 'Contact deleted']);
    }

    /** POST /api/leads/{lead}/enrich-contacts — Manually trigger contact enrichment */
    public function triggerContactEnrichment(Lead $lead): JsonResponse
    {
        if (empty($lead->company_name) && empty($lead->website_domain)) {
            return response()->json(['message' => 'Lead must have company name or domain to enrich contacts'], 422);
        }

        EnrichLeadContactsJob::dispatch($lead->id)->onQueue('enrichment');

        AuditService::log('trigger_contact_enrichment', 'leads', $lead, null, [
            'triggered_by' => request()->user()?->id,
        ]);

        return response()->json(['message' => 'Contact enrichment queued']);
    }

    /* ═══════════════════════════════════════════════════════════ */
    /*  MODULE D: Revenue Intelligence Engine */
    /* ═══════════════════════════════════════════════════════════ */

    /** POST /api/leads/{lead}/icp-match */
    public function icpMatch(Lead $lead, ICPMatchingService $service): JsonResponse
    {
        $result = $service->matchLead($lead);
        AuditService::log('icp_match', 'leads', $lead, null, $result);

        return response()->json(['data' => $result]);
    }

    /** POST /api/leads/{lead}/predict-conversion */
    public function predictConversion(Lead $lead, ConversionPredictionService $service): JsonResponse
    {
        $result = $service->predict($lead);
        AuditService::log('predict_conversion', 'leads', $lead, null, [
            'probability' => $result['probability_to_close'],
        ]);

        return response()->json(['data' => $result]);
    }

    /** POST /api/leads/{lead}/prescribe */
    public function prescribe(Lead $lead, PrescriptiveEngineService $service): JsonResponse
    {
        $result = $service->prescribe($lead);
        AuditService::log('prescribe', 'leads', $lead, null, [
            'next_action' => $result['next_best_action'],
            'priority' => $result['priority_score'],
        ]);

        return response()->json(['data' => $result]);
    }

    /** GET /api/leads/{lead}/revenue-check */
    public function revenueCheck(Lead $lead, RevenueRuleEngineService $service): JsonResponse
    {
        $result = $service->evaluate($lead);

        return response()->json(['data' => $result]);
    }

    /** POST /api/leads/{lead}/outcome — Record won/lost feedback */
    public function recordOutcome(Request $request, Lead $lead): JsonResponse
    {
        $data = $request->validate([
            'outcome' => 'required|in:won,lost,churned,disqualified',
            'product_id' => 'nullable|exists:products,id',
            'sale_type' => 'nullable|in:new_sales,upsales',
            'deal_size' => 'nullable|numeric|min:0',
            'loss_reason' => 'nullable|string|max:255',
            'loss_category' => 'nullable|in:price,timing,competition,no_budget,no_need,other',
            'feedback_notes' => 'nullable|string',
            'closed_at' => 'nullable|date',
        ]);

        $data['lead_id'] = $lead->id;
        $data['closed_by'] = $request->user()->id;
        $data['closed_at'] = $data['closed_at'] ?? now();
        $data['sale_type'] = $data['sale_type']
            ?? ($lead->outcomes()->where('outcome', 'won')->exists() ? 'upsales' : 'new_sales');

        $outcome = LeadOutcome::create($data);

        // Update lead qualification status to reflect outcome
        $leadUpdates = [];
        if ($data['outcome'] === 'won') {
            $leadUpdates['qualification_status'] = 'eligible';
            if (! $lead->product_id && ! empty($data['product_id']) && $data['sale_type'] === 'new_sales') {
                $leadUpdates['product_id'] = $data['product_id'];
            }
        } elseif (in_array($data['outcome'], ['lost', 'disqualified'])) {
            $leadUpdates['qualification_status'] = 'not_eligible';
        }

        if ($leadUpdates !== []) {
            $lead->update($leadUpdates);
        }

        AuditService::log('record_outcome', 'leads', $lead, null, [
            'outcome' => $data['outcome'],
            'product_id' => $data['product_id'] ?? null,
            'sale_type' => $data['sale_type'],
            'deal_size' => $data['deal_size'] ?? null,
        ]);

        return response()->json(['data' => $outcome->load('product')], 201);
    }

    /** POST /api/leads/{lead}/revenue-analysis — Run Revenue Intelligence Analyst AI */
    public function runRevenueAnalysis(Lead $lead, RevenueIntelligenceAnalysisService $service): JsonResponse
    {
        $analysis = $service->analyze($lead);

        AuditService::log('revenue_analysis', 'leads', $lead, null, [
            'intent_level' => $analysis->intent_level,
            'probability_to_close' => $analysis->probability_to_close,
            'confidence' => $analysis->confidence,
            'status' => $analysis->status,
        ]);

        return response()->json(['data' => $analysis], 201);
    }

    /** GET /api/leads/{lead}/revenue-analysis — Latest revenue analysis */
    public function getRevenueAnalysis(Lead $lead): JsonResponse
    {
        $analysis = $lead->revenueAnalyses()->latest()->first();

        return response()->json(['data' => $analysis]);
    }

    /** GET /api/leads/{lead}/revenue-intelligence — Full Revenue Intel snapshot */
    public function revenueIntelligence(
        Lead $lead,
        ICPMatchingService $icpService,
        ConversionPredictionService $convService,
        PrescriptiveEngineService $prescService,
        RevenueRuleEngineService $ruleService
    ): JsonResponse {
        $lead->loadMissing('contacts', 'activities', 'funnelStage', 'industry', 'product', 'owner');
        $latestIcpMatch = $lead->icpMatches()->with('icpProfile')->latest()->first();

        return response()->json(['data' => [
            'lead_id' => $lead->id,
            'icp_match' => $latestIcpMatch ? [
                'id' => $latestIcpMatch->id,
                'matched' => true,
                'icp_profile' => $latestIcpMatch->icpProfile?->name,
                'icp_profile_id' => $latestIcpMatch->icp_profile_id,
                'icp_profile_detail' => $latestIcpMatch->icpProfile,
                'match_score' => $latestIcpMatch->match_score,
                'match_level' => $latestIcpMatch->match_level,
                'score_breakdown' => $latestIcpMatch->score_breakdown,
                'evaluated_at' => $latestIcpMatch->evaluated_at,
            ] : null,
            'latest_prediction' => $lead->conversionPredictions()->latest()->first(),
            'latest_prescription' => $lead->prescriptions()->with('recommendedOwner')->latest()->first(),
            'revenue_check' => $ruleService->evaluate($lead),
            'latest_outcome' => $lead->outcomes()->with('product')->latest('id')->first(),
            'latest_analysis' => $lead->revenueAnalyses()->latest()->first(),
        ]]);
    }

    private function ensureLeadReadyForPipeline(Request $request, Lead $lead): void
    {
        $verification = app(HumanVerificationWorkflowService::class)->verificationSnapshot($lead);
        $revenueCheck = app(RevenueRuleEngineService::class)->evaluate($lead);
        $errors = [];

        $latestReview = $verification['latest_review'];
        if ($verification['blocked_from_pipeline']) {
            $errors[] = 'Lead must be human-verified before entering the pipeline.';
        }

        if ($revenueCheck['blocked']) {
            $errors[] = $revenueCheck['summary'];
        }

        if ($errors === []) {
            return;
        }

        abort(response()->json([
            'message' => implode(' ', $errors),
            'verification' => [
                'requires_verification' => $verification['requires_verification'],
                'verified_for_pipeline' => $verification['verified_for_pipeline'],
                'latest_review_status' => $latestReview?->status,
                'latest_review_decision' => $latestReview?->decision,
                'latest_review_reason' => $latestReview?->decision_reason ?? $latestReview?->justification,
            ],
            'revenue_check' => $revenueCheck,
        ], 422));
    }

    /** POST /api/leads/{lead}/run-proofing-strategy */
    public function runProofingStrategy(Lead $lead): JsonResponse
    {
        // 1. ICP Match
        $icpService = app(\App\Services\Revenue\ICPMatchingService::class);
        $icpService->matchLead($lead);

        // 2. Score Lead
        $scoreService = app(\App\Services\Lead\LeadScoringService::class);
        $scoreService->scoreLead($lead);

        // 3. Qualify Lead
        $qualifyService = app(\App\Services\Lead\LeadQualificationService::class);
        $qualifyService->qualifyLead($lead, useAi: true);

        // 4. Dispatch Automated Enrichment (Background)
        EnrichLeadJob::dispatch($lead->id);

        return response()->json([
            'message' => 'AI Proofing & Strategy completed successfully (Enrichment running in background).',
        ]);
    }

    /** POST /api/leads/{lead}/run-intelligence */
    public function runIntelligence(Lead $lead): JsonResponse
    {
        RunLeadIntelligenceJob::dispatch($lead->id);

        return response()->json([
            'message' => 'AI Intelligence analysis running in background.',
        ]);
    }

    /** POST /api/leads/bulk-intelligence */
    public function bulkIntelligence(Request $request): JsonResponse
    {
        $data = $request->validate([
            'lead_ids' => 'required|array',
            'lead_ids.*' => 'exists:leads,id',
        ]);

        foreach ($data['lead_ids'] as $leadId) {
            RunLeadIntelligenceJob::dispatch((int) $leadId);
        }

        return response()->json([
            'message' => 'Bulk AI Intelligence analysis running in background for ' . count($data['lead_ids']) . ' leads.',
        ]);
    }
}
