<?php

namespace App\Services\Lead;

use App\Models\Lead;
use App\Models\LeadCompanyNews;
use App\Services\AI\AiOrchestrationService;
use App\Services\Lead\SearchEngines\CustomEndpointSearchProvider;
use App\Services\Lead\SearchEngines\SerperSearchProvider;
use App\Services\Lead\SearchEngines\TavilySearchProvider;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class CompanyNewsDiscoveryService
{
    private const REPUTABLE_MEDIA = [
        'kompas.com' => 'Kompas',
        'bisnis.com' => 'Bisnis.com',
        'kontan.co.id' => 'Kontan',
        'cnbcindonesia.com' => 'CNBC Indonesia',
        'detik.com' => 'Detik Finance',
        'tempo.co' => 'Tempo',
        'katadata.co.id' => 'Katadata',
        'antaranews.com' => 'Antara News',
        'investor.id' => 'Investor Daily',
        'bloomberg.com' => 'Bloomberg',
        'reuters.com' => 'Reuters',
        'thejakartapost.com' => 'The Jakarta Post',
        'techinasia.com' => 'Tech in Asia',
        'dailysocial.id' => 'DailySocial',
        'idntimes.com' => 'IDN Times',
        'kumparan.com' => 'Kumparan',
        'swa.co.id' => 'SWA',
        'wartaekonomi.co.id' => 'Warta Ekonomi',
    ];

    public function __construct(
        private SerperSearchProvider $serper,
        private TavilySearchProvider $tavily,
        private CustomEndpointSearchProvider $customEndpoint,
        private AiOrchestrationService $ai,
    ) {}

    /**
     * Discover latest company news and business signals.
     *
     * @return array{success: bool, count: int, news: Collection, source: string, message: string}
     */
    public function discover(Lead $lead, ?int $tenantId = null): array
    {
        $tenantId = $tenantId ?: $lead->tenant_id;
        $companyName = trim($lead->company_name);

        if (empty($companyName)) {
            return [
                'success' => false,
                'count' => 0,
                'news' => collect([]),
                'source' => 'none',
                'message' => 'Company name is required for news discovery.',
            ];
        }

        $brandTokens = $this->extractBrandTokens($lead);
        $searchSubject = !empty($brandTokens) ? $brandTokens[0] : $companyName;
        $rawArticles = [];
        $sourceEngine = 'none';

        // 1. Try Serper News
        if ($this->serper->isConfigured($tenantId)) {
            try {
                $rawArticles = $this->fetchFromSerperNews($searchSubject, $companyName, $tenantId);
                if (!empty($rawArticles)) {
                    $sourceEngine = 'Serper Google News';
                }
            } catch (\Throwable $e) {
                Log::warning("[CompanyNewsDiscovery] Serper News failed: {$e->getMessage()}");
            }
        }

        // 2. Try Tavily News
        if (empty($rawArticles) && $this->tavily->isConfigured($tenantId)) {
            try {
                $rawArticles = $this->fetchFromTavilyNews($searchSubject, $companyName, $tenantId);
                if (!empty($rawArticles)) {
                    $sourceEngine = 'Tavily AI News';
                }
            } catch (\Throwable $e) {
                Log::warning("[CompanyNewsDiscovery] Tavily News failed: {$e->getMessage()}");
            }
        }

        // 3. Try Custom Endpoint
        if (empty($rawArticles) && $this->customEndpoint->isConfigured($tenantId)) {
            try {
                $rawArticles = $this->fetchFromCustomEndpoint($searchSubject, $companyName, $tenantId);
                if (!empty($rawArticles)) {
                    $sourceEngine = 'Custom Search Endpoint';
                }
            } catch (\Throwable $e) {
                Log::warning("[CompanyNewsDiscovery] Custom Endpoint failed: {$e->getMessage()}");
            }
        }

        // 4. Fallback to Gemini Google Search Grounding / AI Web Search
        if (empty($rawArticles)) {
            try {
                $rawArticles = $this->fetchFromAiWebSearch($lead, $searchSubject);
                if (!empty($rawArticles)) {
                    $sourceEngine = 'AI Web Search (Search Grounding)';
                }
            } catch (\Throwable $e) {
                Log::warning("[CompanyNewsDiscovery] AI Web Search failed: {$e->getMessage()}");
            }
        }

        if (empty($rawArticles)) {
            return [
                'success' => true,
                'count' => 0,
                'news' => $lead->companyNews()->get(),
                'source' => 'none',
                'message' => "Tidak ditemukan berita publik terbaru untuk \"{$companyName}\". Anda dapat memeriksa ejaan atau menambahkan berita secara manual.",
            ];
        }

        // Persist discovered articles
        $savedModels = collect([]);
        foreach ($rawArticles as $art) {
            $headline = trim((string) ($art['headline'] ?? $art['title'] ?? ''));
            $url = trim((string) ($art['url'] ?? $art['link'] ?? ''));

            if (empty($headline) || empty($url)) {
                continue;
            }

            $publisherDomain = $this->extractDomain($url);
            $publisherName = $art['publisher'] ?? $art['source'] ?? $this->resolvePublisherName($publisherDomain);
            $publishedAt = $this->parsePublishedDate($art['date'] ?? $art['published_at'] ?? null);

            $relevanceScore = $this->calculateRelevance($headline . ' ' . ($art['summary'] ?? ''), $companyName, $brandTokens);
            $reliabilityScore = $this->calculateReliability($publisherDomain);

            $model = LeadCompanyNews::updateOrCreate(
                [
                    'lead_id' => $lead->id,
                    'canonical_url' => $url,
                ],
                [
                    'tenant_id' => $tenantId,
                    'headline' => Str::limit($headline, 250),
                    'publisher_name' => Str::limit($publisherName, 100),
                    'publisher_domain' => $publisherDomain,
                    'published_at' => $publishedAt,
                    'summary' => Str::limit((string) ($art['summary'] ?? $art['snippet'] ?? ''), 1000),
                    'source_provider' => $sourceEngine,
                    'relevance_score' => $relevanceScore,
                    'reliability_score' => $reliabilityScore,
                    'verification_status' => 'verified',
                    'is_relevant' => $relevanceScore >= 60,
                    'is_excluded' => false,
                    'raw_metadata' => $art,
                ]
            );

            $savedModels->push($model);
        }

        return [
            'success' => true,
            'count' => $savedModels->count(),
            'news' => $lead->companyNews()->get(),
            'source' => $sourceEngine,
            'message' => "Berhasil menemukan {$savedModels->count()} berita dan sinyal bisnis via {$sourceEngine}.",
        ];
    }

    private function fetchFromSerperNews(string $subject, string $legalName, ?int $tenantId): array
    {
        $apiKey = $this->serper->getApiKey($tenantId);
        $queries = [
            "\"{$subject}\" bisnis OR ekspansi OR investasi OR direktur OR produk",
            "\"{$legalName}\"",
        ];

        $results = [];
        foreach ($queries as $q) {
            $response = Http::withHeaders([
                'X-API-KEY' => $apiKey,
                'Content-Type' => 'application/json',
            ])->timeout(10)->post('https://google.serper.dev/news', [
                'q' => $q,
                'gl' => 'id',
                'hl' => 'id',
                'num' => 10,
            ]);

            if ($response->successful()) {
                $news = $response->json('news') ?? [];
                foreach ($news as $item) {
                    $results[] = [
                        'headline' => $item['title'] ?? '',
                        'url' => $item['link'] ?? '',
                        'snippet' => $item['snippet'] ?? '',
                        'summary' => $item['snippet'] ?? '',
                        'publisher' => $item['source'] ?? '',
                        'date' => $item['date'] ?? null,
                    ];
                }
            }

            if (count($results) >= 8) {
                break;
            }
        }

        return $results;
    }

    private function fetchFromTavilyNews(string $subject, string $legalName, ?int $tenantId): array
    {
        $apiKey = $this->tavily->getApiKey($tenantId);
        $query = "{$subject} {$legalName} business news corporate expansion leadership";

        $response = Http::withHeaders([
            'Content-Type' => 'application/json',
        ])->timeout(12)->post('https://api.tavily.com/search', [
            'api_key' => $apiKey,
            'query' => $query,
            'search_depth' => 'advanced',
            'topic' => 'news',
            'max_results' => 10,
        ]);

        $results = [];
        if ($response->successful()) {
            $items = $response->json('results') ?? [];
            foreach ($items as $item) {
                $results[] = [
                    'headline' => $item['title'] ?? '',
                    'url' => $item['url'] ?? '',
                    'snippet' => $item['content'] ?? '',
                    'summary' => $item['content'] ?? '',
                    'date' => $item['published_date'] ?? null,
                ];
            }
        }

        return $results;
    }

    private function fetchFromCustomEndpoint(string $subject, string $legalName, ?int $tenantId): array
    {
        $endpoint = $this->customEndpoint->getEndpointUrl($tenantId);
        $apiKey = $this->customEndpoint->getApiKey($tenantId);

        $client = Http::timeout(10);
        if (!empty($apiKey)) {
            $client = $client->withToken($apiKey);
        }

        $query = "\"{$subject}\" berita bisnis";
        $response = $client->asJson()->post($endpoint, [
            'q' => $query,
            'format' => 'json',
            'categories' => 'news',
        ]);

        $results = [];
        if ($response->successful()) {
            $items = $response->json('results') ?? $response->json('organic') ?? [];
            foreach ($items as $item) {
                $results[] = [
                    'headline' => $item['title'] ?? '',
                    'url' => $item['url'] ?? $item['link'] ?? '',
                    'snippet' => $item['content'] ?? $item['snippet'] ?? '',
                    'summary' => $item['content'] ?? $item['snippet'] ?? '',
                    'publisher' => $item['engine'] ?? '',
                ];
            }
        }

        return $results;
    }

    private function fetchFromAiWebSearch(Lead $lead, string $searchSubject): array
    {
        $prompt = "Search the web for up to 8 real news articles, press releases, or business publications regarding \"{$searchSubject}\" (Legal entity: \"{$lead->company_name}\", Domain: \"{$lead->website_domain}\").
Focus on corporate news, leadership appointments, expansion, funding/investments, product launches, financial performance, regulatory challenges, or partnerships.
Return a clean JSON object containing an array \"articles\". Each article MUST contain:
- \"headline\": string (article title)
- \"url\": string (canonical link to the original article)
- \"publisher\": string (e.g. Kompas, CNBC Indonesia, Bisnis.com, etc.)
- \"summary\": string (concise summary of what happened)
- \"date\": string (e.g. '2026-05-12' or relative '2 days ago')

Format precisely:
{
  \"articles\": [
    {
      \"headline\": \"...\",
      \"url\": \"...\",
      \"publisher\": \"...\",
      \"summary\": \"...\",
      \"date\": \"...\"
    }
  ]
}";

        $res = $this->ai->call('company_news_intelligence_analysis', $prompt, [
            'web_search' => true,
            'company_name' => $lead->company_name,
            'industry' => $lead->industry?->name,
        ]);

        if (!$res['success'] || empty($res['content'])) {
            return [];
        }

        $rawText = trim((string) $res['content']);
        if (preg_match('/```(?:json)?\s*([\s\S]*?)\s*```/', $rawText, $match)) {
            $rawText = trim($match[1]);
        } elseif (preg_match('/\{[\s\S]*\}/', $rawText, $match)) {
            $rawText = trim($match[0]);
        }

        $decoded = json_decode($rawText, true);
        return $decoded['articles'] ?? [];
    }

    private function extractBrandTokens(Lead $lead): array
    {
        $tokens = [];
        if (!empty($lead->brand)) {
            $tokens[] = trim((string) $lead->brand);
        }

        $clean = preg_replace('/^(PT|CV|UD|PD|TBK|PERSERO)\.?\s+/i', '', $lead->company_name);
        $clean = preg_replace('/\s+(TBK|PERSERO|LTD|CORP|INC)\.?$/i', '', $clean);
        $tokens[] = trim($clean);

        return array_values(array_unique(array_filter($tokens)));
    }

    private function extractDomain(string $url): string
    {
        $host = parse_url($url, PHP_URL_HOST) ?: '';
        return strtolower(preg_replace('/^www\./', '', $host));
    }

    private function resolvePublisherName(string $domain): string
    {
        foreach (self::REPUTABLE_MEDIA as $d => $name) {
            if ($domain === $d || str_ends_with($domain, '.' . $d)) {
                return $name;
            }
        }
        return ucfirst(explode('.', $domain)[0] ?? 'Web Media');
    }

    private function calculateRelevance(string $text, string $companyName, array $tokens): int
    {
        $lower = strtolower($text);
        if (str_contains($lower, strtolower($companyName))) {
            return 95;
        }

        foreach ($tokens as $token) {
            if (strlen($token) > 3 && str_contains($lower, strtolower($token))) {
                return 88;
            }
        }

        return 70;
    }

    private function calculateReliability(string $domain): int
    {
        foreach (self::REPUTABLE_MEDIA as $d => $name) {
            if ($domain === $d || str_ends_with($domain, '.' . $d)) {
                return 95;
            }
        }
        return 75;
    }

    private function parsePublishedDate(?string $dateStr): ?Carbon
    {
        if (empty($dateStr)) {
            return now();
        }

        try {
            return Carbon::parse($dateStr);
        } catch (\Throwable) {
            return now();
        }
    }
}
