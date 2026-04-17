<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use App\Models\IntegrationConfig;
use App\Models\MapCandidate;
use Carbon\Carbon;

/**
 * Lead Discovery Service — BRD §3.3
 *
 * Uses Google Places API to discover businesses in a given territory.
 * Returns normalised company records ready for deduplication & scoring.
 */
class LeadDiscoveryService
{
    private string $apiKey;

    public function __construct()
    {
        $dbConfig = IntegrationConfig::where('key', 'GOOGLE_MAPS_BROWSER_API_KEY')->where('is_active', true)->first();
        $this->apiKey = $dbConfig ? $dbConfig->value : config('services.google.places_api_key', env('GOOGLE_MAPS_BROWSER_API_KEY', ''));
    }

    /**
     * Resolve area string into precise lat/lng and bounds.
     * Tries Geocoding API first; falls back to Places "Find Place" if Geocoding is not enabled.
     */
    public function geocodeArea(string $query): ?array
    {
        if (empty($this->apiKey)) return null;

        // ── Attempt 1: Geocoding API ──
        try {
            $response = Http::get('https://maps.googleapis.com/maps/api/geocode/json', [
                'address' => $query,
                'key'     => $this->apiKey,
            ]);
            $data = $response->json();

            if (($data['status'] ?? '') === 'OK' && !empty($data['results'])) {
                $first = $data['results'][0];
                return [
                    'place_id'          => $first['place_id'],
                    'formatted_address' => $first['formatted_address'],
                    'lat'               => $first['geometry']['location']['lat'] ?? null,
                    'lng'               => $first['geometry']['location']['lng'] ?? null,
                    'viewport'          => $first['geometry']['viewport'] ?? null,
                ];
            }

            // If Geocoding API is not activated, try fallback
            if (($data['status'] ?? '') !== 'REQUEST_DENIED') {
                return null; // Genuine "no results" — don't fall through
            }

            Log::info('[LeadDiscovery] Geocoding API not enabled, falling back to Places Text Search');
        } catch (\Throwable $e) {
            Log::warning('[LeadDiscovery] Geocode primary error', ['msg' => $e->getMessage()]);
        }

        // ── Attempt 2: Places Text Search fallback ──
        try {
            $response = Http::get('https://maps.googleapis.com/maps/api/place/textsearch/json', [
                'query' => $query,
                'key'   => $this->apiKey,
            ]);
            $data = $response->json();

            if (($data['status'] ?? '') === 'OK' && !empty($data['results'])) {
                $first = $data['results'][0];
                return [
                    'place_id'          => $first['place_id'] ?? null,
                    'formatted_address' => $first['formatted_address'] ?? $first['name'] ?? $query,
                    'lat'               => $first['geometry']['location']['lat'] ?? null,
                    'lng'               => $first['geometry']['location']['lng'] ?? null,
                    'viewport'          => $first['geometry']['viewport'] ?? null,
                ];
            }
        } catch (\Throwable $e) {
            Log::error('[LeadDiscovery] Geocode fallback error', ['msg' => $e->getMessage()]);
        }

        return null;
    }

    /**
     * Search using Places Text Search (New API format preferred, but using legacy Text Search for broad compat if needed).
     */
    public function textSearch(
        string $query,
        float $lat,
        float $lng,
        int $radiusM = 3000
    ): array {
        if (empty($this->apiKey)) {
            return ['results' => [], 'error' => 'Google API key not configured'];
        }

        try {
            $response = Http::get('https://maps.googleapis.com/maps/api/place/textsearch/json', [
                'query'    => $query,
                'location' => "{$lat},{$lng}",
                'radius'   => min($radiusM, 50000),
                'key'      => $this->apiKey,
            ]);

            $data = $response->json();

            if ($data['status'] !== 'OK' && $data['status'] !== 'ZERO_RESULTS') {
                return ['results' => [], 'error' => $data['status']];
            }

            $results = collect($data['results'] ?? [])->map(fn ($place) => $this->normalise($place))->toArray();
            $this->cacheCandidates($results);

            return [
                'results'         => $results,
                'next_page_token' => $data['next_page_token'] ?? null,
            ];
        } catch (\Throwable $e) {
            Log::error('[LeadDiscovery] Exception', ['msg' => $e->getMessage()]);
            return ['results' => [], 'error' => $e->getMessage()];
        }
    }
    
    /**
     * Search wrapper that checks cache to limit API calls (future enhancement, for now saves direct to cache).
     */
    private function cacheCandidates(array $normalisedResults): void
    {
        foreach ($normalisedResults as $res) {
            if (empty($res['external_place_id'])) continue;
            
            try {
                MapCandidate::updateOrCreate(
                    ['place_id' => $res['external_place_id']],
                    [
                        'name' => $res['company_name'],
                        'address' => $res['address'],
                        'phone' => $res['phone'] ?? null,
                        'lat' => $res['lat'],
                        'lng' => $res['lng'],
                        'category' => $res['business_category'],
                        'rating' => $res['rating'] ?? null,
                        'maps_url' => $res['google_maps_url'] ?? null,
                        'raw_payload' => $res,
                        'fetched_at' => Carbon::now(),
                    ]
                );
            } catch (\Throwable $e) {
                // Ignore cache write errors
            }
        }
    }

