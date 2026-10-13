<?php

namespace App\Services\Search;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * Gathers real, sourced material about a company before the AI is asked anything.
 *
 * The profiler's prompt tells the model to consult the official website, Indonesian
 * registries and job platforms. It cannot: web search is wired only on the Gemini branch
 * of AiOrchestrationService, and routing sends these calls to BytePlus, where the
 * web_search flag is silently dropped. So the model answered from training data, which
 * for an Indonesian SME is close to empty — thin profiles, and worse, confident guesses.
 *
 * A handful of targeted queries costs a few hundred milliseconds each and gives the model
 * something real to organise. Facts come from the internet; the model only structures
 * them. That is the same split Leadsy already chose for contact discovery.
 *
 * Two additions make this provider-agnostic and much richer:
 *  - WebSearchManager tries Tavily / Google CSE / Serper / Brave in the admin's order,
 *    so one missing key or exhausted quota no longer empties the profile;
 *  - CompanyPageFetcher opens the company's own homepage, About and Contact pages.
 *    Snippets rarely carry the phone, email or founding year; those pages usually do.
 */
class CompanyWebResearchService
{
    /** Total research text handed to the model; keeps prompts inside every provider's window. */
    private const MAX_FINDINGS_CHARS = 16000;

    private const CACHE_DAYS = 7;

    /** Hosts that are never a company's own site, even when they rank first. */
    private const NON_OFFICIAL_HOSTS = [
        'linkedin.com', 'facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'youtube.com', 'tiktok.com',
        'wikipedia.org', 'google.com', 'goo.gl', 'maps.app.goo.gl', 'jobstreet.co.id', 'jobstreet.com', 'glints.com',
        'kalibrr.com', 'karir.com', 'indeed.com', 'loker.id', 'kontan.co.id', 'detik.com', 'kompas.com', 'cnbcindonesia.com',
        'bisnis.com', 'idx.co.id', 'ahu.go.id', 'kemendag.go.id', 'oss.go.id', 'tokopedia.com', 'shopee.co.id',
        'bukalapak.com', 'blibli.com', 'indonetwork.co.id', 'indotrading.com', 'dnb.com', 'zoominfo.com', 'crunchbase.com',
        'bloomberg.com', 'emis.com', 'companieshouse.id', 'opencorporates.com', 'yellowpages', 'medium.com', 'scribd.com',
    ];

    public function __construct(
        private readonly WebSearchManager $search,
        private readonly CompanyPageFetcher $pages,
    ) {}

    /**
     * @return array{available: bool, findings: string, sources: list<string>, reason?: string, providers?: list<string>, provider_labels?: list<string>, official_website?: ?string, pages_read?: int}
     */
    public function research(string $companyName, ?int $tenantId = null): array
    {
        $companyName = trim($companyName);

        if ($companyName === '') {
            return ['available' => false, 'findings' => '', 'sources' => [], 'reason' => 'No company name given.'];
        }

        $cacheKey = 'company_research:v2:'.($tenantId ?? 'global').':'.sha1(Str::lower($companyName));
        $cached = Cache::get($cacheKey);
        if (is_array($cached)) {
            return $cached;
        }

        $result = $this->runResearch($companyName, $tenantId);

        // Only successful research is cached: a failure is usually a missing key, and
        // caching it would keep reporting "unconfigured" for a week after it is fixed.
        if ($result['available']) {
            Cache::put($cacheKey, $result, now()->addDays(self::CACHE_DAYS));
        }

        return $result;
    }

