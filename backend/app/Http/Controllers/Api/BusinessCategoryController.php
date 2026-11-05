<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BusinessCategory;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class BusinessCategoryController extends Controller
{
    public function index(Request $request)
    {
        $tenantId = BusinessCategory::resolveActiveTenantId($request->user()?->tenant_id);
        $industryId = $request->filled('industry_id') ? $request->integer('industry_id') : null;

        $query = BusinessCategory::forTenantOrDefault($tenantId)
            ->with('industry:id,name');

        if ($industryId) {
            $query->where(function ($q) use ($industryId) {
                $q->where('industry_id', $industryId)
                    ->orWhereNull('industry_id');
            });
        }

        return response()->json([
            'data' => $query
                ->orderByRaw('CASE WHEN industry_id IS NOT NULL THEN 0 ELSE 1 END')
                ->orderBy('code')
                ->orderBy('name')
                ->get(),
            'meta' => [
                'is_tenant_isolated' => BusinessCategory::hasIsolatedTenantTaxonomy($tenantId),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $tenantId = BusinessCategory::resolveActiveTenantId($request->user()?->tenant_id);
        $writeTenantId = BusinessCategory::resolveWriteTenantId($tenantId, $request->boolean('isolate_tenant'));

        $validated = $request->validate([
            'industry_id' => 'nullable|integer|exists:industries,id',
            'code' => 'nullable|string|max:100',
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('business_categories', 'name')->where(fn ($q) => $writeTenantId
                    ? $q->where('tenant_id', $writeTenantId)
                    : $q->whereNull('tenant_id')),
            ],
            'channel_role' => ['nullable', 'string', Rule::in(BusinessCategory::CHANNEL_ROLES)],
            'description' => 'nullable|string',
            'synonyms' => 'nullable|array',
            'scoring_hints' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $validated['tenant_id'] = $writeTenantId;
        $validated['channel_role'] = $validated['channel_role'] ?? 'direct_b2b';
        $validated['is_active'] = $validated['is_active'] ?? true;

        $category = BusinessCategory::create($validated);

        return response()->json([
            'success' => true,
            'data' => $category->load('industry:id,name'),
        ], 201);
    }

    public function show(Request $request, BusinessCategory $businessCategory)
    {
        $this->authorizeTaxonomyRecord($request, $businessCategory->tenant_id);

        return response()->json([
            'data' => $businessCategory->load('industry:id,name'),
        ]);
    }

    public function update(Request $request, BusinessCategory $businessCategory)
    {
        $this->authorizeTaxonomyRecord($request, $businessCategory->tenant_id);

        $validated = $request->validate([
            'industry_id' => 'nullable|integer|exists:industries,id',
            'code' => 'nullable|string|max:100',
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('business_categories', 'name')
                    ->ignore($businessCategory->id)
                    ->where(fn ($q) => $businessCategory->tenant_id
                        ? $q->where('tenant_id', $businessCategory->tenant_id)
                        : $q->whereNull('tenant_id')),
            ],
            'channel_role' => ['nullable', 'string', Rule::in(BusinessCategory::CHANNEL_ROLES)],
            'description' => 'nullable|string',
            'synonyms' => 'nullable|array',
            'scoring_hints' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $businessCategory->update($validated);

        return response()->json([
            'success' => true,
            'data' => $businessCategory->load('industry:id,name'),
        ]);
    }

    public function destroy(Request $request, BusinessCategory $businessCategory)
    {
        $this->authorizeTaxonomyRecord($request, $businessCategory->tenant_id);

        $businessCategory->delete();

        return response()->json([
            'success' => true,
            'message' => 'Business Category deleted',
        ]);
    }

    private function authorizeTaxonomyRecord(Request $request, ?int $recordTenantId): void
    {
        $user = $request->user();
        if ($user && method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin()) {
            return;
        }

        $userTenantId = (int) ($user?->tenant_id ?? 0);
        if ($recordTenantId !== null && $recordTenantId !== $userTenantId) {
            abort(403, 'Unauthorized access to another tenant business category.');
        }
    }
}
