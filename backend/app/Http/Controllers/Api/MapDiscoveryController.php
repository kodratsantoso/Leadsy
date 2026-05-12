<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AiProvider;
use App\Models\DiscoveryCategory;
use App\Models\GeoProductFitAnalysis;
use App\Models\Lead;
use App\Models\LeadProductMatch;
use App\Models\Product;
use App\Services\AuditService;
use App\Services\DeduplicationService;
use App\Services\Lead\LeadDiscoveryService;
use App\Services\Maps\GeoProductFitService;
use App\Services\Maps\MapSearchHistoryService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MapDiscoveryController extends Controller
{
    public function __construct(
        private readonly LeadDiscoveryService $discovery,
        private readonly DeduplicationService $dedup,
        private readonly MapSearchHistoryService $history,
        private readonly GeoProductFitService $fitService,
    ) {}

    /**
     * GET /api/maps/geocode
     */
    public function geocode(Request $request): JsonResponse
    {
        $data = $request->validate([
            'query' => 'required|string|max:255',
        ]);

        $result = $this->discovery->geocodeArea($data['query']);

        if (!$result) {
            return response()->json(['error' => 'Geocoding failed or returned no results'], 404);
        }

        return response()->json(['data' => $result]);
    }

    /**
     * GET /api/maps/categories
     */
    public function categories(): JsonResponse
    {
        $categories = DiscoveryCategory::where('is_active', true)
            ->orderBy('sort_order')
            ->get(['id', 'label', 'value']);

        return response()->json(['data' => $categories]);
    }

    /**
     * GET /api/maps/search
     */
    public function search(Request $request): JsonResponse
    {
        $data = $request->validate([
            'lat'           => 'required|numeric',
            'lng'           => 'required|numeric',
            'radius'        => 'required|integer|min:100|max:50000',
            'keyword'       => 'nullable|string|max:255',
            'category'      => 'nullable|string|max:255',
            'search_mode'   => 'nullable|in:nearby,text',
            'area_name'     => 'nullable|string',
            'area_place_id' => 'nullable|string',
            'limit'         => 'nullable|integer|min:1|max:50',
        ]);

        $mode  = $data['search_mode'] ?? 'nearby';
        $limit = (int) ($data['limit'] ?? 20);

        $searchTerm = trim(($data['keyword'] ?? '') . ' ' . ($data['category'] ?? ''));

        if ($mode === 'text' && !empty($searchTerm)) {
            $page1 = $this->discovery->textSearch(
                $searchTerm, $data['lat'], $data['lng'], $data['radius']
            );
        } else {
            $page1 = $this->discovery->discoverNearby(
                $data['lat'], $data['lng'], $data['radius'], $searchTerm, 'establishment'
            );
        }

        $allResults    = $page1['results'] ?? [];
        $nextPageToken = $page1['next_page_token'] ?? null;

        if ($limit > 20 && $nextPageToken && count($allResults) < $limit) {
            sleep(2);
            $page2      = $this->discovery->fetchNextPage($nextPageToken);
            $allResults = array_merge($allResults, $page2['results'] ?? []);
            $nextPageToken = $page2['next_page_token'] ?? null;
        }

        if ($limit > 40 && $nextPageToken && count($allResults) < $limit) {
            sleep(2);
            $page3      = $this->discovery->fetchNextPage($nextPageToken);
            $allResults = array_merge($allResults, $page3['results'] ?? []);
            $nextPageToken = $page3['next_page_token'] ?? null;
        }

        $allResults = array_slice($allResults, 0, $limit);

        $this->history->logSearch([
            'area_name'     => $data['area_name'] ?? null,
            'area_place_id' => $data['area_place_id'] ?? null,
            'area_lat'      => $data['lat'],
            'area_lng'      => $data['lng'],
            'keyword'       => $data['keyword'] ?? null,
            'category'      => $data['category'] ?? null,
            'search_mode'   => $mode,
            'radius_meters' => $data['radius'],
            'result_count'  => count($allResults),
        ], $request->user()?->id);

        $enrichedResults = collect($allResults)->map(function ($place) {
            $dedupResult = $this->dedup->check($place);
            $place['dedup'] = $dedupResult->toArray();
            return $place;
        });

        return response()->json([
            'data'            => $enrichedResults,
            'total'           => count($enrichedResults),
            'next_page_token' => $nextPageToken,
            'error'           => $page1['error'] ?? null,
        ]);
    }

    /**
     * GET /api/maps/place-details/{placeId}
     */
    public function placeDetails(string $placeId): JsonResponse
    {
        $details = $this->discovery->getPlaceDetails($placeId);

        if (!$details) {
            return response()->json(['error' => 'Place details not found'], 404);
        }

        $dedupResult = $this->dedup->check($details);
        $details['dedup'] = $dedupResult->toArray();

        return response()->json(['data' => $details]);
    }

    /**
     * POST /api/maps/geo-product-fit/analyze
     * Analyze one or more discovered places against a product.
     *
     * Body:
     *   product_id  — required
     *   places      — array of place payloads (from /maps/search)
     *   ai_limit    — optional, max AI analyses this run (default 10, max 15)
     */
    public function analyzeProductFit(Request $request): JsonResponse
    {
        $data = $request->validate([
            'product_id'     => 'required|integer|exists:products,id',
            'places'         => 'required|array|min:1|max:50',
            'places.*.external_place_id' => 'required|string',
            'places.*.company_name'      => 'nullable|string',
            'places.*.address'           => 'nullable|string',
            'places.*.business_category' => 'nullable|string',
            'places.*.phone'             => 'nullable|string',
            'places.*.website'           => 'nullable|string',
            'places.*.rating'            => 'nullable|numeric',
            'ai_limit'       => 'nullable|integer|min:1|max:15',
        ]);

        $product = Product::findOrFail($data['product_id']);
        $userId  = $request->user()?->id ?? 0;
        $aiLimit = (int) ($data['ai_limit'] ?? 10);

        $analyses = $this->fitService->batchAnalyze($data['places'], $product, $userId, $aiLimit);

        AuditService::log(
            'geo_product_fit_analysis_run',
            'maps',
            $product,
            null,
            null,
            'success',
            ['places_count' => count($data['places']), 'ai_limit' => $aiLimit]
        );

        return response()->json([
            'data'    => $analyses,
            'product' => ['id' => $product->id, 'name' => $product->name],
            'total'   => count($analyses),
        ]);
    }

    /**
     * GET /api/maps/geo-product-fit/results
     * Retrieve cached analyses for given place_ids + product_id.
     *
     * Query:
     *   product_id  — required
     *   place_ids[] — array of place IDs
     */
    public function productFitResults(Request $request): JsonResponse
    {
        $data = $request->validate([
            'product_id' => 'required|integer|exists:products,id',
            'place_ids'  => 'required|array|min:1',
            'place_ids.*'=> 'required|string',
        ]);

        $cached = $this->fitService->getCachedResults($data['place_ids'], (int) $data['product_id']);

        return response()->json([
            'data'  => array_values($cached),
            'total' => count($cached),
        ]);
    }

    /**
     * POST /api/maps/add-to-leads
     * Add a discovered map candidate to the leads pipeline.
     * Optionally carries product-fit context to bootstrap a LeadProductMatch.
     */
    public function addToLeads(Request $request): JsonResponse
    {
        $data = $request->validate([
            'external_place_id'  => 'required|string',
            'company_name'       => 'required|string|max:255',
            'address'            => 'nullable|string',
            'lat'                => 'nullable|numeric',
            'lng'                => 'nullable|numeric',
            'phone'              => 'nullable|string',
            'website'            => 'nullable|url',
            'business_category'  => 'nullable|string',
            'ai_mode'            => 'nullable|in:full_ai,hybrid,manual',
            'ai_reference_id'    => 'nullable|integer',
            // Product-fit context (optional)
            'product_id'         => 'nullable|integer|exists:products,id',
            'fit_analysis_id'    => 'nullable|integer|exists:geo_product_fit_analyses,id',
        ]);

        if (!empty($data['website'])) {
            $data['website_domain'] = parse_url($data['website'], PHP_URL_HOST);
        }

        $aiWarning = null;
        if (in_array($data['ai_mode'] ?? 'manual', ['full_ai', 'hybrid'])) {
            $hasActiveProvider = AiProvider::where('status', 'active')->exists();
            if (!$hasActiveProvider) {
                $aiWarning = 'No active AI provider is configured. The lead will be saved but AI enrichment will not run. Configure a provider in Settings → AI Defaults.';
                $data['ai_mode'] = 'manual';
            }
        }

        $dedupResult = $this->dedup->check($data);
        if ($dedupResult->status === 'exact_duplicate') {
            return response()->json([
                'message'   => 'Exact duplicate detected',
                'duplicate' => $dedupResult->toArray(),
            ], 409);
        }

        $data['duplicate_status'] = $dedupResult->status;
        $data['duplicate_of_id']  = $dedupResult->matchedLeadId;
        $data['created_by']       = $request->user()?->id;

        $lead = Lead::create($data);

        $lead->sources()->create([
            'source_type' => 'google_maps',
            'source_ref'  => $data['external_place_id'],
            'confidence'  => 'high',
        ]);

        // If a product + fit analysis were provided, seed a LeadProductMatch
        if (!empty($data['product_id'])) {
            $fitAnalysis = !empty($data['fit_analysis_id'])
                ? GeoProductFitAnalysis::find($data['fit_analysis_id'])
                : GeoProductFitAnalysis::where('place_id', $data['external_place_id'])
                    ->where('product_id', $data['product_id'])
                    ->first();

            if ($fitAnalysis) {
                LeadProductMatch::updateOrCreate(
                    ['lead_id' => $lead->id, 'product_id' => $data['product_id']],
                    [
                        'match_score'         => $fitAnalysis->fit_score,
                        'match_reason'        => implode(' ', array_slice($fitAnalysis->reasoning ?? [], 0, 2)),
                        'reasoning'           => $fitAnalysis->reasoning,
                        'recommended_approach'=> $fitAnalysis->recommended_approach,
                        'match_level'         => $this->fitLevelToMatchLevel($fitAnalysis->fit_level),
                        'confidence_score'    => $fitAnalysis->confidence_score,
                        'ai_provider_used'    => $fitAnalysis->ai_provider_used,
                        'ai_model_used'       => $fitAnalysis->ai_model_used,
                        'is_recommended'      => $fitAnalysis->fit_score >= 60,
                        'last_matched_at'     => Carbon::now(),
                    ]
                );

                // Link the fit analysis record to this lead
                $fitAnalysis->update(['lead_id' => $lead->id]);
            }
        }

        AuditService::log(
            'map_lead_added',
            'maps',
            $lead,
            null,
            null,
            'success',
            [
                'place_id'   => $data['external_place_id'],
                'product_id' => $data['product_id'] ?? null,
                'fit_score'  => isset($fitAnalysis) ? $fitAnalysis->fit_score : null,
            ]
        );

        return response()->json([
            'data'       => $lead,
            'duplicate'  => $dedupResult->toArray(),
            'ai_warning' => $aiWarning,
        ], 201);
    }

    /**
     * POST /api/maps/bulk-add-to-leads
     */
    public function bulkAddToLeads(Request $request): JsonResponse
    {
        return app(LeadController::class)->bulkImport($request);
    }

    /**
     * GET /api/maps/search-history
     */
    public function searchHistory(Request $request): JsonResponse
    {
        $history = \App\Models\MapSearchHistory::where('created_by', $request->user()?->id)
            ->latest()
            ->limit(20)
            ->get();

        return response()->json(['data' => $history]);
    }

    private function fitLevelToMatchLevel(string $fitLevel): string
    {
        return match ($fitLevel) {
            'high'   => 'strong',
            'medium' => 'moderate',
            default  => 'weak',
        };
    }
}
