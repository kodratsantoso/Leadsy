<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Jobs\GeneratePreMeetingBriefJob;
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
            return response()->json([
                'data' => $briefs,
                'is_processing' => $lead->ai_processing_status === 'processing'
            ]);
        }

        $brief = $lead->preMeetingBrief()->with('product')->first();
        return response()->json([
            'data' => $brief,
            'is_processing' => $lead->ai_processing_status === 'processing'
        ]);
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
        
        $lead->updateQuietly(['ai_processing_status' => 'processing']);
        
        GeneratePreMeetingBriefJob::dispatch($lead, $validated, request()->user()->id);

        return response()->json(['message' => 'Generation started', 'is_processing' => true], 202);
    }
    
    public function availableProducts(): JsonResponse
    {
        $products = \App\Models\Product::where('is_active', true)->select('id', 'name', 'category')->get();
        return response()->json(['data' => $products]);
    }
}
