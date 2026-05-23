<?php

namespace App\Http\Middleware;

use App\Services\AuditService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * RBAC Permission Middleware — BRD §5.1
 *
 * Usage in routes:
 *   ->middleware('permission:leads.view')
 *   ->middleware('permission:leads.create,leads.edit')  // any of
 */
class CheckPermission
{
    public function handle(Request $request, Closure $next, string ...$permissions): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'success' => false,
                'data' => null,
                'meta' => [],
                'error' => [
                    'code' => 'UNAUTHENTICATED',
                    'message' => 'Unauthenticated',
                ],
                'message' => 'Unauthenticated',
            ], 401);
        }

        // Super admins bypass
        if ($user->isSuperAdmin()) {
            return $next($request);
        }

        // Check if user has ANY of the required permissions
        foreach ($permissions as $permission) {
            if ($user->hasPermission($permission)) {
                return $next($request);
            }
        }

        // Parse module from the first segment of the route path
        $module = explode('/', $request->path())[1] ?? 'system';
        AuditService::logAccessDenied($module, $permissions);

        return response()->json([
            'success' => false,
            'data' => null,
            'meta' => [],
            'error' => [
                'code' => 'FORBIDDEN',
                'message' => 'Forbidden: insufficient permissions',
                'details' => [
                    'required' => $permissions,
                ],
            ],
            'message' => 'Forbidden: insufficient permissions',
            'required' => $permissions,
        ], 403);
    }
}
