<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\IntegrationConfig;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class OpenSearchController extends Controller
{
    public function searchContacts(Request $request)
    {
        $query = $request->query('q', '');
        $format = $request->query('format', '');
        $count = (int) $request->query('count', 10);
        $startIndex = (int) $request->query('startIndex', 1);

        // Normalize pagination
        $count = max(1, min(10, $count)); // Google Custom Search max results per page is 10
        $startIndex = max(1, $startIndex);

        // Resolve Accept Header if format not specified
        if (empty($format)) {
            $accept = $request->header('Accept', '');
            if (str_contains($accept, 'application/rss+xml')) {
                $format = 'rss';
            } elseif (str_contains($accept, 'application/atom+xml')) {
                $format = 'atom';
            } elseif (str_contains($accept, 'application/json')) {
                $format = 'json';
            } else {
                $format = 'rss'; // Default to RSS as standard OpenSearch format
            }
        }

        // Get Google Custom Search Configs
        $apiKey = $this->resolveConfigValue([
            'GOOGLE_SEARCH_API_KEY',
            'GOOGLE_CUSTOM_SEARCH_API_KEY',
            'GOOGLE_MAPS_BROWSER_API_KEY',
        ]);
        $searchEngineId = $this->resolveConfigValue([
            'GOOGLE_SEARCH_ENGINE_ID',
            'GOOGLE_CUSTOM_SEARCH_ENGINE_ID',
            'GOOGLE_CSE_ID',
        ]);

        if (empty($query)) {
            return $this->errorResponse('Search terms ("q") are required.', $format, 400);
        }

        if (! $apiKey || ! $searchEngineId) {
            return $this->errorResponse('Google Custom Search API Key or Search Engine ID is not configured.', $format, 503);
        }

        try {
            $response = Http::timeout(20)->get('https://customsearch.googleapis.com/customsearch/v1', array_filter([
                'key' => $apiKey,
                'cx' => $searchEngineId,
                'q' => $query,
                'num' => $count,
                'start' => $startIndex,
            ]));

            if (! $response->successful()) {
                $errorMsg = $response->json('error.message') ?: 'Google Custom Search API failed.';

                return $this->errorResponse($errorMsg, $format, 502);
            }

            $results = $response->json();
            $items = $results['items'] ?? [];
            $totalResults = (int) ($results['searchInformation']['totalResults'] ?? 0);

            // Parse and structure candidates
            $candidates = [];
            foreach ($items as $item) {
                $candidates[] = [
                    'title' => $item['title'] ?? 'No Title',
                    'link' => $item['link'] ?? '',
                    'description' => $item['snippet'] ?? '',
                ];
            }

            if ($format === 'json') {
                return response()->json([
                    'totalResults' => $totalResults,
                    'startIndex' => $startIndex,
                    'itemsPerPage' => count($candidates),
                    'query' => $query,
                    'items' => $candidates,
                ]);
            }

            if ($format === 'atom') {
                return $this->renderAtom($query, $candidates, $totalResults, $startIndex, $count);
            }

            // Default to RSS
            return $this->renderRss($query, $candidates, $totalResults, $startIndex, $count);

        } catch (\Throwable $e) {
            return $this->errorResponse('Search execution error: '.$e->getMessage(), $format, 500);
        }
    }

    private function renderRss(string $query, array $candidates, int $totalResults, int $startIndex, int $count)
    {
        $xml = '<?xml version="1.0" encoding="UTF-8"?>'."\n";
        $xml .= '<rss version="2.0" xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">'."\n";
        $xml .= '  <channel>'."\n";
        $xml .= '    <title>Leadsy Contact Search: '.htmlspecialchars($query).'</title>'."\n";
        $xml .= '    <link>'.htmlspecialchars(url()->current().'?q='.urlencode($query)).'</link>'."\n";
        $xml .= '    <description>Search results for public LinkedIn contact candidates for \''.htmlspecialchars($query).'\'</description>'."\n";
        $xml .= '    <opensearch:totalResults>'.$totalResults.'</opensearch:totalResults>'."\n";
        $xml .= '    <opensearch:startIndex>'.$startIndex.'</opensearch:startIndex>'."\n";
        $xml .= '    <opensearch:itemsPerPage>'.count($candidates).'</opensearch:itemsPerPage>'."\n";

        foreach ($candidates as $item) {
            $xml .= '    <item>'."\n";
            $xml .= '      <title>'.htmlspecialchars($item['title']).'</title>'."\n";
            $xml .= '      <link>'.htmlspecialchars($item['link']).'</link>'."\n";
            $xml .= '      <description>'.htmlspecialchars($item['description']).'</description>'."\n";
            $xml .= '    </item>'."\n";
        }

        $xml .= '  </channel>'."\n";
        $xml .= '</rss>'."\n";

        return response($xml, 200)->header('Content-Type', 'application/rss+xml; charset=UTF-8');
    }

    private function renderAtom(string $query, array $candidates, int $totalResults, int $startIndex, int $count)
    {
        $selfUrl = htmlspecialchars(url()->current().'?q='.urlencode($query));
        $xml = '<?xml version="1.0" encoding="UTF-8"?>'."\n";
        $xml .= '<feed xmlns="http://www.w3.org/2005/Atom" xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/">'."\n";
        $xml .= '  <title>Leadsy Contact Search: '.htmlspecialchars($query).'</title>'."\n";
        $xml .= '  <link href="'.$selfUrl.'" rel="self" />'."\n";
        $xml .= '  <id>urn:uuid:'.md5($selfUrl).'</id>'."\n";
        $xml .= '  <updated>'.now()->toAtomString().'</updated>'."\n";
        $xml .= '  <opensearch:totalResults>'.$totalResults.'</opensearch:totalResults>'."\n";
        $xml .= '  <opensearch:startIndex>'.$startIndex.'</opensearch:startIndex>'."\n";
        $xml .= '  <opensearch:itemsPerPage>'.count($candidates).'</opensearch:itemsPerPage>'."\n";

        foreach ($candidates as $item) {
            $xml .= '  <entry>'."\n";
            $xml .= '    <title>'.htmlspecialchars($item['title']).'</title>'."\n";
            $xml .= '    <link href="'.htmlspecialchars($item['link']).'" />'."\n";
            $xml .= '    <id>'.htmlspecialchars($item['link']).'</id>'."\n";
            $xml .= '    <content type="text">'.htmlspecialchars($item['description']).'</content>'."\n";
            $xml .= '  </entry>'."\n";
        }

        $xml .= '</feed>'."\n";

        return response($xml, 200)->header('Content-Type', 'application/atom+xml; charset=UTF-8');
    }

    private function errorResponse(string $message, string $format, int $statusCode)
    {
        if ($format === 'json') {
            return response()->json(['error' => $message], $statusCode);
        }

        $xml = '<?xml version="1.0" encoding="UTF-8"?>'."\n";
        $xml .= '<error>'."\n";
        $xml .= '  <code>'.$statusCode.'</code>'."\n";
        $xml .= '  <message>'.htmlspecialchars($message).'</message>'."\n";
        $xml .= '</error>'."\n";

        $contentType = ($format === 'atom') ? 'application/atom+xml' : 'application/rss+xml';

        return response($xml, $statusCode)->header('Content-Type', $contentType.'; charset=UTF-8');
    }

    private function resolveConfigValue(array $keys): ?string
    {
        foreach ($keys as $key) {
            $value = env($key);
            if (is_string($value) && trim($value) !== '') {
                return trim($value);
            }

            $record = IntegrationConfig::query()
                ->where('key', $key)
                ->where('is_active', true)
                ->whereNull('tenant_id')
                ->latest()
                ->first();

            if (is_string($record?->value) && trim($record->value) !== '') {
                return trim($record->value);
            }
        }

        return null;
    }
}
