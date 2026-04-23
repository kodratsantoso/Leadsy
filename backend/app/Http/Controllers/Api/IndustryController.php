<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Industry;
use App\Models\SubIndustry;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IndustryController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => Industry::with('subIndustries')->orderBy('name')->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'          => 'required|string|max:255|unique:industries',
            'synonyms'      => 'nullable|array',
            'scoring_hints' => 'nullable|string',
        ]);

        $industry = Industry::create($data);
        AuditService::logCreated('industries', $industry);

        return response()->json(['data' => $industry], 201);
    }

    public function update(Request $request, Industry $industry): JsonResponse
    {
        $original = $industry->getAttributes();

        $data = $request->validate([
            'name'          => 'sometimes|string|max:255',
            'synonyms'      => 'nullable|array',
            'scoring_hints' => 'nullable|string',
            'is_active'     => 'nullable|boolean',
        ]);

        $industry->update($data);
        AuditService::logUpdated('industries', $industry, $original);

        return response()->json(['data' => $industry]);
    }

    public function destroy(Industry $industry): JsonResponse
    {
        AuditService::logDeleted('industries', $industry);
        $industry->delete();
        return response()->json(null, 204);
    }

    /* ── Sub-industries ── */

    public function storeSub(Request $request, Industry $industry): JsonResponse
    {
        $data = $request->validate([
            'name'          => 'required|string|max:255',
            'synonyms'      => 'nullable|array',
            'scoring_hints' => 'nullable|string',
        ]);

        $sub = $industry->subIndustries()->create($data);
        AuditService::logCreated('sub_industries', $sub);

        return response()->json(['data' => $sub], 201);
    }

    public function updateSub(Request $request, Industry $industry, SubIndustry $sub): JsonResponse
    {
        $original = $sub->getAttributes();

        $data = $request->validate([
            'name'          => 'sometimes|string|max:255',
            'synonyms'      => 'nullable|array',
            'scoring_hints' => 'nullable|string',
        ]);

        $sub->update($data);
        AuditService::logUpdated('sub_industries', $sub, $original);

        return response()->json(['data' => $sub]);
    }

    public function destroySub(Industry $industry, SubIndustry $sub): JsonResponse
    {
        AuditService::logDeleted('sub_industries', $sub);
        $sub->delete();
        return response()->json(null, 204);
    }
}
