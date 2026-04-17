<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\DeduplicateLeadJob;
use App\Jobs\EnrichLeadJob;
use App\Jobs\ScoreLeadJob;
use App\Models\Lead;
use App\Services\AuditService;
use App\Services\DeduplicationService;
use App\Services\LeadDiscoveryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LeadController extends Controller
{
    public function __construct(
        private readonly DeduplicationService $dedup,
        private readonly LeadDiscoveryService $discovery,
    ) {}

    /** GET /api/leads */
    public function index(Request $request): JsonResponse
    {
        $query = Lead::with(['industry', 'subIndustry', 'funnelStage', 'owner', 'territory', 'product']);

        // Filters
        if ($request->filled('industry_id')) {
            $query->where('industry_id', $request->industry_id);
        }
        if ($request->filled('funnel_stage_id')) {
            $query->where('funnel_stage_id', $request->funnel_stage_id);
        }
        if ($request->filled('qualification_status')) {
            $query->where('qualification_status', $request->qualification_status);
        }
        if ($request->filled('product_id')) {
            $query->where('product_id', $request->product_id);
        }
        if ($request->filled('territory_id')) {
            $query->where('territory_id', $request->territory_id);
        }
        if ($request->filled('duplicate_status')) {
            $query->where('duplicate_status', $request->duplicate_status);
        }
        if ($request->filled('owner_id')) {
            $query->where('owner_id', $request->owner_id);
        }
        if ($request->filled('min_score')) {
            $query->where('lead_score', '>=', (int) $request->min_score);
        }
        if ($request->filled('search')) {
            $s = '%' . $request->search . '%';
            $query->where(function ($q) use ($s) {
                $q->where('company_name', 'ilike', $s)
                  ->orWhere('address', 'ilike', $s)
                  ->orWhere('email', 'ilike', $s);
            });
        }

        // Sorting
        $sortField = $request->get('sort', 'created_at');
        $sortDir   = $request->get('dir', 'desc');
        $allowed   = ['company_name', 'lead_score', 'created_at', 'qualification_status'];
        if (in_array($sortField, $allowed)) {
            $query->orderBy($sortField, $sortDir === 'asc' ? 'asc' : 'desc');
        }

        $leads = $query->paginate($request->get('per_page', 25));

        return response()->json($leads);
    }

    public function show(Lead $lead): JsonResponse
    {
        $lead->load([
            'industry', 'subIndustry', 'funnelStage', 'owner',
            'territory', 'product', 'contacts.contactSource',
            'sources', 'funnelHistory.fromStage', 'funnelHistory.toStage',
            'funnelHistory.movedBy', 'creator',
            'scores', 'qualifications', 'productMatches', 'aiAnalyses',
            'activities', 'meetings', 'transcripts', 'aiEvaluations', 'followUps'
        ]);

        return response()->json(['data' => $lead]);
    }

    /** POST /api/leads */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'company_name'         => 'required|string|max:255',
            'address'              => 'nullable|string',
            'lat'                  => 'nullable|numeric',
            'lng'                  => 'nullable|numeric',
            'website'              => 'nullable|url|max:500',
            'phone'                => 'nullable|string|max:30',
            'email'                => 'nullable|email',
            'industry_id'          => 'nullable|exists:industries,id',
            'sub_industry_id'      => 'nullable|exists:sub_industries,id',
            'business_category'    => 'nullable|string|max:255',
            'external_place_id'    => 'nullable|string|max:255',
            'product_id'           => 'nullable|exists:products,id',
            'territory_id'         => 'nullable|exists:territories,id',
            'ai_mode'              => 'nullable|in:full_ai,hybrid,manual',
            'use_ai_reference'     => 'nullable|boolean',
            'funnel_stage_id'      => 'nullable|exists:funnel_stages,id',
            'owner_id'             => 'nullable|exists:users,id',
        ]);

        // Extract website domain for dedup
        if (! empty($data['website'])) {
            $data['website_domain'] = parse_url($data['website'], PHP_URL_HOST);
        }

        $data['created_by'] = $request->user()?->id;

        // Synchronous dedup check before creation
        $dedupResult = $this->dedup->check($data);
        if ($dedupResult->status === 'exact_duplicate') {
            return response()->json([
                'message'    => 'Exact duplicate detected',
                'duplicate'  => $dedupResult->toArray(),
            ], 409);
        }

        $data['duplicate_status'] = $dedupResult->status;
        $data['duplicate_of_id']  = $dedupResult->matchedLeadId;

        $lead = Lead::create($data);

        AuditService::logCreated('leads', $lead);

        // Dispatch async jobs based on AI mode
        $aiMode = $data['ai_mode'] ?? 'manual';

        if ($lead->external_place_id) {
            EnrichLeadJob::dispatch($lead->id)->onQueue('enrichment');
        }

        if (in_array($aiMode, ['full_ai', 'hybrid'])) {
            ScoreLeadJob::dispatch($lead->id)->onQueue('scoring');
        }

        return response()->json([
            'data'      => $lead->load(['industry', 'funnelStage']),
            'duplicate' => $dedupResult->toArray(),
        ], 201);
    }

    /** PUT /api/leads/{lead} */
    public function update(Request $request, Lead $lead): JsonResponse
    {
        $original = $lead->getAttributes();

        $data = $request->validate([
            'company_name'         => 'sometimes|string|max:255',
            'address'              => 'nullable|string',
            'lat'                  => 'nullable|numeric',
            'lng'                  => 'nullable|numeric',
            'website'              => 'nullable|url|max:500',
            'phone'                => 'nullable|string|max:30',
            'email'                => 'nullable|email',
            'industry_id'          => 'nullable|exists:industries,id',
            'sub_industry_id'      => 'nullable|exists:sub_industries,id',
            'business_category'    => 'nullable|string|max:255',
            'lead_score'           => 'nullable|integer|min:0|max:100',
            'qualification_status' => 'nullable|in:pending,eligible,potential,not_eligible',
            'ai_explanation'       => 'nullable|string',
            'funnel_stage_id'      => 'nullable|exists:funnel_stages,id',
            'owner_id'             => 'nullable|exists:users,id',
            'product_id'           => 'nullable|exists:products,id',
        ]);

        if (isset($data['website'])) {
            $data['website_domain'] = parse_url($data['website'], PHP_URL_HOST);
        }

        // Track funnel stage change
        if (isset($data['funnel_stage_id']) && $data['funnel_stage_id'] != $lead->funnel_stage_id) {
            $lead->funnelHistory()->create([
                'from_stage_id' => $lead->funnel_stage_id,
                'to_stage_id'   => $data['funnel_stage_id'],
                'moved_by'      => $request->user()?->id,
            ]);
        }

        $lead->update($data);

        AuditService::logUpdated('leads', $lead, $original);

        return response()->json(['data' => $lead->fresh(['industry', 'funnelStage'])]);
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

        $lead->funnelHistory()->create([
            'from_stage_id' => $lead->funnel_stage_id,
            'to_stage_id'   => $data['funnel_stage_id'],
            'moved_by'      => $request->user()?->id,
        ]);

        $lead->update(['funnel_stage_id' => $data['funnel_stage_id']]);

        AuditService::log('funnel_push', 'leads', $lead, null, $data);

        return response()->json(['data' => $lead->fresh('funnelStage')]);
    }

    /** POST /api/leads/{lead}/rescore */
    public function rescore(Lead $lead): JsonResponse
    {
        ScoreLeadJob::dispatch($lead->id)->onQueue('scoring');

        $lead->update(['ai_processing_status' => 'queued']);

        return response()->json(['message' => 'Scoring job dispatched', 'data' => $lead]);
    }

    /** POST /api/leads/{lead}/activities */
    public function logActivity(Request $request, Lead $lead): JsonResponse
    {
        $data = $request->validate([
            'activity_type' => 'required|string',
            'description'   => 'nullable|string',
        ]);

        $activity = $lead->activities()->create([
            'activity_type' => $data['activity_type'],
            'description'   => $data['description'] ?? '',
            'activity_date' => now(),
            'user_id'       => $request->user()?->id,
        ]);

        return response()->json(['data' => $activity], 201);
    }

    /** POST /api/leads/{lead}/meetings */
    public function logMeeting(Request $request, Lead $lead): JsonResponse
    {
        $data = $request->validate([
            'meeting_date' => 'required|date',
            'meeting_type' => 'nullable|string',
            'summary'      => 'nullable|string',
            'participants' => 'nullable|array',
            'key_points'   => 'nullable|array',
            'objections'   => 'nullable|array',
            'next_steps'   => 'nullable|array',
            'follow_up_date'=> 'nullable|date',
        ]);

        $data['created_by'] = $request->user()?->id;

        $meeting = $lead->meetings()->create($data);

        // Also log it on the timeline globally
        $lead->activities()->create([
            'activity_type' => 'Meeting',
            'description'   => 'Logged a meeting: ' . ($data['summary'] ?? 'No summary'),
            'activity_date' => $data['meeting_date'],
            'related_entity_type' => get_class($meeting),
            'related_entity_id' => $meeting->id,
            'user_id'       => $request->user()?->id,
        ]);

        return response()->json(['data' => $meeting], 201);
    }

    /** POST /api/leads/{lead}/contacts/{contact}/set-primary */
    public function setPrimaryContact(Lead $lead, \App\Models\LeadContact $contact): JsonResponse
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
        ]);

        $data['source'] = 'manual';
        $data['confidence'] = 'high';
        $data['confidence_score'] = 100;
        
        $contact = $lead->contacts()->create($data);

        return response()->json(['data' => $contact], 201);
    }

    /** PUT /api/leads/{lead}/contacts/{contact} */
    public function updateContact(Request $request, Lead $lead, \App\Models\LeadContact $contact): JsonResponse
    {
        if ($contact->lead_id !== $lead->id) {
            abort(403);
        }

        $data = $request->validate([
            'name' => 'sometimes|string',
            'title' => 'nullable|string',
            'email' => 'nullable|email',
            'phone' => 'nullable|string',
        ]);

        // If manual update happens, we mark the confidence as explicitly upgraded
        $data['source'] = 'manual';
        $data['confidence'] = 'high';
        $data['confidence_score'] = 100;

        $contact->update($data);

        return response()->json(['data' => $contact]);
    }

    /** POST /api/leads/discover — Map-based lead discovery */
    public function discover(Request $request): JsonResponse
    {
        $data = $request->validate([
            'lat'     => 'required|numeric|between:-90,90',
            'lng'     => 'required|numeric|between:-180,180',
            'radius'  => 'required|integer|min:100|max:50000',
            'keyword' => 'nullable|string|max:255',
            'type'    => 'nullable|string|max:100',
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
            'data'            => $enrichedResults,
            'next_page_token' => $results['next_page_token'] ?? null,
            'error'           => $results['error'] ?? null,
        ]);
    }

    /** POST /api/leads/bulk-import — Import discovered leads into database */
    public function bulkImport(Request $request): JsonResponse
    {
        $data = $request->validate([
            'leads'              => 'required|array|min:1|max:100',
            'leads.*.company_name' => 'required|string|max:255',
            'leads.*.address'    => 'nullable|string',
            'leads.*.lat'        => 'nullable|numeric',
            'leads.*.lng'        => 'nullable|numeric',
            'leads.*.phone'      => 'nullable|string',
            'leads.*.email'      => 'nullable|email',
            'leads.*.website'    => 'nullable|url',
            'leads.*.external_place_id' => 'nullable|string',
            'leads.*.business_category' => 'nullable|string',
            'territory_id'       => 'nullable|exists:territories,id',
            'product_id'         => 'nullable|exists:products,id',
            'ai_mode'            => 'nullable|in:full_ai,hybrid,manual',
        ]);

        $created  = [];
        $skipped  = [];
        $aiMode   = $data['ai_mode'] ?? 'manual';

        foreach ($data['leads'] as $leadData) {
            // Domain extraction
            if (! empty($leadData['website'])) {
                $leadData['website_domain'] = parse_url($leadData['website'], PHP_URL_HOST);
            }

            // Dedup
            $dedupResult = $this->dedup->check($leadData);
            if ($dedupResult->status === 'exact_duplicate') {
                $skipped[] = [
                    'company_name' => $leadData['company_name'],
                    'reason'       => "Duplicate of #{$dedupResult->matchedLeadId}",
                ];
                continue;
            }

            $leadData['territory_id']     = $data['territory_id'] ?? null;
            $leadData['product_id']       = $data['product_id'] ?? null;
            $leadData['ai_mode']          = $aiMode;
            $leadData['duplicate_status'] = $dedupResult->status;
            $leadData['duplicate_of_id']  = $dedupResult->matchedLeadId;
            $leadData['created_by']       = $request->user()?->id;

            $lead = Lead::create($leadData);

            if ($lead->external_place_id) {
                EnrichLeadJob::dispatch($lead->id)->onQueue('enrichment');
            }

            if (in_array($aiMode, ['full_ai', 'hybrid'])) {
                ScoreLeadJob::dispatch($lead->id)->onQueue('scoring');
            }

            $created[] = $lead;
        }

        AuditService::log('bulk_import', 'leads', null, null, [
            'created' => count($created),
            'skipped' => count($skipped),
        ]);

        return response()->json([
            'created' => count($created),
            'skipped' => $skipped,
            'leads'   => collect($created)->map->only(['id', 'company_name', 'duplicate_status']),
        ], 201);
    }

    /** GET /api/leads/export — CSV export */
    public function export(Request $request): \Symfony\Component\HttpFoundation\StreamedResponse
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
            'Content-Type'        => 'text/csv',
            'Content-Disposition' => 'attachment; filename="leads_export_' . now()->format('Ymd_His') . '.csv"',
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
}
