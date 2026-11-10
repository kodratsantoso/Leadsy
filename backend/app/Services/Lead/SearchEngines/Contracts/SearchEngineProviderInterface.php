<?php

namespace App\Services\Lead\SearchEngines\Contracts;

use App\Models\Lead;

interface SearchEngineProviderInterface
{
    /**
     * Get the unique key/identifier for this search provider (e.g. 'serper', 'custom', 'google_cse', 'tavily', 'lusha').
     */
    public function getKey(): string;

    /**
     * Get the display name of this provider.
     */
    public function getName(): string;

    /**
     * Check if this provider is enabled and configured for the given tenant.
     */
    public function isConfigured(?int $tenantId = null): bool;

    /**
     * Execute search for decision makers / PIC contacts for the given lead.
     *
     * @return array{success: bool, candidates: array, queries: string[], error?: string}
     */
    public function search(Lead $lead, ?int $tenantId = null): array;

    /**
     * Perform a live connection/health test using provided or saved credentials.
     *
     * @param array<string, mixed> $credentials
     * @return array{success: bool, message: string, details?: mixed}
     */
    public function testConnection(array $credentials = [], ?int $tenantId = null): array;
}