    private function runResearch(string $companyName, ?int $tenantId): array
    {
        $quoted = '"'.$companyName.'"';

        // Each query targets a different kind of fact, because one generic search returns
        // ten variations of the same homepage and tells the model nothing extra.
        $queries = [
            'Profile' => $quoted.' perusahaan profil alamat kontak',
            'Official site' => $quoted.' (site:co.id OR site:com) about OR tentang',
            'Registry' => $quoted.' (AHU OR Kemendag OR "akta pendirian" OR NIB)',
            'People' => $quoted.' site:linkedin.com/company',
            'Headcount' => $quoted.' (jobstreet OR glints OR karir OR lowongan) karyawan',
        ];

        $sections = [];
        $sources = [];
        $allResults = [];
        $providersUsed = [];
        $tripped = [];
        $anySucceeded = false;
        $lastError = null;

        foreach ($queries as $label => $query) {
            $result = $this->search->search($query, $tenantId, 4, $tripped);
            $tripped = array_values(array_unique(array_merge($tripped, $result['failed'] ?? [])));

            if (! ($result['success'] ?? false)) {
                $lastError = $result['error'] ?? 'Search failed.';

                continue;
            }

            $anySucceeded = true;
            $providersUsed[] = $result['provider'];

            if ($result['results'] === []) {
                continue;
            }

            $lines = [];
            foreach ($result['results'] as $item) {
                $allResults[] = $item + ['query' => $label];
                $snippet = Str::of($item['snippet'])->squish()->limit(600, '')->toString();
                if ($snippet === '') {
                    continue;
                }
                $lines[] = "- {$snippet}\n  source: {$item['link']}";
                $sources[] = $item['link'];
            }

            if ($lines !== []) {
                $sections[] = "### {$label}\n".implode("\n", $lines);
            }
        }

        if (! $anySucceeded) {
            return ['available' => false, 'findings' => '', 'sources' => [], 'reason' => $lastError ?? 'Search unavailable.'];
        }

        if ($sections === []) {
            return ['available' => false, 'findings' => '', 'sources' => [], 'reason' => 'No public results found for this company name.'];
        }

        $officialSite = $this->guessOfficialSite($companyName, $allResults);
        $sitePages = $officialSite ? $this->pages->fetchCompanySite($officialSite) : [];

        $pageSections = [];
        foreach ($sitePages as $page) {
            $block = "### Official website page: {$page['url']}\n";
            if ($page['title'] !== '') {
                $block .= "Title: {$page['title']}\n";
            }
            if ($page['description'] !== '') {
                $block .= "Meta description: {$page['description']}\n";
            }
            if ($page['emails'] !== []) {
                $block .= 'Emails linked on page: '.implode(', ', $page['emails'])."\n";
            }
            if ($page['phones'] !== []) {
                $block .= 'Phone links on page: '.implode(', ', $page['phones'])."\n";
            }
            $block .= "Page text: {$page['text']}";

            $pageSections[] = $block;
            $sources[] = $page['url'];
        }

        // Official pages first: they are the most authoritative and the most likely to be
        // cut if the budget runs out last.
        $findings = Str::limit(implode("\n\n", array_merge($pageSections, $sections)), self::MAX_FINDINGS_CHARS, "\n[research truncated]");

        $providersUsed = array_values(array_unique(array_filter($providersUsed)));

        return [
            'available' => true,
            'findings' => $findings,
            'sources' => array_values(array_unique($sources)),
            'providers' => $providersUsed,
            'provider_labels' => array_map(fn ($key) => $this->search->label($key), $providersUsed),
            'official_website' => $officialSite,
            'pages_read' => count($sitePages),
        ];
    }

    /**
     * The first result whose host looks like the company's own domain.
     *
     * "Looks like" means: not a directory/social/news site, and the host contains a
     * distinctive word from the company name (legal suffixes like PT/Tbk/CV removed).
     *
     * @param  list<array{title: string, link: string, snippet: string, query: string}>  $results
     */
    public function guessOfficialSite(string $companyName, array $results): ?string
    {
        $tokens = collect(preg_split('/[^a-z0-9]+/', Str::lower($companyName)))
            ->reject(fn ($t) => in_array($t, ['pt', 'tbk', 'cv', 'persero', 'perseroan', 'terbatas', 'indonesia', 'group', 'the', 'and', 'dan', 'ud', 'koperasi'], true))
            ->filter(fn ($t) => strlen($t) >= 3)
            ->values()
            ->all();

        if ($tokens === []) {
            return null;
        }

        // Prefer results from the "Official site" query, then everything else.
        usort($results, fn ($a, $b) => ($b['query'] === 'Official site') <=> ($a['query'] === 'Official site'));

        foreach ($results as $item) {
            $host = Str::lower((string) parse_url($item['link'], PHP_URL_HOST));
            if ($host === '' || $this->isNonOfficialHost($host)) {
                continue;
            }

            $compactHost = str_replace(['-', '.'], '', $host);
            foreach ($tokens as $token) {
                if (str_contains($compactHost, $token)) {
                    $scheme = parse_url($item['link'], PHP_URL_SCHEME) ?: 'https';

                    return "{$scheme}://{$host}/";
                }
            }
        }

        return null;
    }

    private function isNonOfficialHost(string $host): bool
    {
        foreach (self::NON_OFFICIAL_HOSTS as $blocked) {
            if ($host === $blocked || str_ends_with($host, '.'.$blocked) || str_contains($host, $blocked)) {
                return true;
            }
        }

        return false;
    }
}
