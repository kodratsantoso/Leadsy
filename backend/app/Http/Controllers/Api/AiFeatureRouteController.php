<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AiFeatureRoute;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiFeatureRouteController extends Controller
{
    public function index(): JsonResponse
    {
        $routes = AiFeatureRoute::with('aiModel.provider')->orderBy('feature_name')->orderBy('priority')->get();
        return response()->json(['data' => $routes]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'feature_name'     => 'required|string',
            'ai_model_id'      => 'required|exists:ai_models,id',
            'priority'         => 'required|integer|min:1',
            'max_retries'      => 'nullable|integer',
            'timeout_seconds'  => 'nullable|integer',
            'cost_sensitivity' => 'nullable|string',
            'is_active'        => 'nullable|boolean',
        ]);

        // Optional: clear existing route at that priority for feature
        AiFeatureRoute::where('feature_name', $data['feature_name'])
            ->where('priority', $data['priority'])
            ->delete();

        $route = AiFeatureRoute::create($data);

        return response()->json(['data' => $route->load('aiModel.provider')], 201);
    }

    public function destroy(AiFeatureRoute $route): JsonResponse
    {
        $route->delete();
        return response()->json(null, 204);
    }
}
