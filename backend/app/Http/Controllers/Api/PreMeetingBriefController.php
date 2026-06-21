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
        if (! Lead::visibleTo(request()->user())->whereKey($lead->id)->exists()) {
            abort(403);
        }
        $brief = $lead->preMeetingBrief()->with('product')->first();

        return response()->json(['data' => $brief]);
    }

    public function generate(Lead $lead): JsonResponse
    {
        if (! Lead::visibleTo(request()->user())->whereKey($lead->id)->exists()) {
            abort(403);
        }
        
        $brief = $this->briefService->generateBrief($lead);
        $brief->load('product');

        return response()->json(['data' => $brief]);
    }
}
