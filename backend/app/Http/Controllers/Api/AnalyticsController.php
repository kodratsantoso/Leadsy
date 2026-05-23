<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Revenue\PipelineQualityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AnalyticsController extends Controller
{
    public function pipelineQuality(Request $request, PipelineQualityService $service): JsonResponse
    {
        $territoryId = $request->integer('territory_id') ?: null;

        return response()->json(['data' => $service->getPipelineQuality($territoryId)]);
    }

    public function sourceQuality(PipelineQualityService $service): JsonResponse
    {
        return response()->json(['data' => $service->getSourceQuality()]);
    }
}
