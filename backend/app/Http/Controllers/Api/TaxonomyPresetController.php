<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AuditService;
use App\Services\Taxonomy\VerticalTaxonomyPresetService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaxonomyPresetController extends Controller
{
    public function __construct(
        private readonly VerticalTaxonomyPresetService $presetService,
    ) {}

    /**
     * GET /api/settings/taxonomy-presets
     */
    public function index(Request $request): JsonResponse
    {
        $tenantId = $this->resolveTargetTenantId($request);

        return response()->json([
            'success' => true,
            'data' => $this->presetService->listPresets($tenantId),
        ]);
    }

    /**
     * POST /api/settings/taxonomy-presets/apply
     */
    public function apply(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'preset_key' => 'required|string|max:100',
            'include_products' => 'nullable|boolean',
            'tenant_id' => 'nullable|integer|exists:tenants,id',
        ]);

        $tenantId = $this->resolveTargetTenantId($request, $validated['tenant_id'] ?? null);
        $userId = $request->user()?->id;

        $summary = $this->presetService->applyPreset(
            $validated['preset_key'],
            $tenantId,
            (bool) ($validated['include_products'] ?? false),
            $userId
        );

        AuditService::log(
            'apply_taxonomy_preset',
            'taxonomy_presets',
            null,
            null,
            $summary,
            'success',
            null,
            $userId
        );

        return response()->json([
            'success' => true,
            'message' => sprintf(
                'Preset "%s" berhasil diterapkan (%d segmen industri, %d sub-industri, %d business categories%s).',
                $summary['preset_name'],
                $summary['industries_synced'],
                $summary['sub_industries_synced'],
                $summary['business_categories_synced'],
                $summary['products_synced'] > 0 ? sprintf(', %d produk referensi', $summary['products_synced']) : ''
            ),
            'data' => $summary,
        ]);
    }

    private function resolveTargetTenantId(Request $request, ?int $requestedTenantId = null): int
    {
        $user = $request->user();
        if ($requestedTenantId && $user && method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin()) {
            return $requestedTenantId;
        }

        return (int) ($user?->tenant_id ?? 1);
    }
}

