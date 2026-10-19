<?php

namespace App\Support;

use App\Models\Tenant;

class TenantContext
{
    protected static ?int $tenantId = null;
    protected static ?Tenant $tenant = null;
    protected static bool $bypass = false;

    /**
     * Set the active tenant ID for the current request / process context.
     */
    public static function setTenantId(?int $tenantId): void
    {
        static::$tenantId = $tenantId;
        static::$tenant = null;
    }

    /**
     * Get the active tenant ID.
     */
    public static function getTenantId(): ?int
    {
        return static::$tenantId;
    }

    /**
     * Get the active Tenant model instance.
     */
    public static function getTenant(): ?Tenant
    {
        if (static::$tenant === null && static::$tenantId !== null) {
            static::$tenant = Tenant::find(static::$tenantId);
        }

        return static::$tenant;
    }

    /**
     * Check if a tenant context is actively resolved.
     */
    public static function hasTenant(): bool
    {
        return static::$tenantId !== null;
    }

    /**
     * Enable or disable SuperAdmin bypass for cross-tenant operations.
     */
    public static function setBypass(bool $bypass): void
    {
        static::$bypass = $bypass;
    }

    /**
     * Check if tenant isolation is bypassed (e.g. platform admin metrics).
     */
    public static function isBypass(): bool
    {
        return static::$bypass;
    }

    /**
     * Run a callback under a specific tenant context and restore prior state.
     *
     * @template T
     * @param int|null $tenantId
     * @param callable(): T $callback
     * @return T
     */
    public static function withTenant(?int $tenantId, callable $callback)
    {
        $previousTenantId = static::$tenantId;
        $previousBypass = static::$bypass;

        try {
            static::setTenantId($tenantId);
            return $callback();
        } finally {
            static::setTenantId($previousTenantId);
            static::setBypass($previousBypass);
        }
    }

    /**
     * Run a callback with tenant scope bypass enabled.
     *
     * @template T
     * @param callable(): T $callback
     * @return T
     */
    public static function withoutTenantScope(callable $callback)
    {
        $previousBypass = static::$bypass;

        try {
            static::setBypass(true);
            return $callback();
        } finally {
            static::setBypass($previousBypass);
        }
    }

    /**
     * Clear all context (useful in test teardown or worker daemon cycle).
     */
    public static function clear(): void
    {
        static::$tenantId = null;
        static::$tenant = null;
        static::$bypass = false;
    }
}
