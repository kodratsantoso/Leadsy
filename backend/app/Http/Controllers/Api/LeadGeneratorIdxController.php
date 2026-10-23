<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\IdxCompanyCache;
use App\Services\Idx\IdxCompanyCacheService;
use App\Services\Idx\IdxCompanyDiscoveryService;
use App\Services\Idx\IdxCompanyNormalizer;
use App\Services\Idx\IdxToLeadMappingService;
use App\Services\LeadDuplicateDetectionService;
use App\Services\AuditService;
use Illuminate\Support\Facades\DB;

class LeadGeneratorIdxController extends Controller
{
    public function __construct(
        private IdxCompanyCacheService $cacheService,
        private IdxCompanyDiscoveryService $discoveryService,
        private IdxCompanyNormalizer $normalizer,
        private IdxToLeadMappingService $mappingService,
        private LeadDuplicateDetectionService $duplicateService
    ) {}

    public function index(Request $request)
    {
        $refresh = $request->query('refresh', 'false') === 'true';
        if ($refresh) {
            $count = $this->cacheService->refreshCacheFromLocal();
            AuditService::log(
                'refresh',
                'lead_generator_idx',
                null, null, null, 'success',
                ['count' => $count],
                $request->user()->id
            );
        }

        // If the cache is empty, try to populate it from the shipped dataset.
        if (IdxCompanyCache::count() === 0) {
            $this->cacheService->refreshCacheFromLocal();
        }

        // An empty cache with no dataset to load from is a broken install, not an empty
        // search result — and the two used to look identical on screen. Say which it is,
        // and name the file we looked for, so this does not need a developer to diagnose.
        if (IdxCompanyCache::count() === 0 && $this->cacheService->datasetPath() === null) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'IDX_DATASET_MISSING',
                    'message' => 'The IDX company dataset is not installed on this server, so there is nothing to search.',
                    'hint' => 'The file ships with the application. Ask an administrator to check that one of these exists in the backend container: '
                        .implode(' or ', IdxCompanyCacheService::DATASET_PATHS)
                        .'. A volume mounted over storage/ will hide a copy kept there.',
                ],
                'message' => 'The IDX company dataset is not installed on this server, so there is nothing to search.',
            ], 503);
        }

        $tenantId = $request->user()->tenant_id;

        // Precompute duplicate status across all cached IDX companies for global counters & server-side filtering
        $allIdx = IdxCompanyCache::all(['idx_code', 'company_name', 'website']);
        $allIdxItems = $allIdx->map(fn ($c) => [
            'idx_code' => $c->idx_code,
            'company_name' => $c->company_name,
            'website' => $c->website,
        ])->all();

        $allDuplicatesMap = $this->duplicateService->findDuplicatesForBatch($allIdxItems, $tenantId);
        $duplicateIdxCodes = array_keys(array_filter($allDuplicatesMap, fn ($d) => $d['is_duplicate']));

        $filters = [
            'keyword' => $request->query('keyword', ''),
            'sector' => $request->query('sector', ''),
            'listing_board' => $request->query('listing_board', ''),
            'industry' => $request->query('industry', ''),
            'sub_industry' => $request->query('sub_industry', ''),
            'status' => $request->query('status', 'all'), // 'all' | 'new' | 'in_leads'
        ];
        
        $perPage = (int) $request->query('per_page', 50);

        $paginator = $this->discoveryService->search($filters, $perPage, $duplicateIdxCodes);

        $normalizedItems = collect($paginator->items())->map(fn ($c) => $this->normalizer->normalize($c))->all();

        $items = collect($normalizedItems)->map(function ($item) use ($allDuplicatesMap) {
            $code = $item['idx_code'] ?? '';
            $dupInfo = $allDuplicatesMap[$code] ?? ['is_duplicate' => false, 'lead_id' => null, 'lead_company_name' => null];

            $item['is_duplicate'] = $dupInfo['is_duplicate'];
            $item['lead_id'] = $dupInfo['lead_id'];
            $item['lead_company_name'] = $dupInfo['lead_company_name'];
            return $item;
        });

        // Log search if there's a keyword or filter
        if ($filters['keyword'] || $filters['sector'] || $filters['listing_board'] || $filters['industry'] || $filters['sub_industry'] || $filters['status'] !== 'all') {
            AuditService::log(
                'search',
                'lead_generator_idx',
                null, null, null, 'success',
                ['filters' => $filters],
                $request->user()->id
            );
        }

        $totalCached = $allIdx->count();
        $totalInLeads = count($duplicateIdxCodes);
        $totalNew = $totalCached - $totalInLeads;

        return response()->json([
            'data' => $items,
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'cached_companies' => $totalCached,
                'total_in_leads' => $totalInLeads,
                'total_new' => $totalNew,
            ]
        ]);
    }

    public function filters(Request $request)
    {
        $tenantId = $request->user()->tenant_id;
        $filters = $this->discoveryService->getFilters();

        $allIdx = IdxCompanyCache::all(['idx_code', 'company_name', 'website']);
        $allIdxItems = $allIdx->map(fn ($c) => [
            'idx_code' => $c->idx_code,
            'company_name' => $c->company_name,
            'website' => $c->website,
        ])->all();

        $allDuplicatesMap = $this->duplicateService->findDuplicatesForBatch($allIdxItems, $tenantId);
        $duplicateIdxCodes = array_keys(array_filter($allDuplicatesMap, fn ($d) => $d['is_duplicate']));

        $totalCached = $allIdx->count();
        $totalInLeads = count($duplicateIdxCodes);

        $filters['summary'] = [
            'total' => $totalCached,
            'in_leads' => $totalInLeads,
            'new' => $totalCached - $totalInLeads,
        ];

        return response()->json($filters);
    }

    public function import(Request $request)
    {
        $data = $request->validate([
            'companies' => 'required|array',
            'companies.*.idx_code' => 'required|string',
            'companies.*.company_name' => 'required|string',
            // other fields are optional
        ]);

        $tenantId = $request->user()->tenant_id;
        $userId = $request->user()->id;

        $results = [
            'imported' => 0,
            'skipped' => 0,
            'errors' => []
        ];

        DB::beginTransaction();
        try {
            foreach ($data['companies'] as $company) {
                // Check duplicate
                $isDuplicate = $this->duplicateService->findDuplicate(
                    $company['idx_code'],
                    $company['company_name'],
                    $company['website'] ?? null,
                    $tenantId
                );

                if ($isDuplicate) {
                    $results['skipped']++;
                    AuditService::log(
                        'import_skipped_duplicate',
                        'lead_generator_idx',
                        null, null, null, 'success',
                        ['idx_code' => $company['idx_code'], 'company_name' => $company['company_name']],
                        $userId
                    );
                    continue;
                }

                $lead = $this->mappingService->mapAndCreate($company, $tenantId, $userId);
                $results['imported']++;
                
                AuditService::log(
                    'import_success',
                    'lead_generator_idx',
                    $lead, null, null, 'success',
                    ['idx_code' => $company['idx_code'], 'company_name' => $company['company_name']],
                    $userId
                );
            }
            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            AuditService::log(
                'import_failed',
                'lead_generator_idx',
                null, null, null, 'error',
                ['error' => $e->getMessage()],
                $userId
            );
            return response()->json(['message' => 'Import failed', 'error' => $e->getMessage()], 500);
        }

        return response()->json([
            'message' => 'Import completed successfully.',
            'results' => $results
        ]);
    }
}
