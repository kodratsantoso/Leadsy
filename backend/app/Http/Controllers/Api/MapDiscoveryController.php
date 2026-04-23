<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Services\DeduplicationService;
use App\Services\Lead\LeadDiscoveryService;
use App\Services\Maps\MapSearchHistoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MapDiscoveryController extends Controller
{
    public function __construct(
        private readonly LeadDiscoveryService $discovery,
        private readonly DeduplicationService $dedup,
        private readonly MapSearchHistoryService $history,
    ) {}

    /**
     * GET /api/maps/geocode
     * Resolve an area string into lat/lng, bounds, and place_id.
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
     * GET /api/maps/search
     * Perform a Text Search or Nearby Search.
     */
    public function search(Request $request): JsonResponse
    {
        $data = $request->validate([
            'lat'         => 'required|numeric',
            'lng'         => 'required|numeric',
            'radius'      => 'required|integer|min:100|max:50000',
            'keyword'     => 'nullable|string|max:255',
            'category'    => 'nullable|string|max:255',
            'search_mode' => 'nullable|in:nearby,text',
            'area_name'   => 'nullable|string',
            'area_place_id'=> 'nullable|string',
        ]);

        $mode = $data['search_mode'] ?? 'nearby';
        
        $searchTerm = trim(($data['keyword'] ?? '') . ' ' . ($data['category'] ?? ''));

        if ($mode === 'text' && !empty($searchTerm)) {
            $results = $this->discovery->textSearch(
                $searchTerm,
                $data['lat'],
                $data['lng'],
                $data['radius']
            );
        } else {
            $results = $this->discovery->discoverNearby(
                $data['lat'],
                $data['lng'],
                $data['radius'],
                $searchTerm,
                'establishment'
            );
        }
        
        // Log the search
        $this->history->logSearch([
            'area_name'     => $data['area_name'] ?? null,
            'area_place_id' => $data['area_place_id'] ?? null,
            'area_lat'      => $data['lat'],
            'area_lng'      => $data['lng'],
            'keyword'       => $data['keyword'] ?? null,
            'category'      => $data['category'] ?? null,
            'search_mode'   => $mode,
            'radius_meters' => $data['radius'],
            'result_count'  => count($results['results'] ?? []),
        ], $request->user()?->id);

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

    /**
     * GET /api/maps/place-details/{placeId}
     * Get detailed information for a specific place (phone, hours, website).
     */
    public function placeDetails(string $placeId): JsonResponse
    {
        $details = $this->discovery->getPlaceDetails($placeId);
        
        if (!$details) {
            return response()->json(['error' => 'Place details not found'], 404);
        }

        // Run dedup check on enriched data
        $dedupResult = $this->dedup->check($details);
        $details['dedup'] = $dedupResult->toArray();

        return response()->json(['data' => $details]);
    }

    /**
     * POST /api/maps/add-to-leads
     * Add a single discovered map candidate to the active leads pipeline.
     */
    public function addToLeads(Request $request): JsonResponse
    {
        $data = $request->validate([
            'external_place_id' => 'required|string',
            'company_name'      => 'required|string|max:255',
            'address'           => 'nullable|string',
            'lat'               => 'nullable|numeric',
            'lng'               => 'nullable|numeric',
            'phone'             => 'nullable|string',
            'website'           => 'nullable|url',
            'business_category' => 'nullable|string',
            'ai_mode'           => 'nullable|in:full_ai,hybrid,manual',
            'ai_reference_id'   => 'nullable|integer',
        ]);

        if (!empty($data['website'])) {
            $data['website_domain'] = parse_url($data['website'], PHP_URL_HOST);
        }

        // Hard synchronous dedup to prevent re-inserts
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

        // Create a LeadSource entry explicitly for Google Maps record
        $lead->sources()->create([
            'source_type' => 'google_maps',
            'source_ref'  => $data['external_place_id'],
            'confidence'  => 'high',
        ]);

        return response()->json([
            'data'      => $lead,
            'duplicate' => $dedupResult->toArray(),
        ], 201);
    }
    
    /**
     * POST /api/maps/bulk-add-to-leads
     * Placeholder wrapper around LeadController's bulk logic, but localized to maps logic.
     */
    public function bulkAddToLeads(Request $request): JsonResponse
    {
        return app(LeadController::class)->bulkImport($request);
    }

    /**
     * GET /api/maps/search-history
     * Get recent map searches for the current user.
     */
    public function searchHistory(Request $request): JsonResponse
    {
        $history = \App\Models\MapSearchHistory::where('created_by', $request->user()?->id)
            ->latest()
            ->limit(20)
            ->get();
            
        return response()->json(['data' => $history]);
    }
}
