<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Territory;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TerritoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $territories = Territory::orderBy('created_at', 'desc')->get();
        return response()->json(['data' => $territories]);
    }

    public function show(Territory $territory): JsonResponse
    {
        return response()->json(['data' => $territory]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'          => 'required|string|max:255',
            'center_lat'    => 'required|numeric|between:-90,90',
            'center_lng'    => 'required|numeric|between:-180,180',
            'radius_meters' => 'required|integer|min:100|max:50000',
            'metadata'      => 'nullable|array',
        ]);

        $data['created_by'] = $request->user()?->id;
        $data['tenant_id'] = $request->user()?->tenant_id;
        $territory = Territory::create($data);

        AuditService::logCreated('territories', $territory);

        return response()->json(['data' => $territory], 201);
    }

    public function update(Request $request, Territory $territory): JsonResponse
    {
        $original = $territory->getAttributes();

        $data = $request->validate([
            'name'          => 'sometimes|string|max:255',
            'center_lat'    => 'nullable|numeric|between:-90,90',
            'center_lng'    => 'nullable|numeric|between:-180,180',
            'radius_meters' => 'nullable|integer|min:100|max:50000',
            'metadata'      => 'nullable|array',
        ]);

        $territory->update($data);
        AuditService::logUpdated('territories', $territory, $original);

        return response()->json(['data' => $territory]);
    }

    public function destroy(Territory $territory): JsonResponse
    {
        AuditService::logDeleted('territories', $territory);
        $territory->delete();
        return response()->json(null, 204);
    }
}
