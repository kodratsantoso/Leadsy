<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Industry;
use App\Models\SubIndustry;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class IndustryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tenantId = Industry::resolveActiveTenantId($request->user()?->tenant_id);

        return response()->json([
            'data' => Industry::forTenantOrDefault($tenantId)
                ->with([
                    'subIndustries' => fn ($q) => $q->orderBy('name'),
                    'businessCategories' => fn ($q) => $q->orderBy('code')->orderBy('name'),
                ])
                ->orderBy('name')
                ->get(),
            'meta' => [
                'is_tenant_isolated' => Industry::hasIsolatedTenantTaxonomy($tenantId),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $tenantId = Industry::resolveActiveTenantId($request->user()?->tenant_id);
        $writeTenantId = Industry::resolveWriteTenantId($tenantId, $request->boolean('isolate_tenant'));

        $data = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('industries', 'name')->where(fn ($q) => $writeTenantId
                    ? $q->where('tenant_id', $writeTenantId)
                    : $q->whereNull('tenant_id')),
            ],
            'synonyms' => 'nullable|array',
            'scoring_hints' => 'nullable|string',
            'is_active' => 'nullable|boolean',
        ]);

        $data['tenant_id'] = $writeTenantId;
        $data['is_active'] = $data['is_active'] ?? true;

        $industry = Industry::create($data);
        AuditService::logCreated('industries', $industry);

        return response()->json(['data' => $industry->load('subIndustries')], 201);
    }

    public function update(Request $request, Industry $industry): JsonResponse
    {
        $this->authorizeTaxonomyRecord($request, $industry->tenant_id);

        $original = $industry->getAttributes();

        $data = $request->validate([
            'name' => [
                'sometimes',
                'string',
                'max:255',
                Rule::unique('industries', 'name')
                    ->ignore($industry->id)
                    ->where(fn ($q) => $industry->tenant_id
                        ? $q->where('tenant_id', $industry->tenant_id)
                        : $q->whereNull('tenant_id')),
            ],
            'synonyms' => 'nullable|array',
            'scoring_hints' => 'nullable|string',
            'is_active' => 'nullable|boolean',
        ]);

        $industry->update($data);
        AuditService::logUpdated('industries', $industry, $original);

        return response()->json(['data' => $industry->load('subIndustries')]);
    }

    public function destroy(Request $request, Industry $industry): JsonResponse
    {
        $this->authorizeTaxonomyRecord($request, $industry->tenant_id);

        AuditService::logDeleted('industries', $industry);
        $industry->delete();

        return response()->json(null, 204);
    }

    /* ── Sub-industries ── */

    public function storeSub(Request $request, Industry $industry): JsonResponse
    {
        $this->authorizeTaxonomyRecord($request, $industry->tenant_id);

        $data = $request->validate([
            'name' => 'required|string|max:255',
            'synonyms' => 'nullable|array',
            'scoring_hints' => 'nullable|string',
            'is_active' => 'nullable|boolean',
        ]);

        $data['tenant_id'] = $industry->tenant_id;
        $data['is_active'] = $data['is_active'] ?? true;

        $sub = $industry->subIndustries()->create($data);
        AuditService::logCreated('sub_industries', $sub);

        return response()->json(['data' => $sub], 201);
    }

    public function updateSub(Request $request, Industry $industry, SubIndustry $sub): JsonResponse
    {
        $this->authorizeTaxonomyRecord($request, $industry->tenant_id);

        $original = $sub->getAttributes();

        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'synonyms' => 'nullable|array',
            'scoring_hints' => 'nullable|string',
            'is_active' => 'nullable|boolean',
        ]);

        $sub->update($data);
        AuditService::logUpdated('sub_industries', $sub, $original);

        return response()->json(['data' => $sub]);
    }

    public function destroySub(Request $request, Industry $industry, SubIndustry $sub): JsonResponse
    {
        $this->authorizeTaxonomyRecord($request, $industry->tenant_id);

        AuditService::logDeleted('sub_industries', $sub);
        $sub->delete();

        return response()->json(null, 204);
    }

    private function authorizeTaxonomyRecord(Request $request, ?int $recordTenantId): void
    {
        $user = $request->user();
        if ($user && method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin()) {
            return;
        }

        $userTenantId = (int) ($user?->tenant_id ?? 0);
        if ($recordTenantId !== null && $recordTenantId !== $userTenantId) {
            abort(403, 'Unauthorized access to another tenant taxonomy record.');
        }
    }
}
