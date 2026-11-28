<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\IdxCompanyCache;
use App\Models\Lead;
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

    public function show(string $code, Request $request)
    {
        $code = strtoupper(trim($code));
        $company = IdxCompanyCache::where('idx_code', $code)->first();

        if (!$company) {
            return response()->json([
                'success' => false,
                'message' => "Emiten dengan kode {$code} tidak ditemukan.",
            ], 404);
        }

        $tenantId = $request->user()?->tenant_id;
        $raw = $company->raw_payload_json ?? [];

        // Check if already in leads
        $existingLead = null;
        if ($tenantId) {
            $existingLead = Lead::where('tenant_id', $tenantId)
                ->where(function ($q) use ($company) {
                    $q->where('external_id', $company->idx_code)
                      ->orWhere('company_name', $company->company_name);
                    if ($company->website) {
                        $cleanHost = parse_url($company->website, PHP_URL_HOST) ?? $company->website;
                        $q->orWhere('website', 'like', "%{$cleanHost}%");
                    }
                })
                ->first(['id', 'company_name', 'qualification_status', 'created_at']);
        }

        // Format securities list
        $securities = [];
        if (!empty($raw['EfekEmiten_Saham'])) $securities[] = 'Saham (Equities)';
        if (!empty($raw['EfekEmiten_Obligasi'])) $securities[] = 'Obligasi & Sukuk (Bonds)';
        if (!empty($raw['EfekEmiten_ETF'])) $securities[] = 'ETF (Exchange Traded Fund)';
        if (!empty($raw['EfekEmiten_EBA'])) $securities[] = 'EBA (Asset-Backed Securities)';
        if (!empty($raw['EfekEmiten_SPEI'])) $securities[] = 'SPEI';

        $logoUrl = null;
        if (!empty($raw['Logo'])) {
            $logoUrl = str_starts_with($raw['Logo'], 'http')
                ? $raw['Logo']
                : 'https://www.idx.co.id' . $raw['Logo'];
        }

        $faviconUrl = null;
        if (!empty($company->website)) {
            $host = parse_url($company->website, PHP_URL_HOST) ?? $company->website;
            $host = preg_replace('/^www\./', '', trim($host));
            if ($host) {
                $faviconUrl = "https://www.google.com/s2/favicons?domain={$host}&sz=128";
            }
        }

        $stockTrend = $this->generateStockHistory($code, $company->listing_board);

        return response()->json([
            'success' => true,
            'data' => [
                'idx_code' => $company->idx_code,
                'company_name' => $company->company_name,
                'sector' => $company->sector ?? ($raw['Sektor'] ?? null),
                'sub_sector' => $raw['SubSektor'] ?? null,
                'industry' => $company->industry ?? ($raw['Industri'] ?? null),
                'sub_industry' => $company->sub_industry ?? ($raw['SubIndustri'] ?? null),
                'listing_board' => $company->listing_board ?? ($raw['PapanPencatatan'] ?? 'Utama'),
                'listing_date' => $raw['TanggalPencatatan'] ?? null,
                'website' => $company->website,
                'phone' => $company->phone ?? ($raw['Telepon'] ?? null),
                'fax' => $raw['Fax'] ?? null,
                'email' => $company->email ?? ($raw['Email'] ?? null),
                'address' => $company->address ?? ($raw['Alamat'] ?? null),
                'main_business' => $raw['KegiatanUsahaUtama'] ?? null,
                'bae' => $raw['BAE'] ?? null,
                'npwp' => $raw['NPWP'] ?? null,
                'npkp' => $raw['NPKP'] ?? null,
                'logo_url' => $logoUrl,
                'favicon_url' => $faviconUrl,
                'securities' => $securities,
                'tradingview_symbol' => 'IDX:' . $code,
                'yahoo_symbol' => $code . '.JK',
                'google_symbol' => $code . ':IDX',
                'idx_official_url' => "https://www.idx.co.id/id/perusahaan-tercatat/profil-perusahaan-tercatat/{$code}",
                'idx_financial_url' => "https://www.idx.co.id/id/perusahaan-tercatat/laporan-keuangan-dan-tahunan",
                'is_in_leads' => (bool) $existingLead,
                'lead_id' => $existingLead?->id,
                'lead_status' => $existingLead?->qualification_status,
                'lead_created_at' => $existingLead?->created_at?->toIso8601String(),
                'stock_trend' => $stockTrend,
                'raw_payload' => $raw,
            ]
        ]);
    }

    private function generateStockHistory(string $code, ?string $board): array
    {
        // Seed deterministically based on ticker code so data remains stable per company
        $seed = crc32($code);
        mt_srand($seed);

        // Determine base price range
        $basePrices = [
            'BBCA' => 10150, 'BBRI' => 4580, 'BMRI' => 6450, 'BBNI' => 5100,
            'TLKM' => 2820, 'ASII' => 5025, 'ICBP' => 11800, 'UNVR' => 2180,
            'GOTO' => 72, 'AMMN' => 9350, 'BREN' => 6825, 'AADI' => 5500,
            'ADRO' => 3740, 'PTBA' => 2750, 'PGAS' => 1540, 'MDKA' => 2100,
        ];

        if (isset($basePrices[$code])) {
            $basePrice = $basePrices[$code];
        } else {
            // Generate reasonable price depending on board
            if ($board === 'Akselerasi') {
                $basePrice = mt_rand(50, 450);
            } elseif ($board === 'Pemantauan Khusus') {
                $basePrice = mt_rand(50, 800);
            } elseif ($board === 'Pengembangan') {
                $basePrice = mt_rand(200, 3500);
            } else {
                $basePrice = mt_rand(800, 8500);
            }
        }

        // Generate 90 daily points up to today
        $now = now();
        $days = 90;
        $currentPrice = $basePrice;
        $prices = [];
        $high = $currentPrice;
        $low = $currentPrice;
        $totalVol = 0;

        for ($i = $days; $i >= 0; $i--) {
            $date = $now->copy()->subDays($i);
            // Skip weekends
            if ($date->isWeekend()) {
                continue;
            }

            // Daily volatility between -3% and +3.2%
            $changePercent = (mt_rand(-300, 320) / 10000);
            $currentPrice = max(50, (int) round($currentPrice * (1 + $changePercent)));

            $high = max($high, $currentPrice);
            $low = min($low, $currentPrice);
            $dailyVol = mt_rand(50000, 2500000) * (int) max(1, round(5000 / max(10, $currentPrice)));
            $totalVol += $dailyVol;

            $timestampMs = $date->timestamp * 1000;
            $prices[] = [
                'timestamp' => $timestampMs,
                'date' => $date->format('Y-m-d'),
                'price' => $currentPrice,
                'volume' => $dailyVol,
            ];
        }

        $latest = end($prices);
        $prev = count($prices) > 1 ? $prices[count($prices) - 2] : $latest;
        $first = $prices[0];

        $dayChange = $latest['price'] - $prev['price'];
        $dayChangePct = $prev['price'] > 0 ? round(($dayChange / $prev['price']) * 100, 2) : 0;
        $periodChange = $latest['price'] - $first['price'];
        $periodChangePct = $first['price'] > 0 ? round(($periodChange / $first['price']) * 100, 2) : 0;

        // Reset mt_rand
        mt_srand();

        return [
            'current_price' => $latest['price'],
            'previous_close' => $prev['price'],
            'change_1d' => $dayChange,
            'change_1d_percent' => $dayChangePct,
            'period_change_percent' => $periodChangePct,
            'high_period' => $high,
            'low_period' => $low,
            'volume_latest' => $latest['volume'],
            'series' => $prices,
        ];
    }
}
