<?php

namespace App\Services\Lead;

use App\Models\Lead;
use App\Services\Validation\EmailMxValidationService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Deep Search Contact Discovery Service.
 *
 * Discovers PIC contacts via direct Google.com scraping (no API key, no AI).
 * Pipeline: Query Building → Google Scraping → HTML Parsing → Title Classification
 *           → Email Generation → MX Validation → Confidence Scoring → Result Filtering.
 */
class ContactDeepSearchService
{
    private const CACHE_TTL_DAYS = 7;

    private const MIN_CONFIDENCE = 25;

    private const REQUEST_DELAY_MS = 2000;

    private const USER_AGENTS = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    ];

    public function __construct(
        private EmailMxValidationService $mxValidator,
    ) {}

    /**
     * Execute the deep search pipeline for a lead.
     *
     * @return array{success: bool, candidates: array, queries: string[], message?: string, error?: string}
     */
    public function search(Lead $lead): array
    {
        if (empty($lead->company_name)) {
            return [
                'success' => false,
                'candidates' => [],
                'queries' => [],
                'error' => 'Lead company name is required before deep search.',
            ];
        }

        $domain = $lead->website_domain ?: parse_url((string) $lead->website, PHP_URL_HOST);

        // Step 1: Build search queries
        $queries = $this->buildQueries($lead->company_name, $domain);

        // Step 2 + 3: Scrape Yahoo and parse results
        $rawResults = [];
        foreach ($queries as $query) {
            $html = $this->scrapeYahoo($query);
            if ($html !== null) {
                $parsed = $this->parseYahooHtml($html, $query);
                $rawResults = array_merge($rawResults, $parsed);
            }
            // Rate limit between requests
            usleep(self::REQUEST_DELAY_MS * 1000);
        }

        if (empty($rawResults)) {
            return [
                'success' => true,
                'candidates' => [],
                'queries' => $queries,
                'message' => 'Deep search did not discover any contact candidates. Yahoo may have returned no results or blocked the request.',
            ];
        }

        // Step 4: Deduplicate by person name / LinkedIn ID
        $deduped = $this->deduplicateResults($rawResults);

        // Step 5: Classify titles (department + seniority)
        foreach ($deduped as &$result) {
            $classification = $this->classifyTitle((string) ($result['title'] ?? ''));
            $result['department'] = $classification['department'];
            $result['seniority_level'] = $classification['seniority_level'];
        }
        unset($result);

        // Step 6: Generate email candidates
        foreach ($deduped as &$result) {
            $result['inferred_emails'] = [];
            if (! empty($result['name']) && ! empty($domain)) {
                $result['inferred_emails'] = $this->mxValidator->generateEmailCandidates(
                    (string) $result['name'],
                    $domain
                );
            }
        }
        unset($result);

        // Step 7: MX Validation
        $mxResults = [];
        $domainsToValidate = array_unique(array_filter([
            $domain,
            ...array_map(fn ($r) => $this->extractDomainFromEmails($r), $deduped),
        ]));

        foreach ($domainsToValidate as $d) {
            if ($d) {
                $mxResults[$d] = $this->mxValidator->validateDomain($d);
            }
        }

        foreach ($deduped as &$result) {
            $result['email_verified'] = false;
            $result['email'] = null;
            $result['validation_log'] = [];

            // Check snippet-found emails first
            if (! empty($result['snippet_emails'])) {
                foreach ($result['snippet_emails'] as $snippetEmail) {
                    $emailDomain = explode('@', $snippetEmail)[1] ?? '';
                    if (isset($mxResults[$emailDomain]) && $mxResults[$emailDomain]['valid']) {
                        $result['email'] = $snippetEmail;
                        $result['email_verified'] = true;
                        $result['email_source'] = 'discovered';
                        $result['validation_log'][] = [
                            'type' => 'mx_check',
                            'domain' => $emailDomain,
                            'result' => 'pass',
                            'mx_hosts' => $mxResults[$emailDomain]['mx_hosts'],
                            'source' => 'snippet',
                        ];
                        break;
                    }
                }
            }

            // Fallback to inferred emails
            if (empty($result['email']) && ! empty($result['inferred_emails'])) {
                $firstInferred = $result['inferred_emails'][0];
                $inferredDomain = explode('@', $firstInferred)[1] ?? '';

                $mxValid = isset($mxResults[$inferredDomain]) && $mxResults[$inferredDomain]['valid'];
                $result['email'] = $firstInferred;
                $result['email_verified'] = $mxValid;
                $result['email_source'] = 'inferred';
                $result['validation_log'][] = [
                    'type' => 'mx_check',
                    'domain' => $inferredDomain,
                    'result' => $mxValid ? 'pass' : 'fail',
                    'mx_hosts' => $mxResults[$inferredDomain]['mx_hosts'] ?? [],
                    'source' => 'inferred',
                ];
            }
        }
        unset($result);

        // Step 8: Confidence Scoring
        foreach ($deduped as &$result) {
            $result['confidence_score'] = $this->calculateConfidence($result, $lead);
        }
        unset($result);

        // Step 9: Filter by minimum confidence
        $filtered = array_filter($deduped, fn ($r) => ($r['confidence_score'] ?? 0) >= self::MIN_CONFIDENCE);

        // Sort by confidence score descending
        usort($filtered, fn ($a, $b) => ($b['confidence_score'] ?? 0) - ($a['confidence_score'] ?? 0));

        // Build candidate payloads
        $candidates = array_values(array_map(fn ($r) => $this->buildCandidatePayload($r, $lead), $filtered));

        return [
            'success' => true,
            'candidates' => $candidates,
            'queries' => $queries,
            'message' => empty($candidates)
                ? 'Deep search did not find any high-confidence contact candidates.'
                : count($candidates).' contact candidate(s) discovered via deep search.',
        ];
    }

    /**
     * Build 3 search queries for a lead.
     */
    private function buildQueries(string $companyName, ?string $domain): array
    {
        $escapedName = addcslashes($companyName, '"');
        $queries = [];

        // Query 1: LinkedIn profile search (simple company match)
        $queries[] = "site:linkedin.com/in \"{$escapedName}\"";

        // Query 2: Company contact/team page
        if ($domain) {
            $queries[] = "\"{$escapedName}\" {$domain} contact team";
        }

        // Query 3: Email pattern discovery
        if ($domain) {
            $queries[] = "\"{$escapedName}\" \"@{$domain}\" email";
        }

        return $queries;
    }

    /**
     * Scrape Yahoo.com search results directly.
     */
    private function scrapeYahoo(string $query): ?string
    {
        $cacheKey = 'yahoo_scrape_'.hash('sha256', $query);
        $cached = Cache::get($cacheKey);
        if ($cached !== null) {
            return $cached;
        }

        try {
            $response = Http::withHeaders([
                'User-Agent' => self::USER_AGENTS[array_rand(self::USER_AGENTS)],
                'Accept' => 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language' => 'en-US,en;q=0.9,id;q=0.8',
                'Accept-Encoding' => 'gzip, deflate',
                'Referer' => 'https://search.yahoo.com/',
            ])
                ->timeout(15)
                ->get('https://search.yahoo.com/search', [
                    'p' => $query,
                ]);

            if (! $response->successful()) {
                Log::warning("[DeepSearch] Yahoo scrape failed for query: {$query}", [
                    'status' => $response->status(),
                ]);

                return null;
            }

            $html = $response->body();

            Cache::put($cacheKey, $html, now()->addDays(self::CACHE_TTL_DAYS));

            return $html;
        } catch (\Throwable $e) {
            Log::error("[DeepSearch] Yahoo scrape exception: {$e->getMessage()}", [
                'query' => $query,
            ]);

            return null;
        }
    }

    /**
     * Parse Yahoo search result HTML into structured data.
     */
    private function parseYahooHtml(string $html, string $query): array
    {
        $results = [];

        // Extract search result blocks from Yahoo structure (each item is inside <li>...</li>)
        preg_match_all('/<li[^>]*>(.*?)<\/li>/s', $html, $matches);

        foreach ($matches[1] as $block) {
            // Find redirection URL inside the block
            if (! preg_match('/href=["\'](https:\/\/r\.search\.yahoo\.com\/[^\"]+)["\']/', $block, $hrefMatch)) {
                continue;
            }

            $url = $hrefMatch[1];
            // Extract the RU parameter (target URL) from Yahoo's redirect link
            if (! preg_match('/RU=([^&|\/]+)/', $url, $ruMatch)) {
                continue;
            }

            $decodedUrl = urldecode($ruMatch[1]);
            if (! str_contains($decodedUrl, 'linkedin.com/in')) {
                continue;
            }

            // Extract the LinkedIn ID
            $path = parse_url($decodedUrl, PHP_URL_PATH) ?: '';
            if (! preg_match('#^/in/([A-Za-z0-9._%-]+)/?$#', $path, $idMatch)) {
                continue;
            }
            $linkedinId = strtolower($idMatch[1]);

            // Extract Title
            $title = '';
            if (preg_match('/<h3[^>]*>.*?<span[^>]*>(.*?)<\/span>.*?<\/h3>/s', $block, $titleMatch)) {
                $title = html_entity_decode(strip_tags($titleMatch[1]), ENT_QUOTES, 'UTF-8');
            }

            $parsed = $this->parseLinkedinTitle($title);
            if ($parsed['name'] === '') {
                continue;
            }

            // Extract Snippet
            $snippet = '';
            if (preg_match('/<div class="[^"]*compText[^"]*"><p[^>]*>(.*?)<\/p>/s', $block, $snippetMatch)) {
                $snippet = html_entity_decode(strip_tags($snippetMatch[1]), ENT_QUOTES, 'UTF-8');
            }

            $snippet = preg_replace('/\s+/', ' ', $snippet) ?? $snippet;
            $snippetEmails = $this->extractEmailsFromText($snippet);

            $results[] = [
                'name' => $parsed['name'],
                'title' => $parsed['title'],
                'linkedin_url' => 'https://www.linkedin.com/in/' . $linkedinId,
                'linkedin_id' => $linkedinId,
                'snippet' => trim($snippet),
                'snippet_emails' => $snippetEmails,
                'source_query' => $query,
                'source_type' => 'linkedin',
            ];
        }

        return $results;
    }

    /**
     * Extract text context around a URL in HTML for title parsing.
     */
    private function extractTitleContext(string $html, string $url): string
    {
        $escapedUrl = preg_quote($url, '#');

        // Try to find the <h3> or <a> tag containing this URL
        if (preg_match('#<h3[^>]*>([^<]+)</h3>#i', $html, $h3Match, 0, max(0, strpos($html, $url) - 500 ?: 0))) {
            // Check if this h3 is near our URL (within ~500 chars)
            $h3Pos = strpos($html, $h3Match[0]);
            $urlPos = strpos($html, $url);
            if ($h3Pos !== false && $urlPos !== false && abs($h3Pos - $urlPos) < 1000) {
                return html_entity_decode(strip_tags($h3Match[1]), ENT_QUOTES, 'UTF-8');
            }
        }

        // Fallback: find <a> tag with this URL and extract its text
        if (preg_match('#<a[^>]*href=["\']'.$escapedUrl.'["\'][^>]*>(.*?)</a>#si', $html, $aMatch)) {
            return html_entity_decode(strip_tags($aMatch[1]), ENT_QUOTES, 'UTF-8');
        }

        return '';
    }

    /**
     * Extract snippet text near a URL.
     */
    private function extractSnippetNear(string $html, string $url): string
    {
        $pos = strpos($html, $url);
        if ($pos === false) {
            return '';
        }

        // Take a window around the URL
        $start = max(0, $pos - 200);
        $end = min(strlen($html), $pos + strlen($url) + 500);
        $window = substr($html, $start, $end - $start);

        // Strip HTML and normalize whitespace
        $text = html_entity_decode(strip_tags($window), ENT_QUOTES, 'UTF-8');
        $text = preg_replace('/\s+/', ' ', $text) ?? $text;

        return Str::limit(trim($text), 500, '');
    }

    /**
     * Parse a LinkedIn-style title: "Name - Title - Company | LinkedIn"
     *
     * @return array{name: string, title: string|null}
     */
    private function parseLinkedinTitle(string $title): array
    {
        $clean = trim(preg_replace('/\s+/', ' ', $title) ?? '');
        $clean = preg_replace('/\s*[-|]\s*LinkedIn\s*$/i', '', $clean) ?? $clean;
        $clean = preg_replace('/\s*\|\s*LinkedIn.*$/i', '', $clean) ?? $clean;

        $parts = array_values(array_filter(array_map('trim', preg_split('/\s+-\s+/', $clean) ?: [])));
        $name = $parts[0] ?? $clean;
        $jobTitle = $parts[1] ?? null;

        if ($jobTitle && preg_match('/\b(profile|profil|professional|profesional)\b/i', $jobTitle)) {
            $jobTitle = null;
        }

        if (preg_match('/\b(profile|profiles|people|linkedin|search)\b/i', $name)) {
            return ['name' => '', 'title' => null];
        }

        return [
            'name' => Str::limit(trim($name), 120, ''),
            'title' => $jobTitle ? Str::limit(trim($jobTitle), 160, '') : null,
        ];
    }

    /**
     * Extract email addresses from text.
     */
    private function extractEmailsFromText(string $text): array
    {
        $stripped = html_entity_decode(strip_tags($text), ENT_QUOTES, 'UTF-8');
        preg_match_all('/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/', $stripped, $matches);

        // Filter out common false positives
        $exclude = ['example.com', 'email.com', 'domain.com', 'company.com', 'test.com', 'mail.com', 'sentry.io'];
        $emails = array_filter($matches[0] ?? [], function ($email) use ($exclude) {
            $domain = strtolower(explode('@', $email)[1] ?? '');

            return ! in_array($domain, $exclude, true)
                && ! str_starts_with($email, 'noreply')
                && ! str_starts_with($email, 'no-reply')
                && ! str_starts_with($email, 'info@')
                && ! str_starts_with($email, 'support@');
        });

        return array_values(array_unique($emails));
    }

    /**
     * Try to find a person name near an email mention in HTML.
     *
     * @return array{name: string, title: string|null, context: string}|null
     */
    private function extractNameNearEmail(string $html, string $email): ?array
    {
        $pos = strpos($html, $email);
        if ($pos === false) {
            return null;
        }

        $start = max(0, $pos - 300);
        $window = substr($html, $start, 600);
        $text = html_entity_decode(strip_tags($window), ENT_QUOTES, 'UTF-8');
        $text = preg_replace('/\s+/', ' ', $text) ?? $text;

        // Try to detect a capitalized name pattern near the email
        if (preg_match('/([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/', $text, $nameMatch)) {
            $name = trim($nameMatch[1]);
            // Simple sanity check — name should be 2-4 words
            $wordCount = count(explode(' ', $name));
            if ($wordCount >= 2 && $wordCount <= 4 && strlen($name) > 4) {
                return [
                    'name' => $name,
                    'title' => null,
                    'context' => Str::limit($text, 300, ''),
                ];
            }
        }

        return null;
    }

    /**
     * Deduplicate results by LinkedIn ID or name.
     */
    private function deduplicateResults(array $results): array
    {
        $seen = [];
        $deduped = [];

        foreach ($results as $result) {
            $key = $result['linkedin_id'] ?? Str::slug($result['name'] ?? '', '_');
            if ($key === '' || isset($seen[$key])) {
                // If already seen, merge snippet_emails
                if (isset($seen[$key]) && ! empty($result['snippet_emails'])) {
                    $idx = $seen[$key];
                    $deduped[$idx]['snippet_emails'] = array_values(array_unique(
                        array_merge($deduped[$idx]['snippet_emails'] ?? [], $result['snippet_emails'])
                    ));
                }

                continue;
            }

            $seen[$key] = count($deduped);
            $deduped[] = $result;
        }

        return $deduped;
    }

    /**
     * Classify a job title into department and seniority level.
     *
     * @return array{department: string, seniority_level: string}
     */
    private function classifyTitle(string $title): array
    {
        $lower = strtolower($title);

        // Seniority classification
        $seniority = 'staff';
        if (preg_match('/\b(CEO|CTO|CFO|COO|CMO|CIO|CISO|CDO|CPO|founder|co-founder|president|vice president|VP)\b/i', $title)) {
            $seniority = 'c_level';
        } elseif (preg_match('/\b(director|head of|VP of|senior vice|SVP|EVP|managing director|direktur)\b/i', $title)) {
            $seniority = 'director';
        } elseif (preg_match('/\b(manager|lead|team lead|supervisor|coordinator|kepala|manajer|assistant manager)\b/i', $title)) {
            $seniority = 'manager';
        }

        // Department classification
        $department = 'Other';
        if (preg_match('/\b(financ|accounting|treasury|keuangan|akuntan|controller)\b/i', $title)) {
            $department = 'Finance';
        } elseif (preg_match('/\b(IT|tech|engineer|developer|software|programmer|devops|infrastructure|sistem informasi|teknologi)\b/i', $title)) {
            $department = 'IT';
        } elseif (preg_match('/\b(sales|business development|BD|account executive|penjualan|commercial)\b/i', $title)) {
            $department = 'Sales';
        } elseif (preg_match('/\b(marketing|brand|digital|communications|pemasaran|content)\b/i', $title)) {
            $department = 'Marketing';
        } elseif (preg_match('/\b(HR|human resource|talent|people|rekrutmen|SDM|personalia)\b/i', $title)) {
            $department = 'HR';
        } elseif (preg_match('/\b(operations?|supply chain|logistics|procurement|purchasing|operasional|pengadaan|logistik)\b/i', $title)) {
            $department = 'Operations';
        } elseif (preg_match('/\b(legal|compliance|hukum|regulatory)\b/i', $title)) {
            $department = 'Legal';
        } elseif (preg_match('/\b(general manager|GM|managing|executive|direksi|direktur utama)\b/i', $title)) {
            $department = 'Executive';
        } elseif (preg_match('/\b(product|project|program|PMO)\b/i', $title)) {
            $department = 'Product';
        } elseif (preg_match('/\b(customer|CX|CS|support|layanan)\b/i', $title)) {
            $department = 'Customer Service';
        }

        return ['department' => $department, 'seniority_level' => $seniority];
    }

    /**
     * Calculate confidence score for a candidate.
     */
    private function calculateConfidence(array $result, Lead $lead): int
    {
        $score = 0;

        // Company name appears in snippet/title (normalized)
        $companyName = (string) $lead->company_name;
        $snippet = strtolower((string) ($result['snippet'] ?? '') . ' ' . ($result['title'] ?? ''));

        // Normalize company name (remove PT, CV, Tbk, Indonesia, Ltd, Inc, dots, commas)
        $normalizedCompany = strtolower(trim(preg_replace('/\b(PT|CV|Tbk|Indonesia|Ltd|Inc|Group|Co|Corporation|Persero)\b/i', '', $companyName)));
        $normalizedCompany = trim(preg_replace('/[^a-z0-9]/', ' ', $normalizedCompany));
        $normalizedCompany = preg_replace('/\s+/', ' ', $normalizedCompany) ?? $normalizedCompany;

        if ($normalizedCompany !== '' && str_contains($snippet, $normalizedCompany)) {
            $score += 20;
        }

        // Company domain matches
        $domain = strtolower((string) ($lead->website_domain ?: parse_url((string) $lead->website, PHP_URL_HOST)));
        if ($domain !== '' && str_contains($snippet, $domain)) {
            $score += 15;
        }

        // LinkedIn profile URL found
        if (! empty($result['linkedin_url'])) {
            $score += 15;
        }

        // Title/role extracted
        if (! empty($result['title'])) {
            $score += 10;
        }

        // Email domain MX verified
        if (! empty($result['email_verified'])) {
            $score += 15;
        }

        // Email found in snippet (not inferred)
        if (! empty($result['snippet_emails'])) {
            $score += 10;
        }

        // Multiple evidence sources (linkedin + email + snippet)
        $evidenceSources = 0;
        if (! empty($result['linkedin_url'])) {
            $evidenceSources++;
        }
        if (! empty($result['email'])) {
            $evidenceSources++;
        }
        if (! empty($result['title'])) {
            $evidenceSources++;
        }
        if ($evidenceSources >= 3) {
            $score += 15;
        }

        return min(100, $score);
    }

    /**
     * Build the final candidate payload for storage.
     */
    private function buildCandidatePayload(array $result, Lead $lead): array
    {
        $linkedinUrl = $result['linkedin_url'] ?? null;
        $providerId = $linkedinUrl
            ? hash('sha256', strtolower($linkedinUrl))
            : hash('sha256', strtolower(($result['name'] ?? '').($result['email'] ?? '')));

        $domain = $lead->website_domain ?: parse_url((string) $lead->website, PHP_URL_HOST);

        return [
            'provider_candidate_id' => $providerId,
            'name' => $result['name'] ?? null,
            'title' => $result['title'] ?? null,
            'company_name' => $lead->company_name,
            'company_domain' => $domain,
            'email' => $result['email'] ?? null,
            'phone' => null, // Phone handled by Lusha
            'email_verified' => $result['email_verified'] ?? false,
            'email_source' => $result['email_source'] ?? 'inferred',
            'department' => $result['department'] ?? null,
            'seniority_level' => $result['seniority_level'] ?? null,
            'linkedin_url' => $linkedinUrl,
            'linkedin_id' => $result['linkedin_id'] ?? null,
            'confidence_score' => $result['confidence_score'] ?? 0,
            'relevance_reason' => $this->buildRelevanceReason($result),
            'evidence' => $result['snippet'] ?? null,
            'search_depth' => 'deep',
            'validation_log' => $result['validation_log'] ?? [],
            'inferred_emails' => $result['inferred_emails'] ?? [],
            'raw_preview' => [
                'linkedin_url' => $linkedinUrl,
                'linkedin_id' => $result['linkedin_id'] ?? null,
                'confidence_score' => $result['confidence_score'] ?? 0,
                'relevance_reason' => $this->buildRelevanceReason($result),
                'evidence' => $result['snippet'] ?? null,
            ],
        ];
    }

    /**
     * Build a human-readable relevance reason for a candidate.
     */
    private function buildRelevanceReason(array $result): string
    {
        $reasons = [];

        if (! empty($result['linkedin_url'])) {
            $reasons[] = 'LinkedIn profile found';
        }
        if (! empty($result['email'])) {
            $reasons[] = $result['email_verified'] ? 'Email domain MX verified' : 'Email inferred (unverified)';
        }
        if (! empty($result['title'])) {
            $reasons[] = 'Role/title extracted';
        }
        if (! empty($result['department']) && $result['department'] !== 'Other') {
            $reasons[] = "Department: {$result['department']}";
        }
        if (! empty($result['seniority_level']) && $result['seniority_level'] !== 'staff') {
            $seniority = str_replace('_', '-', ucfirst($result['seniority_level']));
            $reasons[] = "Seniority: {$seniority}";
        }

        return empty($reasons) ? 'Discovered via Google deep search.' : implode('. ', $reasons).'.';
    }

    /**
     * Extract domain from snippet emails for MX batch validation.
     */
    private function extractDomainFromEmails(array $result): ?string
    {
        $emails = $result['snippet_emails'] ?? [];
        if (empty($emails)) {
            return null;
        }

        $parts = explode('@', $emails[0]);

        return $parts[1] ?? null;
    }
}
