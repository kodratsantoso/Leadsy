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

        // If cache is empty, try to populate it once
        if (IdxCompanyCache::count() === 0) {
            $this->cacheService->refreshCacheFromLocal();
        }

        $filters = [
            'keyword' => $request->query('keyword', ''),
            'industry' => $request->query('industry', ''),
            'sub_industry' => $request->query('sub_industry', ''),
        ];
        
        $perPage = (int) $request->query('per_page', 50);

        $paginator = $this->discoveryService->search($filters, $perPage);

        // Normalize data and check duplicates
        $tenantId = $request->user()->tenant_id;
        $items = collect($paginator->items())->map(function ($cache) use ($tenantId) {
            $normalized = $this->normalizer->normalize($cache);
            
            $isDuplicate = $this->duplicateService->findDuplicate(
                $normalized['idx_code'], 
                $normalized['company_name'], 
                $normalized['website'], 
                $tenantId
            ) !== null;
            
            $normalized['is_duplicate'] = $isDuplicate;
            return $normalized;
        });

        // Log search if there's a keyword or filter
        if ($filters['keyword'] || $filters['industry'] || $filters['sub_industry']) {
            AuditService::log(
                'search',
                'lead_generator_idx',
                null, null, null, 'success',
                ['filters' => $filters],
                $request->user()->id
            );
        }

        return response()->json([
            'data' => $items,
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ]
        ]);
    }

    public function filters()
    {
        return response()->json($this->discoveryService->getFilters());
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
