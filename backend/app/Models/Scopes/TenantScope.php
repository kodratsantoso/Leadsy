<?php

namespace App\Models\Scopes;

use App\Support\TenantContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

class TenantScope implements Scope
{
    /**
     * Apply the scope to a given Eloquent query builder.
     */
    public function apply(Builder $builder, Model $model): void
    {
        // If bypass is explicitly set (e.g. Platform Superadmin console or system jobs), do not scope
        if (TenantContext::isBypass()) {
            return;
        }

        $tenantId = TenantContext::getTenantId();

        // If a tenant context is active, strictly constrain queries to this tenant
        if ($tenantId !== null) {
            $builder->where($model->qualifyColumn('tenant_id'), '=', $tenantId);
        }
    }
}
