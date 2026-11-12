<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $currentUser = $request->user();
        $query = AuditLog::with('user.role')->orderBy('created_at', 'desc');

        // Multi-tenant scoping: Non-superadmins only see their tenant's audit logs
        if (! $currentUser->isSuperAdmin() || ! $request->boolean('all_tenants')) {
            $tenantId = $currentUser->isSuperAdmin() && $request->filled('tenant_id')
                ? (int) $request->tenant_id
                : (int) $currentUser->tenant_id;
            $query->where('tenant_id', $tenantId);
        }

        if ($request->filled('module') && $request->module !== 'all') {
            $query->where('module', $request->module);
        }
        if ($request->filled('action')) {
            $query->where('action', $request->action);
        }
        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }
        if ($request->filled('risk_level') && $request->risk_level !== 'all') {
            $query->where('risk_level', $request->risk_level);
        }
        if ($request->filled('event_category') && $request->event_category !== 'all') {
            $query->where('event_category', $request->event_category);
        }

        // Search query
        if ($request->filled('search')) {
            $search = trim($request->search);
            $query->where(function ($q) use ($search) {
                $q->where('action', 'ilike', "%{$search}%")
                    ->orWhere('actor_name', 'ilike', "%{$search}%")
                    ->orWhere('actor_email', 'ilike', "%{$search}%")
                    ->orWhere('ip_address', 'ilike', "%{$search}%")
                    ->orWhere('city', 'ilike', "%{$search}%")
                    ->orWhere('module', 'ilike', "%{$search}%");
            });
        }

        $dateFrom = $request->input('date_from', $request->input('from'));
        if ($dateFrom) {
            $query->where('created_at', '>=', $dateFrom . ' 00:00:00');
        }

        $dateTo = $request->input('date_to', $request->input('to'));
        if ($dateTo) {
            $query->where('created_at', '<=', $dateTo . ' 23:59:59');
        }

        $perPage = min(100, max(10, (int) $request->get('per_page', 50)));
        $paginated = $query->paginate($perPage);

        // Compute summary metrics for the current scope
        $statsQuery = clone $query;
        $totalCount = $paginated->total();
        
        $criticalCount = AuditLog::query()
            ->when(! $currentUser->isSuperAdmin() || ! $request->boolean('all_tenants'), function ($q) use ($currentUser, $request) {
                $tenantId = $currentUser->isSuperAdmin() && $request->filled('tenant_id')
                    ? (int) $request->tenant_id
                    : (int) $currentUser->tenant_id;
                $q->where('tenant_id', $tenantId);
            })
            ->whereIn('risk_level', ['critical', 'high'])
            ->count();

        $response = $paginated->toArray();
        $response['summary'] = [
            'total_events' => $totalCount,
            'high_risk_events' => $criticalCount,
            'scope' => $currentUser->isSuperAdmin() && $request->boolean('all_tenants') ? 'global' : 'tenant',
            'tenant_id' => $currentUser->tenant_id,
        ];

        return response()->json($response);
    }

    public function show(AuditLog $auditLog, Request $request): JsonResponse
    {
        $currentUser = $request->user();
        if (! $currentUser->isSuperAdmin() && $auditLog->tenant_id !== $currentUser->tenant_id) {
            abort(403, 'Unauthorized.');
        }

        return response()->json(['data' => $auditLog->load('user.role', 'tenant')]);
    }
}
