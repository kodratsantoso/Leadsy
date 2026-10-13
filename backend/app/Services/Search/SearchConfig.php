<?php

namespace App\Services\Search;

use App\Models\IntegrationConfig;

/**
 * Reads search-related integration settings, preferring an env override.
 *
 * Every search adapter needs the same lookup (env first, then a tenant row, then the
 * global row), so it lives here once instead of being copied into each client.
 */
class SearchConfig
{
    /** @param  list<string>  $keys  First non-empty value wins. */
    public function value(array $keys, ?int $tenantId = null): ?string
    {
        foreach ($keys as $key) {
            $value = env($key);
            if (is_string($value) && trim($value) !== '') {
                return trim($value);
            }

            $record = IntegrationConfig::query()
                ->where('key', $key)
                ->where('is_active', true)
                ->where(function ($query) use ($tenantId) {
                    $query->whereNull('tenant_id');
                    if ($tenantId !== null) {
                        $query->orWhere('tenant_id', $tenantId);
                    }
                })
                ->orderByRaw('tenant_id is null')
                ->latest()
                ->first();

            if (is_string($record?->value) && trim($record->value) !== '') {
                return trim($record->value);
            }
        }

        return null;
    }
}
