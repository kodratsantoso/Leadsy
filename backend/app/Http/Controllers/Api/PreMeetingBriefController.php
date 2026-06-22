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

        if (request()->query('history')) {
            $briefs = $lead->preMeetingBriefs()->with('product')->take(10)->get();
            return response()->json(['data' => $briefs]);
        }

        $brief = $lead->preMeetingBrief()->with('product')->first();
        return response()->json(['data' => $brief]);
    }

    public function generate(Lead $lead): JsonResponse
    {
        if (! Lead::visibleTo(request()->user())->whereKey($lead->id)->exists()) {
            abort(403);
        }
        
        $validated = request()->validate([
            'meeting_type' => 'nullable|string',
            'initial_needs' => 'nullable|string',
            'customer_objective' => 'nullable|string',
            'demo_expectation' => 'nullable|string',
            'pain_point' => 'nullable|string',
            'kpi_target' => 'nullable|string',
            'product_id' => 'nullable|exists:products,id',
        ]);
        
        $brief = $this->briefService->generateBrief($lead, $validated);
        $brief->load('product');

        return response()->json(['data' => $brief]);
    }
}
