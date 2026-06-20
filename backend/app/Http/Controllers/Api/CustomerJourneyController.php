<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Services\Sales\CustomerJourneyService;
use Illuminate\Http\JsonResponse;

class CustomerJourneyController extends Controller
{
    public function __construct(private CustomerJourneyService $journeyService) {}

    public function show(Lead $lead): JsonResponse
    {
        $this->authorize('view', $lead);
        $data = $this->journeyService->compileJourney($lead);

        return response()->json($data);
    }

    public function generateStory(Lead $lead): JsonResponse
    {
        $this->authorize('update', $lead);
        
        $story = $this->journeyService->generateCustomerStory($lead);

        return response()->json([
            'story' => $story
        ]);
    }
}
