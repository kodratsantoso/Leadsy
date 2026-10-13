<?php

namespace App\Services\Search\Contracts;

/**
 * One web search backend (Google CSE, Tavily, Brave, Serper, ...).
 *
 * Every adapter returns the same shape so the research layer never needs to know which
 * one answered — and so any AI provider downstream gets the same kind of material.
 */
interface WebSearchProvider
{
    /** Stable identifier used in WEB_RESEARCH_PROVIDER_ORDER, e.g. "tavily". */
    public function key(): string;

    /** Human-readable name shown in the profiling panel. */
    public function label(): string;

    /** True when the credentials this adapter needs are present. */
    public function isConfigured(?int $tenantId = null): bool;

    /**
     * @return array{success: bool, results: list<array{title: string, link: string, snippet: string}>, error?: string}
     */
    public function search(string $query, ?int $tenantId = null, int $limit = 5): array;
}
