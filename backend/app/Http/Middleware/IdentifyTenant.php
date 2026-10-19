<?php

namespace App\Http\Middleware;

use App\Support\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class IdentifyTenant
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user() ?? auth('sanctum')->user();

        if ($user) {
            // Superadmins can optionally switch / inspect a tenant via header
            if ($user->isSuperAdmin() && $request->hasHeader('X-Tenant-ID')) {
                $requestedTenantId = (int) $request->header('X-Tenant-ID');
                TenantContext::setTenantId($requestedTenantId);
            } elseif ($user->tenant_id) {
                TenantContext::setTenantId((int) $user->tenant_id);
            }
        }

        return $next($request);
    }
}
