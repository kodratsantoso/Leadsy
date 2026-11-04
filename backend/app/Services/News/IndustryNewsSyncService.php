<?php

namespace App\Services\News;

use App\Jobs\SyncIndustryNewsJob;
use App\Models\Industry;
use App\Models\IndustryNewsArticle;
use App\Models\IndustryNewsEntity;
use App\Models\IndustryNewsSyncLog;
use App\Models\Lead;
use App\Models\SubIndustry;
use App\Services\AI\AiOrchestrationService;
use App\Services\LeadDuplicateDetectionService;
use App\Services\Search\WebSearchManager;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class IndustryNewsSyncService
{
    private const VALID_SIGNALS = [
        'expansion',
        'investment',
        'partnership',
        'digital_transformation',
        'tender',
        'leadership',
        'market_move',
    ];

    /**
     * Common Indonesian & global media publisher keywords excluded from entity extraction.
     */
    private const PUBLISHER_BLOCKLIST = [
        'kontan', 'bisnis', 'cnbc', 'detik', 'kompas', 'tempo', 'katadata',
        'investor daily', 'antara', 'liputan6', 'cnn', 'bloomberg', 'reuters',
        'idntimes', 'idn times', 'kumparan', 'tribun', 'sindonews', 'okezone',
        'jawapos', 'mediaindonesia', 'republika', 'warta ekonomi', 'swa',
        'dailysocial', 'tech in asia', 'fortune', 'forbes', 'yahoo', 'google',
    ];

    public function __construct(
        private readonly GoogleNewsRssClient $rssClient,
        private readonly WebSearchManager $webSearch,
        private readonly AiOrchestrationService $ai,
        private readonly LeadDuplicateDetectionService $duplicateDetector,
    ) {}

    public function dispatchSync(
        int $tenantId,
        int $industryId,
        ?int $subIndustryId = null,
        string $regionScope = 'id',
        ?int $userId = null,
        ?string $focusKeyword = null,
    ): IndustryNewsSyncLog {
        $syncLog = IndustryNewsSyncLog::withoutGlobalScopes()->create([
            'tenant_id' => $tenantId,
            'industry_id' => $industryId,
            'sub_industry_id' => $subIndustryId,
            'region_scope' => in_array($regionScope, ['id', 'global'], true) ? $regionScope : 'id',
            'status' => 'queued',
            'triggered_by' => $userId,
        ]);

        SyncIndustryNewsJob::dispatch($syncLog->id, $focusKeyword);

        return $syncLog;
    }

    public function runSyncInline(
        int $tenantId,
        int $industryId,
        ?int $subIndustryId = null,
        string $regionScope = 'id',
        ?int $userId = null,
        ?string $focusKeyword = null,
    ): IndustryNewsSyncLog {
        $syncLog = IndustryNewsSyncLog::withoutGlobalScopes()->create([
            'tenant_id' => $tenantId,
            'industry_id' => $industryId,
            'sub_industry_id' => $subIndustryId,
            'region_scope' => in_array($regionScope, ['id', 'global'], true) ? $regionScope : 'id',
            'status' => 'running',
            'started_at' => now(),
            'triggered_by' => $userId,
        ]);

        try {
            $this->performSync($syncLog, $focusKeyword);
        } catch (\Throwable $e) {
            Log::error('[IndustryNewsSync] Inline sync failed', [
                'sync_id' => $syncLog->id,
                'error' => $e->getMessage(),
            ]);

            $syncLog->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
                'completed_at' => now(),
            ]);
        }

        return $syncLog->fresh();
    }

    public function performSync(IndustryNewsSyncLog $syncLog, ?string $focusKeyword = null): void
    {
        $syncLog->update([
            'status' => 'running',
            'started_at' => $syncLog->started_at ?? now(),
            'error_message' => null,
        ]);

        $tenantId = (int) $syncLog->tenant_id;
        $industry = Industry::withoutGlobalScopes()->findOrFail($syncLog->industry_id);
        $subIndustry = $syncLog->sub_industry_id
            ? SubIndustry::withoutGlobalScopes()->find($syncLog->sub_industry_id)
            : null;

        $regionScope = $syncLog->region_scope ?: 'id';
        $queries = $this->buildSearchQueries($industry, $subIndustry, $regionScope, $focusKeyword);

        $rawCandidates = [];
        $providersUsed = [];

        // 1. Primary zero-cost real-time news source: Google News RSS
        foreach ($queries['rss'] as $rssQuery) {
            $rssResult = $this->rssClient->search($rssQuery, $regionScope, 14);
            if ($rssResult['success'] && ! empty($rssResult['results'])) {
                $providersUsed['google_news_rss'] = 'Google News RSS';
                foreach ($rssResult['results'] as $item) {
                    $item['search_provider'] = 'google_news_rss';
                    $rawCandidates[] = $item;
                }
            }
        }

        // 2. Supplemental commercial web search via configured WebSearchManager (1 bounded query)
        $webResult = $this->webSearch->search($queries['web'], $tenantId, 8);
        if ($webResult['success'] && ! empty($webResult['results'])) {
            $providerKey = $webResult['provider'] ?? 'web_search';
            $providersUsed[$providerKey] = $this->webSearch->label($providerKey);
            foreach ($webResult['results'] as $res) {
                $domain = $this->extractDomain($res['link'] ?? '');
                $rawCandidates[] = [
                    'title' => trim((string) ($res['title'] ?? '')),
                    'url' => trim((string) ($res['link'] ?? '')),
                    'snippet' => trim((string) ($res['snippet'] ?? '')),
                    'source_name' => $domain ? ucfirst(explode('.', $domain)[0]) : null,
                    'source_domain' => $domain,
                    'published_at' => null,
                    'search_provider' => $providerKey,
                ];
            }
        }

        // Deduplicate candidates by normalized URL hash & skip URLs already persisted in DB
        $existingHashes = IndustryNewsArticle::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('industry_id', $industry->id)
            ->pluck('url_hash')
            ->flip()
            ->all();

        $seenHashes = [];
        $freshCandidates = [];

        foreach ($rawCandidates as $cand) {
            if (empty($cand['title']) || empty($cand['url'])) {
                continue;
            }
            $hash = $this->computeUrlHash($cand['url'], $cand['title']);
            if (isset($seenHashes[$hash])) {
                continue;
            }
            $seenHashes[$hash] = true;

            if (isset($existingHashes[$hash])) {
                continue;
            }

            $cand['url_hash'] = $hash;
            $freshCandidates[] = $cand;

            if (count($freshCandidates) >= 20) {
                break;
            }
        }

        $totalFetched = count($seenHashes);

        if ($freshCandidates === []) {
            // Reconcile any newly added CRM leads even if no new articles arrived
            $this->reconcileMatchedLeads($tenantId, $industry->id);

            $syncLog->update([
                'status' => 'completed',
                'articles_fetched' => $totalFetched,
                'new_articles_saved' => 0,
                'entities_detected' => 0,
                'providers_used' => array_values($providersUsed),
                'completed_at' => now(),
            ]);

            return;
        }

        // 3. Batch AI entity & signal extraction (1 structured call for the batch, with deterministic fallback)
        $aiEnrichments = $this->extractViaAiBatch($industry, $subIndustry, $freshCandidates);

        $savedArticlesCount = 0;
        $savedEntitiesCount = 0;

        foreach ($freshCandidates as $idx => $cand) {
            $aiItem = $aiEnrichments[$idx] ?? null;

            $signalType = $this->normalizeSignalType(
                $aiItem['signal_type'] ?? $this->detectSignalDeterministically($cand['title'].' '.($cand['snippet'] ?? ''))
            );

            $relevanceTier = in_array($aiItem['relevance_tier'] ?? '', ['high', 'medium', 'general'], true)
                ? $aiItem['relevance_tier']
                : ($signalType !== 'market_move' ? 'high' : 'medium');

            $snippet = ! empty($aiItem['concise_summary'])
                ? trim((string) $aiItem['concise_summary'])
                : ($cand['snippet'] ?: $cand['title']);

            $publishedAt = ! empty($cand['published_at'])
                ? Carbon::parse($cand['published_at'])
                : now();

            $article = IndustryNewsArticle::withoutGlobalScopes()->updateOrCreate(
                [
                    'tenant_id' => $tenantId,
                    'industry_id' => $industry->id,
                    'url_hash' => $cand['url_hash'],
                ],
                [
                    'sub_industry_id' => $subIndustry?->id,
                    'region_scope' => $regionScope,
                    'title' => $cand['title'],
                    'url' => $cand['url'],
                    'source_name' => $cand['source_name'] ?: ($cand['source_domain'] ?: 'News Wire'),
                    'source_domain' => $cand['source_domain'],
                    'published_at' => $publishedAt,
                    'snippet' => mb_substr($snippet, 0, 600),
                    'signal_type' => $signalType,
                    'relevance_tier' => $relevanceTier,
                    'search_provider' => $cand['search_provider'],
                ]
            );

            $savedArticlesCount++;

            // Gather entities from AI or fallback regex extractor
            $rawEntities = (! empty($aiItem['entities']) && is_array($aiItem['entities']))
                ? $aiItem['entities']
                : $this->extractEntitiesDeterministically($cand['title'], $cand['snippet'] ?? '', $cand['source_name']);

            foreach ($rawEntities as $ent) {
                $entityName = trim((string) ($ent['entity_name'] ?? ''));
                if ($entityName === '' || $this->isBlockedPublisherOrGeneric($entityName, $industry->name)) {
                    continue;
                }

                $normalizedName = LeadDuplicateDetectionService::cleanCompanyName($entityName);
                if (mb_strlen($normalizedName) < 3) {
                    continue;
                }

                $parentHint = ! empty($ent['parent_company_hint']) ? trim((string) $ent['parent_company_hint']) : null;
                $websiteHint = ! empty($ent['website_hint']) ? trim((string) $ent['website_hint']) : null;

                // Check if entity or its parent company already exists in Leadsy CRM
                $matchedLead = $this->duplicateDetector->findDuplicate('', $entityName, $websiteHint, $tenantId);
                if (! $matchedLead && $parentHint) {
                    $matchedLead = $this->duplicateDetector->findDuplicate('', $parentHint, $websiteHint, $tenantId);
                }

                IndustryNewsEntity::withoutGlobalScopes()->updateOrCreate(
                    [
                        'article_id' => $article->id,
                        'normalized_name' => $normalizedName,
                    ],
                    [
                        'tenant_id' => $tenantId,
                        'industry_id' => $industry->id,
                        'entity_name' => mb_substr($entityName, 0, 250),
                        'entity_type' => in_array($ent['entity_type'] ?? '', ['company', 'brand'], true)
                            ? $ent['entity_type']
                            : 'company',
                        'parent_company_hint' => $parentHint ? mb_substr($parentHint, 0, 250) : null,
                        'website_hint' => $websiteHint ? mb_substr($websiteHint, 0, 250) : null,
                        'role_in_news' => in_array($ent['role_in_news'] ?? '', ['subject', 'partner', 'competitor'], true)
                            ? $ent['role_in_news']
                            : 'subject',
                        'signal_context' => ! empty($ent['signal_context'])
                            ? mb_substr(trim((string) $ent['signal_context']), 0, 240)
                            : null,
                        'matched_lead_id' => $matchedLead?->id,
                    ]
                );

                $savedEntitiesCount++;
            }
        }

        $syncLog->update([
            'status' => 'completed',
            'articles_fetched' => $totalFetched,
            'new_articles_saved' => $savedArticlesCount,
            'entities_detected' => $savedEntitiesCount,
            'providers_used' => array_values($providersUsed),
            'completed_at' => now(),
        ]);
    }

    /**
     * Reconcile unmatched entities in DB against current CRM leads in O(N) memory without extra external calls.
     */
    public function reconcileMatchedLeads(int $tenantId, int $industryId): void
    {
        $unmatched = IndustryNewsEntity::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('industry_id', $industryId)
            ->whereNull('matched_lead_id')
            ->get(['id', 'normalized_name', 'parent_company_hint', 'website_hint']);

        if ($unmatched->isEmpty()) {
            return;
        }

        $leads = Lead::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->whereNull('deleted_at')
            ->get(['id', 'company_name', 'brand', 'website', 'website_domain']);

        if ($leads->isEmpty()) {
            return;
        }

        $leadByCleanName = [];
        $leadByDomain = [];

        foreach ($leads as $lead) {
            $cleanCompany = LeadDuplicateDetectionService::cleanCompanyName((string) $lead->company_name);
            if ($cleanCompany !== '') {
                $leadByCleanName[$cleanCompany] = $lead->id;
            }
            if (! empty($lead->brand)) {
                $cleanBrand = LeadDuplicateDetectionService::cleanCompanyName((string) $lead->brand);
                if ($cleanBrand !== '') {
                    $leadByCleanName[$cleanBrand] = $lead->id;
                }
            }
            $domain = LeadDuplicateDetectionService::cleanDomain($lead->website_domain ?: $lead->website);
            if ($domain) {
                $leadByDomain[$domain] = $lead->id;
            }
        }

        foreach ($unmatched as $entity) {
            $matchedId = $leadByCleanName[$entity->normalized_name] ?? null;

            if (! $matchedId && ! empty($entity->parent_company_hint)) {
                $cleanParent = LeadDuplicateDetectionService::cleanCompanyName($entity->parent_company_hint);
                $matchedId = $leadByCleanName[$cleanParent] ?? null;
            }

            if (! $matchedId && ! empty($entity->website_hint)) {
                $domain = LeadDuplicateDetectionService::cleanDomain($entity->website_hint);
                if ($domain) {
                    $matchedId = $leadByDomain[$domain] ?? null;
                }
            }

            if ($matchedId) {
                IndustryNewsEntity::withoutGlobalScopes()
                    ->where('id', $entity->id)
                    ->update(['matched_lead_id' => $matchedId]);
            }
        }
    }

    /**
     * @return array{rss: list<string>, web: string}
     */
    private function buildSearchQueries(
        Industry $industry,
        ?SubIndustry $subIndustry,
        string $regionScope,
        ?string $focusKeyword
    ): array {
        $terms = [$industry->name];
        if ($subIndustry) {
            $terms[] = $subIndustry->name;
        } elseif (is_array($industry->synonyms) && ! empty($industry->synonyms)) {
            $firstSyn = trim((string) ($industry->synonyms[0] ?? ''));
            if ($firstSyn !== '') {
                $terms[] = $firstSyn;
            }
        }

        $subjectClause = count($terms) > 1
            ? '("'.implode('" OR "', array_slice($terms, 0, 2)).'")'
            : '"'.$industry->name.'"';

        $focus = $focusKeyword ? ' "'.trim($focusKeyword).'"' : '';

        if ($regionScope === 'global') {
            return [
                'rss' => [
                    "{$subjectClause}{$focus} (company OR brand OR Corp OR Group) (expansion OR investment OR partnership OR launch)",
                    "{$subjectClause}{$focus} (acquisition OR project OR contract OR digital transformation)",
                ],
                'web' => "{$industry->name} {$focus} company expansion investment news",
            ];
        }

        return [
            'rss' => [
                "{$subjectClause}{$focus} (PT OR Tbk OR perusahaan OR grup) (ekspansi OR investasi OR pabrik OR proyek OR bisnis)",
                "{$subjectClause}{$focus} (kerjasama OR kemitraan OR akuisisi OR transformasi OR peluncuran)",
            ],
            'web' => "berita bisnis perusahaan PT {$industry->name}{$focus} ekspansi investasi terbaru Indonesia",
        ];
    }

    /**
     * @param  list<array<string, mixed>>  $candidates
     * @return array<int, array<string, mixed>>
     */
    private function extractViaAiBatch(Industry $industry, ?SubIndustry $subIndustry, array $candidates): array
    {
        $batchPayload = [];
        foreach ($candidates as $idx => $cand) {
            $batchPayload[] = [
                'index' => $idx,
                'title' => $cand['title'],
                'source' => $cand['source_name'] ?? $cand['source_domain'] ?? '',
                'snippet' => mb_substr((string) ($cand['snippet'] ?? ''), 0, 280),
            ];
        }

        $inputJson = json_encode([
            'target_industry' => $industry->name,
            'target_sub_industry' => $subIndustry?->name,
            'articles' => $batchPayload,
        ], JSON_UNESCAPED_UNICODE);

        try {
            $response = $this->ai->call('industry_news_extraction', (string) $inputJson, [
                'industry' => $industry->name,
            ]);

            if (! ($response['success'] ?? false) || empty($response['content'])) {
                Log::info('[IndustryNewsSync] AI extraction unavailable, falling back to deterministic parser', [
                    'reason' => $response['error'] ?? 'empty content',
                ]);

                return [];
            }

            $cleanJson = preg_replace('/^```(?:json)?\s*|\s*```$/s', '', trim((string) $response['content']));
            $decoded = json_decode((string) $cleanJson, true);

            if (! is_array($decoded) || empty($decoded['articles']) || ! is_array($decoded['articles'])) {
                return [];
            }

            $indexed = [];
            foreach ($decoded['articles'] as $item) {
                if (is_array($item) && isset($item['index'])) {
                    $indexed[(int) $item['index']] = $item;
                }
            }

            return $indexed;
        } catch (\Throwable $e) {
            Log::warning('[IndustryNewsSync] AI batch extraction threw exception, using deterministic fallback', [
                'error' => $e->getMessage(),
            ]);

            return [];
        }
    }

    /**
     * Deterministic corporate & brand extractor when AI routing is unavailable or returns empty.
     *
     * @return list<array<string, mixed>>
     */
    public function extractEntitiesDeterministically(string $title, string $snippet = '', ?string $sourceName = null): array
    {
        $text = $title.' . '.$snippet;
        $found = [];

        // Pattern 1: Explicit Indonesian legal entities (PT ..., CV ..., Perum ...)
        if (preg_match_all('/\b((?:PT|CV|Perum)\s+[A-Z][A-Za-z0-9&\.\-]*(?:\s+(?:[A-Z][A-Za-z0-9&\.\-]*|\(Persero\)|Persero|Tbk\.?)){1,6})\b/u', $text, $ptMatches)) {
            foreach ($ptMatches[1] as $match) {
                $clean = trim(preg_replace('/\s+(dan|dengan|untuk|dalam|pada|di|ke|dari|yang|resmi|bakal|siap|targetkan|catat|raih|gelontorkan|bangun|gandeng).*$/iu', '', $match) ?? $match);
                if (mb_strlen($clean) >= 6) {
                    $found[$clean] = [
                        'entity_name' => $clean,
                        'entity_type' => 'company',
                        'role_in_news' => 'subject',
                    ];
                }
            }
        }

        // Pattern 2: "[Capitalized Name] Tbk" or "[Capitalized Name] Group / Corp / Holdings / Indonesia"
        if (preg_match_all('/\b([A-Z][A-Za-z0-9&\-]+(?:\s+[A-Z][A-Za-z0-9&\-]+){0,3}\s+(?:Tbk|Group|Grup|Corp|Corporation|Holdings|Ventures))\b/u', $text, $corpMatches)) {
            foreach ($corpMatches[1] as $match) {
                $clean = trim($match);
                if (! isset($found[$clean]) && mb_strlen($clean) >= 5) {
                    $found[$clean] = [
                        'entity_name' => $clean,
                        'entity_type' => 'company',
                        'role_in_news' => 'subject',
                    ];
                }
            }
        }

        // Pattern 3: Leading capitalized proper subject at start of headline before active B2B verbs
        if ($found === [] && preg_match('/^([A-Z][A-Za-z0-9&\.\-]+(?:\s+[A-Z][A-Za-z0-9&\.\-]+){0,3})\s+(?:Ekspansi|Investasi|Bangun|Gandeng|Akuisisi|Luncurkan|Resmikan|Siapkan|Targetkan| Bidik|Suntik|Kucurkan|Raih|Teken)\b/u', trim($title), $leadMatch)) {
            $candidate = trim($leadMatch[1]);
            if (! in_array(mb_strtolower($candidate), ['pemerintah', 'kementerian', 'menteri', 'presiden', 'indonesia', 'investor', 'emiten', 'industri', 'pasar', 'sektor'], true)) {
                $found[$candidate] = [
                    'entity_name' => $candidate,
                    'entity_type' => 'brand',
                    'role_in_news' => 'subject',
                ];
            }
        }

        // Filter out source publisher name if accidentally matched
        return array_values(array_filter($found, function (array $ent) use ($sourceName) {
            if ($sourceName && mb_strtolower($ent['entity_name']) === mb_strtolower(trim($sourceName))) {
                return false;
            }

            return ! $this->isBlockedPublisherOrGeneric($ent['entity_name'], '');
        }));
    }

    private function detectSignalDeterministically(string $text): string
    {
        $lower = mb_strtolower($text);

        if (preg_match('/\b(ekspansi|pabrik baru|cabang baru|perluas|buka gerai|kapasitas produksi|expansion|new plant|new branch)\b/u', $lower)) {
            return 'expansion';
        }
        if (preg_match('/\b(investasi|capex|belanja modal|pendanaan|suntikan modal|akuisisi|rights issue|ipo|investment|funding|acquisition)\b/u', $lower)) {
            return 'investment';
        }
        if (preg_match('/\b(kerjasama|kerja sama|kemitraan|kolaborasi|gandeng|mou|sinergi|partnership|joint venture)\b/u', $lower)) {
            return 'partnership';
        }
        if (preg_match('/\b(transformasi digital|cloud|erp| otomasi|ai |artificial intelligence|sistem informasi|digitalisasi|cyber|data center)\b/u', $lower)) {
            return 'digital_transformation';
        }
        if (preg_match('/\b(tender|kontrak baru|proyek strategis|pengadaan|menang proyek|garap proyek)\b/u', $lower)) {
            return 'tender';
        }
        if (preg_match('/\b(direktur|ceo|komisaris|manajemen baru|pergantian pimpinan|rups)\b/u', $lower)) {
            return 'leadership';
        }

        return 'market_move';
    }

    private function normalizeSignalType(?string $signal): string
    {
        $clean = strtolower(trim((string) $signal));

        return in_array($clean, self::VALID_SIGNALS, true) ? $clean : 'market_move';
    }

    private function isBlockedPublisherOrGeneric(string $entityName, string $industryName): bool
    {
        $lower = mb_strtolower(trim($entityName));

        if ($industryName !== '' && $lower === mb_strtolower(trim($industryName))) {
            return true;
        }

        foreach (self::PUBLISHER_BLOCKLIST as $pub) {
            if ($lower === $pub || str_contains($lower, $pub.'.co') || str_contains($lower, $pub.'.com')) {
                return true;
            }
        }

        $genericTerms = [
            'indonesia', 'jakarta', 'pemerintah', 'kementerian', 'bank indonesia',
            'ojk', 'bursa efek indonesia', 'bei', 'idx', 'kadin', 'apindo',
        ];

        return in_array($lower, $genericTerms, true);
    }

    private function computeUrlHash(string $url, string $fallbackTitle): string
    {
        $trimmed = trim($url);
        if ($trimmed === '') {
            return hash('sha256', mb_strtolower(trim($fallbackTitle)));
        }

        // Strip UTM tracking query params for cleaner deduplication
        $parts = parse_url($trimmed);
        $base = ($parts['scheme'] ?? 'https').'://'.strtolower($parts['host'] ?? '').($parts['path'] ?? '');
        if (! empty($parts['query'])) {
            parse_str($parts['query'], $queryParams);
            foreach (array_keys($queryParams) as $k) {
                if (str_starts_with(strtolower((string) $k), 'utm_')) {
                    unset($queryParams[$k]);
                }
            }
            if (! empty($queryParams)) {
                ksort($queryParams);
                $base .= '?'.http_build_query($queryParams);
            }
        }

        return hash('sha256', $base);
    }

    private function extractDomain(string $url): ?string
    {
        $host = parse_url(trim($url), PHP_URL_HOST);
        if (! $host) {
            return null;
        }

        return preg_replace('/^www\./i', '', strtolower($host));
    }
}
