<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BusinessCategory;
use App\Models\Industry;
use App\Models\IndustryNewsArticle;
use App\Models\IndustryNewsEntity;
use App\Models\IndustryNewsSyncLog;
use App\Services\AuditService;
use App\Services\News\IndustryNewsSyncService;
use App\Services\News\NewsEntityToLeadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LeadGeneratorNewsletterController extends Controller
{
    public function __construct(
        private readonly IndustryNewsSyncService $syncService,
        private readonly NewsEntityToLeadService $convertService,
    ) {}

    /**
     * GET /api/lead-generator/newsletter/industries
     * Returns active tenant-scoped industries annotated with sub-industries, linked/universal business categories,
     * cached article counts, and last sync timestamps.
     */
    public function industries(Request $request): JsonResponse
    {
        $tenantId = (int) ($request->user()?->tenant_id ?? 1);

        $industries = Industry::forTenantOrDefault($tenantId)
            ->where('is_active', true)
            ->with(['subIndustries' => fn ($q) => $q->where('is_active', true)->orderBy('name')])
            ->orderBy('name')
            ->get(['id', 'tenant_id', 'name', 'synonyms']);

        $allCategories = BusinessCategory::forTenantOrDefault($tenantId)
            ->where('is_active', true)
            ->orderByRaw('CASE WHEN industry_id IS NOT NULL THEN 0 ELSE 1 END')
            ->orderBy('code')
            ->orderBy('name')
            ->get(['id', 'industry_id', 'code', 'name', 'channel_role']);

        $articleCounts = IndustryNewsArticle::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->select('industry_id', DB::raw('COUNT(*) as total_articles'))
            ->groupBy('industry_id')
            ->pluck('total_articles', 'industry_id');

        $lastSyncs = IndustryNewsSyncLog::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('status', 'completed')
            ->select('industry_id', DB::raw('MAX(completed_at) as last_synced_at'))
            ->groupBy('industry_id')
            ->pluck('last_synced_at', 'industry_id');

        $items = $industries->map(function (Industry $ind) use ($articleCounts, $lastSyncs, $allCategories) {
            $applicableCategories = $allCategories->filter(
                fn (BusinessCategory $cat) => $cat->industry_id === null || (int) $cat->industry_id === (int) $ind->id
            );

            return [
                'id' => $ind->id,
                'name' => $ind->name,
                'cached_articles_count' => (int) ($articleCounts[$ind->id] ?? 0),
                'last_synced_at' => $lastSyncs[$ind->id] ?? null,
                'sub_industries' => $ind->subIndustries->map(fn ($sub) => [
                    'id' => $sub->id,
                    'name' => $sub->name,
                ])->values(),
                'business_categories' => $applicableCategories->map(fn (BusinessCategory $cat) => [
                    'id' => $cat->id,
                    'industry_id' => $cat->industry_id,
                    'code' => $cat->code,
                    'name' => $cat->name,
                    'channel_role' => $cat->channel_role ?? 'direct_b2b',
                ])->values(),
            ];
        })->values();

        return response()->json([
            'success' => true,
            'data' => $items,
        ]);
    }

    /**
     * GET /api/lead-generator/newsletter
     * DB-first read of stored industry news filtered by Industry, Sub-Industry, and Business Category.
     */
    public function index(Request $request): JsonResponse
    {
        $tenantId = (int) ($request->user()?->tenant_id ?? 1);
        $requestedIndustryId = $request->integer('industry_id');

        $tenantIndustryIds = Industry::forTenantOrDefault($tenantId)
            ->where('is_active', true)
            ->pluck('id')
            ->all();

        if ($requestedIndustryId <= 0 || ! in_array($requestedIndustryId, $tenantIndustryIds, true)) {
            $cachedIndustryId = IndustryNewsArticle::withoutGlobalScopes()
                ->where('tenant_id', $tenantId)
                ->when($tenantIndustryIds !== [], fn ($q) => $q->whereIn('industry_id', $tenantIndustryIds))
                ->latest('created_at')
                ->value('industry_id');

            $requestedIndustryId = $cachedIndustryId
                ?: (int) (Industry::forTenantOrDefault($tenantId)->where('is_active', true)->orderBy('name')->value('id') ?? 0);
        }

        if ($requestedIndustryId <= 0) {
            return response()->json([
                'success' => true,
                'data' => [
                    'industry' => null,
                    'telemetry' => $this->emptyTelemetry(),
                    'articles' => [],
                    'entity_directory' => [],
                    'meta' => ['current_page' => 1, 'last_page' => 1, 'per_page' => 25, 'total' => 0],
                ],
            ]);
        }

        $industry = Industry::withoutGlobalScopes()->find($requestedIndustryId);
        if (! $industry) {
            return response()->json([
                'success' => false,
                'message' => 'Selected industry not found.',
            ], 404);
        }

        $this->syncService->reconcileMatchedLeads($tenantId, $industry->id);

        $subIndustryId = $request->filled('sub_industry_id') ? $request->integer('sub_industry_id') : null;
        $businessCategoryId = $request->filled('business_category_id') ? $request->integer('business_category_id') : null;
        $signalType = trim((string) $request->query('signal_type', 'all'));
        $entityStatus = trim((string) $request->query('entity_status', 'all'));
        $search = trim((string) $request->query('search', ''));
        $perPage = min(max((int) $request->query('per_page', 24), 6), 60);

        // 1. Build Structured Telemetry Headers for the selected 3D taxonomy slice
        $telemetry = $this->buildIndustryTelemetry($tenantId, $industry->id, $subIndustryId, $businessCategoryId);

        // 2. Build Filtered Articles Query
        $articlesQuery = IndustryNewsArticle::withoutGlobalScopes()
            ->with([
                'subIndustry:id,name',
                'businessCategory:id,code,name,channel_role',
                'entities' => fn ($q) => $q->withoutGlobalScopes()->with('matchedLead:id,company_name'),
            ])
            ->where('tenant_id', $tenantId)
            ->where('industry_id', $industry->id);

        if ($subIndustryId) {
            $articlesQuery->where('sub_industry_id', $subIndustryId);
        }

        if ($businessCategoryId) {
            $articlesQuery->where('business_category_id', $businessCategoryId);
        }

        if ($signalType !== '' && $signalType !== 'all') {
            $articlesQuery->where('signal_type', $signalType);
        }

        if ($entityStatus === 'prospects') {
            $articlesQuery->whereHas('entities', fn ($q) => $q->withoutGlobalScopes()->whereNull('matched_lead_id'));
        } elseif ($entityStatus === 'in_leads') {
            $articlesQuery->whereHas('entities', fn ($q) => $q->withoutGlobalScopes()->whereNotNull('matched_lead_id'));
        }

        if ($search !== '') {
            $like = '%'.mb_strtolower($search).'%';
            $articlesQuery->where(function ($q) use ($like) {
                $q->whereRaw('LOWER(title) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(COALESCE(snippet, \'\')) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(COALESCE(source_name, \'\')) LIKE ?', [$like])
                    ->orWhereHas('entities', fn ($eq) => $eq->withoutGlobalScopes()->whereRaw('LOWER(entity_name) LIKE ?', [$like]));
            });
        }

        $paginator = $articlesQuery
            ->orderByDesc('published_at')
            ->orderByDesc('id')
            ->paginate($perPage);

        // 3. Build Aggregated Entity Directory for this 3D taxonomy slice
        $entityDirectory = $this->buildEntityDirectory(
            $tenantId,
            $industry->id,
            $subIndustryId,
            $businessCategoryId,
            $entityStatus,
            $search
        );

        return response()->json([
            'success' => true,
            'data' => [
                'industry' => [
                    'id' => $industry->id,
                    'name' => $industry->name,
                ],
                'telemetry' => $telemetry,
                'articles' => collect($paginator->items())->map(fn (IndustryNewsArticle $art) => [
                    'id' => $art->id,
                    'title' => $art->title,
                    'url' => $art->url,
                    'source_name' => $art->source_name,
                    'source_domain' => $art->source_domain,
                    'published_at' => $art->published_at?->toIso8601String(),
                    'snippet' => $art->snippet,
                    'signal_type' => $art->signal_type,
                    'relevance_tier' => $art->relevance_tier,
                    'search_provider' => $art->search_provider,
                    'sub_industry' => $art->subIndustry ? [
                        'id' => $art->subIndustry->id,
                        'name' => $art->subIndustry->name,
                    ] : null,
                    'business_category' => $art->businessCategory ? [
                        'id' => $art->businessCategory->id,
                        'code' => $art->businessCategory->code,
                        'name' => $art->businessCategory->name,
                        'channel_role' => $art->businessCategory->channel_role ?? 'direct_b2b',
                    ] : null,
                    'entities' => $art->entities->map(fn (IndustryNewsEntity $ent) => [
                        'id' => $ent->id,
                        'entity_name' => $ent->entity_name,
                        'normalized_name' => $ent->normalized_name,
                        'entity_type' => $ent->entity_type,
                        'parent_company_hint' => $ent->parent_company_hint,
                        'website_hint' => $ent->website_hint,
                        'role_in_news' => $ent->role_in_news,
                        'signal_context' => $ent->signal_context,
                        'matched_lead_id' => $ent->matched_lead_id,
                        'matched_lead_name' => $ent->matchedLead?->company_name,
                        'converted_at' => $ent->converted_at?->toIso8601String(),
                    ])->values(),
                ])->values(),
                'entity_directory' => $entityDirectory,
                'meta' => [
                    'current_page' => $paginator->currentPage(),
                    'last_page' => $paginator->lastPage(),
                    'per_page' => $paginator->perPage(),
                    'total' => $paginator->total(),
                ],
            ],
        ]);
    }

    /**
     * POST /api/lead-generator/newsletter/sync
     */
    public function sync(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'industry_id' => 'required|integer|exists:industries,id',
            'sub_industry_id' => 'nullable|integer|exists:sub_industries,id',
            'business_category_id' => 'nullable|integer|exists:business_categories,id',
            'region_scope' => 'nullable|string|in:id,global',
            'focus_keyword' => 'nullable|string|max:100',
            'sync' => 'nullable|boolean',
            'force' => 'nullable|boolean',
        ]);

        $tenantId = (int) ($request->user()?->tenant_id ?? 1);
        $userId = $request->user()?->id;
        $industryId = (int) $validated['industry_id'];
        $subIndustryId = ! empty($validated['sub_industry_id']) ? (int) $validated['sub_industry_id'] : null;
        $businessCategoryId = ! empty($validated['business_category_id']) ? (int) $validated['business_category_id'] : null;
        $regionScope = $validated['region_scope'] ?? 'id';
        $focusKeyword = $validated['focus_keyword'] ?? null;

        // Prevent duplicate concurrent runs on the exact same taxonomy slice
        $activeRun = IndustryNewsSyncLog::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('industry_id', $industryId)
            ->when($subIndustryId, fn ($q) => $q->where('sub_industry_id', $subIndustryId), fn ($q) => $q->whereNull('sub_industry_id'))
            ->when($businessCategoryId, fn ($q) => $q->where('business_category_id', $businessCategoryId), fn ($q) => $q->whereNull('business_category_id'))
            ->whereIn('status', ['queued', 'running'])
            ->where('created_at', '>=', now()->subMinutes(3))
            ->latest('id')
            ->first();

        if ($activeRun && ! $request->boolean('sync')) {
            return response()->json([
                'success' => true,
                'message' => 'A sync for this industry filter is already in progress.',
                'data' => $activeRun,
            ]);
        }

        if ($request->boolean('sync')) {
            @set_time_limit(120);
            $log = $this->syncService->runSyncInline(
                $tenantId,
                $industryId,
                $subIndustryId,
                $regionScope,
                $userId,
                $focusKeyword,
                $businessCategoryId
            );
        } else {
            $log = $this->syncService->dispatchSync(
                $tenantId,
                $industryId,
                $subIndustryId,
                $regionScope,
                $userId,
                $focusKeyword,
                $businessCategoryId
            );
        }

        AuditService::log(
            'sync_industry_news',
            'lead_generator_newsletter',
            $log,
            null,
            [
                'industry_id' => $industryId,
                'sub_industry_id' => $subIndustryId,
                'business_category_id' => $businessCategoryId,
                'region_scope' => $regionScope,
                'mode' => $request->boolean('sync') ? 'inline' : 'queued',
            ],
            'success',
            null,
            $userId
        );

        return response()->json([
            'success' => true,
            'message' => 'Industry newsletter sync started.',
            'data' => $log,
        ]);
    }

    /**
     * GET /api/lead-generator/newsletter/sync/{id}/status
     */
    public function syncStatus(Request $request, int $id): JsonResponse
    {
        $tenantId = (int) ($request->user()?->tenant_id ?? 1);

        $log = IndustryNewsSyncLog::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $log,
        ]);
    }

    /**
     * POST /api/lead-generator/newsletter/convert
     */
    public function convert(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'items' => 'required|array|min:1|max:50',
            'items.*.entity_id' => 'required|integer',
            'items.*.company_name' => 'nullable|string|max:255',
            'items.*.brand' => 'nullable|string|max:255',
            'items.*.website' => 'nullable|string|max:255',
            'items.*.sub_industry_id' => 'nullable|integer|exists:sub_industries,id',
            'items.*.business_category_id' => 'nullable|integer|exists:business_categories,id',
            'trigger_ai_enrichment' => 'nullable|boolean',
        ]);

        $tenantId = (int) ($request->user()?->tenant_id ?? 1);
        $userId = (int) $request->user()->id;
        $triggerAi = $validated['trigger_ai_enrichment'] ?? true;

        $result = $this->convertService->convertBatch(
            $validated['items'],
            $tenantId,
            $userId,
            (bool) $triggerAi
        );

        return response()->json([
            'success' => true,
            'message' => sprintf(
                'Conversion completed: %d new lead(s) created, %d linked to existing CRM record(s).',
                $result['converted'],
                $result['linked_existing']
            ),
            'data' => $result,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function buildIndustryTelemetry(
        int $tenantId,
        int $industryId,
        ?int $subIndustryId,
        ?int $businessCategoryId = null
    ): array {
        $baseArticles = IndustryNewsArticle::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('industry_id', $industryId);

        if ($subIndustryId) {
            $baseArticles->where('sub_industry_id', $subIndustryId);
        }

        if ($businessCategoryId) {
            $baseArticles->where('business_category_id', $businessCategoryId);
        }

        $totalArticles = (clone $baseArticles)->count();
        $uniquePublishers = (clone $baseArticles)
            ->whereNotNull('source_name')
            ->distinct('source_name')
            ->count('source_name');

        $signalCounts = (clone $baseArticles)
            ->select('signal_type', DB::raw('COUNT(*) as count'))
            ->groupBy('signal_type')
            ->orderByDesc('count')
            ->get();

        $signalBreakdown = $signalCounts->map(fn ($row) => [
            'signal_type' => $row->signal_type,
            'count' => (int) $row->count,
            'percentage' => $totalArticles > 0 ? round(((int) $row->count / $totalArticles) * 100, 1) : 0,
        ])->values()->all();

        $entityRows = IndustryNewsEntity::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('industry_id', $industryId)
            ->when($subIndustryId || $businessCategoryId, function ($q) use ($subIndustryId, $businessCategoryId) {
                $q->whereHas('article', function ($aq) use ($subIndustryId, $businessCategoryId) {
                    $aq->withoutGlobalScopes();
                    if ($subIndustryId) {
                        $aq->where('sub_industry_id', $subIndustryId);
                    }
                    if ($businessCategoryId) {
                        $aq->where('business_category_id', $businessCategoryId);
                    }
                });
            })
            ->get(['normalized_name', 'matched_lead_id']);

        $groupedEntities = $entityRows->groupBy('normalized_name');
        $uniqueEntitiesCount = $groupedEntities->count();
        $inLeadsCount = 0;
        foreach ($groupedEntities as $group) {
            if ($group->contains(fn ($r) => ! empty($r->matched_lead_id))) {
                $inLeadsCount++;
            }
        }
        $prospectsCount = max(0, $uniqueEntitiesCount - $inLeadsCount);

        $editionNumber = IndustryNewsSyncLog::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('industry_id', $industryId)
            ->where('status', 'completed')
            ->count();

        $lastSync = IndustryNewsSyncLog::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('industry_id', $industryId)
            ->latest('id')
            ->first();

        return [
            'total_articles' => $totalArticles,
            'unique_publishers' => $uniquePublishers,
            'unique_entities' => $uniqueEntitiesCount,
            'convertible_prospects' => $prospectsCount,
            'pipeline_mentions' => $inLeadsCount,
            'dominant_signal' => $signalBreakdown[0] ?? null,
            'signal_breakdown' => $signalBreakdown,
            'edition_number' => $editionNumber,
            'last_sync' => $lastSync ? [
                'id' => $lastSync->id,
                'status' => $lastSync->status,
                'region_scope' => $lastSync->region_scope,
                'articles_fetched' => $lastSync->articles_fetched,
                'new_articles_saved' => $lastSync->new_articles_saved,
                'entities_detected' => $lastSync->entities_detected,
                'providers_used' => $lastSync->providers_used ?? [],
                'error_message' => $lastSync->error_message,
                'completed_at' => $lastSync->completed_at?->toIso8601String(),
                'created_at' => $lastSync->created_at?->toIso8601String(),
            ] : null,
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function buildEntityDirectory(
        int $tenantId,
        int $industryId,
        ?int $subIndustryId,
        ?int $businessCategoryId,
        string $entityStatus,
        string $search
    ): array {
        $rows = IndustryNewsEntity::withoutGlobalScopes()
            ->with(['article:id,title,url,source_name,signal_type,published_at,sub_industry_id,business_category_id', 'matchedLead:id,company_name'])
            ->where('tenant_id', $tenantId)
            ->where('industry_id', $industryId)
            ->when($subIndustryId || $businessCategoryId, function ($q) use ($subIndustryId, $businessCategoryId) {
                $q->whereHas('article', function ($aq) use ($subIndustryId, $businessCategoryId) {
                    $aq->withoutGlobalScopes();
                    if ($subIndustryId) {
                        $aq->where('sub_industry_id', $subIndustryId);
                    }
                    if ($businessCategoryId) {
                        $aq->where('business_category_id', $businessCategoryId);
                    }
                });
            })
            ->orderByDesc('id')
            ->get();

        $directory = [];

        foreach ($rows->groupBy('normalized_name') as $normName => $group) {
            /** @var IndustryNewsEntity $primary */
            $primary = $group->first();
            $matchedRow = $group->first(fn (IndustryNewsEntity $e) => ! empty($e->matched_lead_id));
            $matchedLeadId = $matchedRow?->matched_lead_id;
            $matchedLeadName = $matchedRow?->matchedLead?->company_name;

            if ($entityStatus === 'prospects' && $matchedLeadId) {
                continue;
            }
            if ($entityStatus === 'in_leads' && ! $matchedLeadId) {
                continue;
            }

            if ($search !== '') {
                $needle = mb_strtolower($search);
                $haystack = mb_strtolower($primary->entity_name.' '.($primary->parent_company_hint ?? '').' '.($primary->article?->title ?? ''));
                if (! str_contains($haystack, $needle)) {
                    continue;
                }
            }

            $directory[] = [
                'representative_entity_id' => $primary->id,
                'entity_name' => $primary->entity_name,
                'normalized_name' => $normName,
                'entity_type' => $primary->entity_type,
                'parent_company_hint' => $group->first(fn ($e) => ! empty($e->parent_company_hint))?->parent_company_hint,
                'website_hint' => $group->first(fn ($e) => ! empty($e->website_hint))?->website_hint,
                'mention_count' => $group->pluck('article_id')->unique()->count(),
                'latest_signal_type' => $primary->article?->signal_type ?? 'market_move',
                'latest_headline' => $primary->article?->title,
                'latest_article_url' => $primary->article?->url,
                'latest_source_name' => $primary->article?->source_name,
                'latest_published_at' => $primary->article?->published_at?->toIso8601String(),
                'latest_sub_industry_id' => $primary->article?->sub_industry_id,
                'latest_business_category_id' => $primary->article?->business_category_id,
                'signal_context' => $primary->signal_context,
                'matched_lead_id' => $matchedLeadId,
                'matched_lead_name' => $matchedLeadName,
            ];
        }

        usort($directory, function (array $a, array $b) {
            if ($a['mention_count'] !== $b['mention_count']) {
                return $b['mention_count'] <=> $a['mention_count'];
            }

            return ((bool) $a['matched_lead_id']) <=> ((bool) $b['matched_lead_id']);
        });

        return $directory;
    }

    /**
     * @return array<string, mixed>
     */
    private function emptyTelemetry(): array
    {
        return [
            'total_articles' => 0,
            'unique_publishers' => 0,
            'unique_entities' => 0,
            'convertible_prospects' => 0,
            'pipeline_mentions' => 0,
            'dominant_signal' => null,
            'signal_breakdown' => [],
            'edition_number' => 0,
            'last_sync' => null,
        ];
    }
}
