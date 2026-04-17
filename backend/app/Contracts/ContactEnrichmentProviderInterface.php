<?php

namespace App\Contracts;

interface ContactEnrichmentProviderInterface
{
    /**
     * Determine if this provider is enabled by configuration.
     */
    public function isEnabled(): bool;

    /**
     * Get the provider's unique identifier.
     */
    public function getIdentifier(): string;

    /**
     * Search for contacts given a company profile context.
     * Must return an array of standardized contact payloads.
     */
    public function searchContacts(string $companyName, ?string $domain): array;
}
