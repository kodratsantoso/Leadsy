<?php

namespace App\Services\Search;

/**
 * Resolves a hostname to IPv4 addresses.
 *
 * Its own class so CompanyPageFetcher's SSRF check can be exercised in tests without
 * real DNS lookups.
 */
class HostResolver
{
    /** @return list<string> */
    public function resolve(string $host): array
    {
        if (filter_var($host, FILTER_VALIDATE_IP)) {
            return [$host];
        }

        $ips = @gethostbynamel($host);

        return is_array($ips) ? array_values($ips) : [];
    }
}