    /**
     * Search for businesses near a given point within a radius.
     *
     * @param  float   $lat        Center latitude
     * @param  float   $lng        Center longitude
     * @param  int     $radiusM    Radius in metres (max 50000)
     * @param  string  $keyword    Business type / keyword to search
     * @param  string  $type       Google Places type (eg. 'establishment')
     * @return array{results: array, next_page_token: string|null}
     */
    public function discoverNearby(
        float $lat,
        float $lng,
        int $radiusM = 3000,
        string $keyword = '',
        string $type = 'establishment',
    ): array {
        if (empty($this->apiKey)) {
            return ['results' => [], 'next_page_token' => null, 'error' => 'Google API key not configured'];
        }

        try {
            $response = Http::get('https://maps.googleapis.com/maps/api/place/nearbysearch/json', [
                'location' => "{$lat},{$lng}",
                'radius'   => min($radiusM, 50000),
                'keyword'  => $keyword,
                'type'     => $type,
                'key'      => $this->apiKey,
            ]);

            $data = $response->json();

            if ($data['status'] !== 'OK' && $data['status'] !== 'ZERO_RESULTS') {
                Log::error('[LeadDiscovery] Google Places API error', ['status' => $data['status']]);
                return ['results' => [], 'next_page_token' => null, 'error' => $data['status']];
            }

            $results = collect($data['results'] ?? [])->map(fn ($place) => $this->normalise($place))->toArray();
            
            $this->cacheCandidates($results);

            return [
                'results'         => $results,
                'next_page_token' => $data['next_page_token'] ?? null,
            ];
        } catch (\Throwable $e) {
            Log::error('[LeadDiscovery] Exception', ['msg' => $e->getMessage()]);
            return ['results' => [], 'next_page_token' => null, 'error' => $e->getMessage()];
        }
    }

    /**
     * Fetch the next page of results.
     */
    public function fetchNextPage(string $pageToken): array
    {
        try {
            $response = Http::get('https://maps.googleapis.com/maps/api/place/nearbysearch/json', [
                'pagetoken' => $pageToken,
                'key'       => $this->apiKey,
            ]);

            $data = $response->json();
            $results = collect($data['results'] ?? [])->map(fn ($p) => $this->normalise($p))->toArray();
            
            $this->cacheCandidates($results);

            return [
                'results'         => $results,
                'next_page_token' => $data['next_page_token'] ?? null,
            ];
        } catch (\Throwable $e) {
            return ['results' => [], 'next_page_token' => null, 'error' => $e->getMessage()];
        }
    }

    /**
     * Get detailed information for a specific place.
     */
    public function getPlaceDetails(string $placeId): ?array
    {
        try {
            // First check if we have a recently cached enriched candidate
            $candidate = MapCandidate::where('place_id', $placeId)
                ->where('last_enriched_at', '>=', Carbon::now()->subDays(30))
                ->first();

            if ($candidate) {
                return $candidate->raw_payload; // already normalised
            }

            $response = Http::get('https://maps.googleapis.com/maps/api/place/details/json', [
                'place_id' => $placeId,
                'fields'   => 'name,formatted_address,geometry,formatted_phone_number,international_phone_number,website,opening_hours,types,business_status,url,rating,user_ratings_total',
                'key'      => $this->apiKey,
            ]);

            $data = $response->json();
            if ($data['status'] !== 'OK') {
                return null;
            }

            $detail = $this->normaliseDetail($data['result']);
            
            // Upsert with enriched fields
            MapCandidate::updateOrCreate(
                ['place_id' => $placeId],
                [
                    'name' => $detail['company_name'],
                    'address' => $detail['address'],
                    'phone' => $detail['phone'] ?? null,
                    'website' => $detail['website'] ?? null,
                    'opening_hours_json' => $data['result']['opening_hours'] ?? null,
                    'lat' => $detail['lat'],
                    'lng' => $detail['lng'],
                    'category' => $detail['business_category'],
                    'rating' => $data['result']['rating'] ?? null,
                    'user_ratings_total' => $data['result']['user_ratings_total'] ?? null,
                    'maps_url' => $detail['google_maps_url'] ?? null,
                    'raw_payload' => $detail,
                    'last_enriched_at' => Carbon::now(),
                ]
            );

            return $detail;
        } catch (\Throwable $e) {
            Log::error('[LeadDiscovery] Place detail error', ['msg' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Normalise a nearby search result into a lead-compatible record.
     */
    private function normalise(array $place): array
    {
        $loc = $place['geometry']['location'] ?? [];

        return [
            'external_place_id' => $place['place_id'] ?? null,
            'company_name'      => $place['name'] ?? 'Unknown',
            'address'           => $place['vicinity'] ?? ($place['formatted_address'] ?? ''),
            'lat'               => $loc['lat'] ?? null,
            'lng'               => $loc['lng'] ?? null,
            'business_category' => implode(', ', array_slice($place['types'] ?? [], 0, 3)),
            'operating_hours'   => isset($place['opening_hours']['open_now'])
                ? ($place['opening_hours']['open_now'] ? 'Open now' : 'Closed')
                : null,
            'rating'            => $place['rating'] ?? null,
            'user_ratings_total' => $place['user_ratings_total'] ?? null,
        ];
    }

    /**
     * Normalise a place detail response.
     */
    private function normaliseDetail(array $place): array
    {
        $loc = $place['geometry']['location'] ?? [];

        return [
            'external_place_id' => $place['place_id'] ?? null,
            'company_name'      => $place['name'] ?? 'Unknown',
            'address'           => $place['formatted_address'] ?? '',
            'lat'               => $loc['lat'] ?? null,
            'lng'               => $loc['lng'] ?? null,
            'phone'             => $place['international_phone_number'] ?? ($place['formatted_phone_number'] ?? null),
            'website'           => $place['website'] ?? null,
            'website_domain'    => isset($place['website']) ? parse_url($place['website'], PHP_URL_HOST) : null,
            'business_category' => implode(', ', array_slice($place['types'] ?? [], 0, 3)),
            'operating_hours'   => isset($place['opening_hours']['weekday_text'])
                ? implode('; ', $place['opening_hours']['weekday_text'])
                : null,
            'google_maps_url'   => $place['url'] ?? null,
        ];
    }
}
