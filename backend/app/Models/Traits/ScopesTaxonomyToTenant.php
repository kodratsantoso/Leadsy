<?php

namespace App\Models\Traits;

use App\Models\Tenant;
use App\Support\TenantContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

trait ScopesTaxonomyToTenant
{
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public static function resolveActiveTenantId(?int $explicitTenantId = null): ?int
    {
        if ($explicitTenantId !== null && $explicitTenantId > 0) {
            return $explicitTenantId;
        }

        if (TenantContext::hasTenant()) {
            return TenantContext::getTenantId();
        }

        $authUser = auth()->user();
        if ($authUser && ! empty($authUser->tenant_id)) {
            return (int) $authUser->tenant_id;
        }

        return null;
    }

    /**
     * Checks whether the given tenant has provisioned its own isolated taxonomy rows in this table.
     */
    public static function hasIsolatedTenantTaxonomy(?int $tenantId = null): bool
    {
        $resolved = static::resolveActiveTenantId($tenantId);
        if (! $resolved) {
            return false;
        }

        return static::withoutGlobalScopes()
            ->where('tenant_id', $resolved)
            ->exists();
    }

    /**
     * Returns the tenant's isolated taxonomy if provisioned, otherwise falls back cleanly
     * to the shared global default taxonomy (tenant_id IS NULL).
     */
    public function scopeForTenantOrDefault(Builder $query, ?int $tenantId = null): Builder
    {
        $resolved = static::resolveActiveTenantId($tenantId);

        if ($resolved && static::hasIsolatedTenantTaxonomy($resolved)) {
            return $query->where($this->getTable().'.tenant_id', $resolved);
        }

        return $query->whereNull($this->getTable().'.tenant_id');
    }

    /**
     * Determines the tenant_id to write when creating a new record from UI/API:
     * - If the tenant already uses an isolated taxonomy, keep writing to that tenant_id.
     * - Otherwise keep writing to null (shared global default) unless isolation is explicitly requested.
     */
    public static function resolveWriteTenantId(?int $tenantId = null, bool $forceIsolate = false): ?int
    {
        $resolved = static::resolveActiveTenantId($tenantId);
        if (! $resolved) {
            return null;
        }

        if ($forceIsolate || static::hasIsolatedTenantTaxonomy($resolved)) {
            return $resolved;
        }

        return null;
    }
}

