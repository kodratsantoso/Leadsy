<?php

namespace App\Http\Middleware;

use App\Support\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureSuperAdmin
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user() ?? auth('sanctum')->user();

        if (! $user || ! $user->isSuperAdmin()) {
            return response()->json([
                'error' => 'forbidden',
                'message' => 'Unauthorized. SaaS Platform Superadmin privileges required.',
            ], 403);
        }

        // Platform Superadmin panel requests bypass tenant scoping across the platform
        TenantContext::setBypass(true);

        return $next($request);
    }
}
