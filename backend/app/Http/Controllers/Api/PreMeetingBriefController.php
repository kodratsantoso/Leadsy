<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Services\Sales\PreMeetingBriefService;
use Illuminate\Http\JsonResponse;

class PreMeetingBriefController extends Controller
{
    public function __construct(private PreMeetingBriefService $briefService) {}

    public function show(Lead $lead): JsonResponse
    {
        $this->authorize('view', $lead);
        $brief = $lead->preMeetingBrief()->with('product')->first();

        return response()->json($brief);
    }

    public function generate(Lead $lead): JsonResponse
    {
        $this->authorize('update', $lead);
        
        $brief = $this->briefService->generateBrief($lead);
        $brief->load('product');

        return response()->json($brief);
    }
}
