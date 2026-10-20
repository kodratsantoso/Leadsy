<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Lead;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class PlatformAdminController extends Controller
{
    /**
     * Get SaaS Platform aggregated overview metrics.
     */
    public function metrics(): JsonResponse
    {
        return TenantContext::withoutTenantScope(function () {
            $totalTenants = Tenant::count();
            $activeTenants = Tenant::where('status', 'active')->count();
            $trialTenants = Tenant::where('status', 'trial')->count();
            $suspendedTenants = Tenant::where('status', 'suspended')->count();

            $totalUsers = User::count();
            $activeUsers = User::where('is_active', true)->count();

            $totalLeads = Lead::count();
            $totalPipelineValue = (float) Lead::sum('estimated_closing_amount');

            // Tier distribution from tenant metadata
            $tenants = Tenant::select('id', 'name', 'status', 'metadata', 'created_at')->get();
            $tierDistribution = [
                'enterprise' => 0,
                'pro' => 0,
                'starter' => 0,
                'trial' => 0,
            ];

            foreach ($tenants as $t) {
                $plan = $t->metadata['plan'] ?? ($t->status === 'trial' ? 'trial' : 'enterprise');
                if (isset($tierDistribution[$plan])) {
                    $tierDistribution[$plan]++;
                } else {
                    $tierDistribution['starter']++;
                }
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'tenants' => [
                        'total' => $totalTenants,
                        'active' => $activeTenants,
                        'trial' => $trialTenants,
                        'suspended' => $suspendedTenants,
                    ],
                    'users' => [
                        'total' => $totalUsers,
                        'active' => $activeUsers,
                    ],
                    'leads' => [
                        'total' => $totalLeads,
                        'pipeline_value' => $totalPipelineValue,
                    ],
                    'tiers' => $tierDistribution,
                    'system_health' => [
                        'status' => 'operational',
                        'cluster' => 'K3s 3-Node Enterprise Cluster',
                        'database' => 'PostgreSQL PV Persisted (SSOT)',
                        'timestamp' => now()->toIso8601String(),
                    ],
                ],
            ]);
        });
    }

    /**
     * List all tenants with usage statistics and pagination.
     */
    public function indexTenants(Request $request): JsonResponse
    {
        return TenantContext::withoutTenantScope(function () use ($request) {
            $query = Tenant::query()->withCount(['users', 'leads']);

            if ($request->filled('search')) {
                $search = $request->input('search');
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'ilike', "%{$search}%")
                      ->orWhere('slug', 'ilike', "%{$search}%")
                      ->orWhere('legal_name', 'ilike', "%{$search}%");
                });
            }

            if ($request->filled('status')) {
                $query->where('status', $request->input('status'));
            }

            $perPage = min((int) $request->input('per_page', 15), 100);
            $paginator = $query->orderBy('id', 'asc')->paginate($perPage);

            // Enrich with plan metadata and primary admin
            $enriched = $paginator->getCollection()->map(function (Tenant $tenant) {
                $primaryAdmin = User::withoutGlobalScopes()
                    ->where('tenant_id', $tenant->id)
                    ->orderBy('id', 'asc')
                    ->first(['id', 'name', 'email']);

                $meta = $tenant->metadata ?? [];

                return [
                    'id' => $tenant->id,
                    'name' => $tenant->name,
                    'slug' => $tenant->slug,
                    'legal_name' => $tenant->legal_name,
                    'brand_name' => $tenant->brand_name,
                    'status' => $tenant->status,
                    'logo_path' => $tenant->logo_path,
                    'plan' => $meta['plan'] ?? ($tenant->status === 'trial' ? 'trial' : 'enterprise'),
                    'max_users' => $meta['max_users'] ?? 25,
                    'max_leads' => $meta['max_leads'] ?? 10000,
                    'storage_limit_gb' => $meta['storage_limit_gb'] ?? 50,
                    'features' => $meta['features'] ?? ['ai_profiling' => true, 'whatsapp_crm' => true, 'map_territory' => true],
                    'users_count' => $tenant->users_count,
                    'leads_count' => $tenant->leads_count,
                    'admin' => $primaryAdmin ? [
                        'id' => $primaryAdmin->id,
                        'name' => $primaryAdmin->name,
                        'email' => $primaryAdmin->email,
                    ] : null,
                    'created_at' => $tenant->created_at?->toIso8601String(),
                    'updated_at' => $tenant->updated_at?->toIso8601String(),
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $enriched,
                'pagination' => [
                    'total' => $paginator->total(),
                    'current_page' => $paginator->currentPage(),
                    'last_page' => $paginator->lastPage(),
                    'per_page' => $paginator->perPage(),
                ],
            ]);
        });
    }

    /**
     * Provision a new Tenant organization with initial Workspace Admin user.
     */
    public function storeTenant(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'required|string|max:64|alpha_dash|unique:tenants,slug',
            'legal_name' => 'nullable|string|max:255',
            'brand_name' => 'nullable|string|max:255',
            'plan' => 'required|string|in:starter,pro,enterprise,trial',
            'max_users' => 'nullable|integer|min:1|max:10000',
            'max_leads' => 'nullable|integer|min:100|max:1000000',
            'storage_limit_gb' => 'nullable|integer|min:5|max:1000',
            'features' => 'nullable|array',
            'admin_name' => 'required|string|max:255',
            'admin_email' => 'required|email|max:255|unique:users,email',
            'admin_password' => 'required|string|min:8',
        ]);

        return DB::transaction(function () use ($validated, $request) {
            $metadata = [
                'plan' => $validated['plan'],
                'max_users' => $validated['max_users'] ?? match($validated['plan']) {
                    'starter' => 5,
                    'pro' => 20,
                    'enterprise' => 100,
                    'trial' => 3,
                },
                'max_leads' => $validated['max_leads'] ?? match($validated['plan']) {
                    'starter' => 1000,
                    'pro' => 10000,
                    'enterprise' => 500000,
                    'trial' => 500,
                },
                'storage_limit_gb' => $validated['storage_limit_gb'] ?? match($validated['plan']) {
                    'starter' => 10,
                    'pro' => 50,
                    'enterprise' => 500,
                    'trial' => 5,
                },
                'features' => $validated['features'] ?? [
                    'ai_profiling' => true,
                    'whatsapp_crm' => true,
                    'map_territory' => true,
                    'lark_integration' => true,
                    'order_to_cash' => true,
                ],
                'provisioned_by_user_id' => $request->user()?->id,
                'provisioned_at' => now()->toIso8601String(),
            ];

            // 1. Create Tenant
            $tenant = Tenant::create([
                'name' => $validated['name'],
                'slug' => Str::slug($validated['slug']),
                'status' => $validated['plan'] === 'trial' ? 'trial' : 'active',
                'legal_name' => $validated['legal_name'] ?? $validated['name'],
                'brand_name' => $validated['brand_name'] ?? $validated['name'],
                'metadata' => $metadata,
            ]);

            // 2. Find admin role
            $adminRole = Role::where('name', 'admin')->first()
                ?? Role::where('name', 'super_admin')->first();

            // 3. Create initial workspace admin
            $adminUser = User::create([
                'tenant_id' => $tenant->id,
                'name' => $validated['admin_name'],
                'email' => $validated['admin_email'],
                'password' => Hash::make($validated['admin_password']),
                'role_id' => $adminRole?->id ?? 5,
                'is_active' => true,
            ]);

            // 4. Audit Log
            AuditLog::create([
                'tenant_id' => $tenant->id,
                'user_id' => $request->user()?->id,
                'action' => 'tenant.provisioned',
                'auditable_type' => Tenant::class,
                'auditable_id' => $tenant->id,
                'old_values' => null,
                'new_values' => [
                    'tenant_name' => $tenant->name,
                    'slug' => $tenant->slug,
                    'plan' => $validated['plan'],
                    'admin_email' => $adminUser->email,
                ],
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            return response()->json([
                'success' => true,
                'message' => "Tenant '{$tenant->name}' successfully provisioned.",
                'data' => [
                    'tenant' => $tenant,
                    'admin' => [
                        'id' => $adminUser->id,
                        'name' => $adminUser->name,
                        'email' => $adminUser->email,
                    ],
                ],
            ], 201);
        });
    }

    /**
     * Show single tenant details.
     */
    public function showTenant(int $id): JsonResponse
    {
        return TenantContext::withoutTenantScope(function () use ($id) {
            $tenant = Tenant::withCount(['users', 'leads', 'auditLogs'])->findOrFail($id);

            $users = User::withoutGlobalScopes()
                ->where('tenant_id', $tenant->id)
                ->with('role:id,name')
                ->get(['id', 'name', 'email', 'role_id', 'is_active', 'created_at']);

            return response()->json([
                'success' => true,
                'data' => [
                    'tenant' => $tenant,
                    'users' => $users,
                ],
            ]);
        });
    }

    /**
     * Update tenant metadata, status, or quotas.
     */
    public function updateTenant(Request $request, int $id): JsonResponse
    {
        return TenantContext::withoutTenantScope(function () use ($request, $id) {
            $tenant = Tenant::findOrFail($id);

            $validated = $request->validate([
                'name' => 'sometimes|string|max:255',
                'status' => 'sometimes|string|in:active,suspended,trial,cancelled',
                'legal_name' => 'nullable|string|max:255',
                'brand_name' => 'nullable|string|max:255',
                'address' => 'nullable|string',
                'tax_number' => 'nullable|string|max:50',
                'plan' => 'sometimes|string|in:starter,pro,enterprise,trial',
                'max_users' => 'nullable|integer|min:1',
                'max_leads' => 'nullable|integer|min:100',
                'storage_limit_gb' => 'nullable|integer|min:1',
                'features' => 'nullable|array',
            ]);

            $metadata = $tenant->metadata ?? [];

            if (isset($validated['plan'])) {
                $metadata['plan'] = $validated['plan'];
            }
            if (isset($validated['max_users'])) {
                $metadata['max_users'] = $validated['max_users'];
            }
            if (isset($validated['max_leads'])) {
                $metadata['max_leads'] = $validated['max_leads'];
            }
            if (isset($validated['storage_limit_gb'])) {
                $metadata['storage_limit_gb'] = $validated['storage_limit_gb'];
            }
            if (isset($validated['features'])) {
                $metadata['features'] = array_merge($metadata['features'] ?? [], $validated['features']);
            }

            $tenant->fill(collect($validated)->except(['plan', 'max_users', 'max_leads', 'storage_limit_gb', 'features'])->toArray());
            $tenant->metadata = $metadata;
            $tenant->save();

            AuditLog::create([
                'tenant_id' => $tenant->id,
                'user_id' => $request->user()?->id,
                'action' => 'tenant.updated',
                'auditable_type' => Tenant::class,
                'auditable_id' => $tenant->id,
                'old_values' => null,
                'new_values' => $validated,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Tenant updated successfully.',
                'data' => $tenant,
            ]);
        });
    }

    /**
     * Suspend or toggle tenant active status.
     */
    public function toggleStatus(Request $request, int $id): JsonResponse
    {
        return TenantContext::withoutTenantScope(function () use ($request, $id) {
            $tenant = Tenant::findOrFail($id);

            // Do not allow suspending the primary default workspace
            if ($tenant->id === 1 && $tenant->status === 'active') {
                return response()->json([
                    'error' => 'bad_request',
                    'message' => 'Default system workspace (#1) cannot be suspended.',
                ], 400);
            }

            $newStatus = $tenant->status === 'active' ? 'suspended' : 'active';
            $tenant->status = $newStatus;
            $tenant->save();

            AuditLog::create([
                'tenant_id' => $tenant->id,
                'user_id' => $request->user()?->id,
                'action' => 'tenant.status_changed',
                'auditable_type' => Tenant::class,
                'auditable_id' => $tenant->id,
                'old_values' => ['status' => $tenant->getOriginal('status')],
                'new_values' => ['status' => $newStatus],
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            return response()->json([
                'success' => true,
                'message' => "Tenant status updated to {$newStatus}.",
                'data' => $tenant,
            ]);
        });
    }

    /**
     * Generate an impersonation access token or scoped payload for Superadmin support.
     */
    public function impersonate(Request $request, int $id): JsonResponse
    {
        return TenantContext::withoutTenantScope(function () use ($request, $id) {
            $tenant = Tenant::findOrFail($id);
            $currentUser = $request->user();

            if (! $currentUser || ! $currentUser->isSuperAdmin()) {
                return response()->json(['error' => 'forbidden'], 403);
            }

            // Find primary admin of target tenant
            $targetUser = User::withoutGlobalScopes()
                ->where('tenant_id', $tenant->id)
                ->where('is_active', true)
                ->first();

            if (! $targetUser) {
                return response()->json([
                    'error' => 'not_found',
                    'message' => 'No active user found in this tenant to impersonate.',
                ], 404);
            }

            $token = $targetUser->createToken('superadmin-impersonation', ['*'])->plainTextToken;

            AuditLog::create([
                'tenant_id' => $tenant->id,
                'user_id' => $currentUser->id,
                'action' => 'tenant.impersonate_accessed',
                'auditable_type' => Tenant::class,
                'auditable_id' => $tenant->id,
                'old_values' => null,
                'new_values' => [
                    'superadmin_id' => $currentUser->id,
                    'target_user_id' => $targetUser->id,
                    'target_tenant' => $tenant->name,
                ],
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            return response()->json([
                'success' => true,
                'message' => "Impersonating {$tenant->name} as {$targetUser->name}",
                'data' => [
                    'token' => $token,
                    'user' => [
                        'id' => $targetUser->id,
                        'name' => $targetUser->name,
                        'email' => $targetUser->email,
                        'tenant_id' => $tenant->id,
                        'tenant_name' => $tenant->name,
                    ],
                ],
            ]);
        });
    }
}
