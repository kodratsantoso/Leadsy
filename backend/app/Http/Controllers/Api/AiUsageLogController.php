<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AiUsageLog;
use Illuminate\Http\JsonResponse;

class AiUsageLogController extends Controller
{
    public function index(): JsonResponse
    {
        $logs = AiUsageLog::with('user:id,name')->latest()->paginate(50);
        
        $metrics = [
            'total_tokens' => AiUsageLog::sum('tokens_total'),
            'total_cost_usd' => (float) AiUsageLog::sum('estimated_cost_usd'),
            'total_web_searches' => AiUsageLog::where('has_web_search', true)->count(),
        ];

        return response()->json([
            'metrics' => $metrics,
            'data' => $logs->items(),
            'meta' => [
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'total' => $logs->total(),
            ]
        ]);
    }
}
