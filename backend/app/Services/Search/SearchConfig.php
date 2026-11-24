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

    /**
     * Check whether a provider toggle (e.g. SERPER_ENABLED, TAVILY_ENABLED) allows use.
     *
     * Returns $defaultWhenUnset (true) when the toggle has never been stored, or when one
     * of $credentialKeys is supplied directly via environment variable override.
     *
     * @param  list<string>  $enableKeys
     * @param  list<string>  $credentialKeys
     */
    public function isEnabled(array $enableKeys, ?int $tenantId = null, array $credentialKeys = [], bool $defaultWhenUnset = true): bool
    {
        foreach ($enableKeys as $enableKey) {
            $envToggle = env($enableKey);
            if ($envToggle !== null && $envToggle !== '') {
                return filter_var($envToggle, FILTER_VALIDATE_BOOLEAN);
            }
        }

        foreach ($credentialKeys as $credKey) {
            $envCred = env($credKey);
            if (is_string($envCred) && trim($envCred) !== '') {
                return true;
            }
        }

        foreach ($enableKeys as $enableKey) {
            $record = IntegrationConfig::query()
                ->where('key', $enableKey)
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

            if ($record !== null && $record->value !== null && $record->value !== '') {
                if (is_bool($record->value)) {
                    return $record->value;
                }

                return in_array(strtolower(trim((string) $record->value)), ['1', 'true', 'yes', 'on'], true);
            }
        }

        return $defaultWhenUnset;
    }
}
