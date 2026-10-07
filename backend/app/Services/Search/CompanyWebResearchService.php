<?php

namespace App\Services\Search;

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
 */
class CompanyWebResearchService
{
    public function __construct(private readonly GoogleCustomSearchClient $search) {}

    /**
     * @return array{available: bool, findings: string, sources: list<string>, reason?: string}
     */
    public function research(string $companyName, ?int $tenantId = null): array
    {
        $companyName = trim($companyName);

        if ($companyName === '') {
            return ['available' => false, 'findings' => '', 'sources' => [], 'reason' => 'No company name given.'];
        }

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
        $anySucceeded = false;
        $lastError = null;

        foreach ($queries as $label => $query) {
            $result = $this->search->search($query, $tenantId, 4);

            if (! ($result['success'] ?? false)) {
                $lastError = $result['error'] ?? 'Search failed.';

                continue;
            }

            $anySucceeded = true;

            if ($result['results'] === []) {
                continue;
            }

            $lines = [];
            foreach ($result['results'] as $item) {
                $snippet = Str::of($item['snippet'])->squish()->limit(320, '')->toString();
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

        return [
            'available' => true,
            'findings' => implode("\n\n", $sections),
            'sources' => array_values(array_unique($sources)),
        ];
    }
}
