<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Services\Lead\QualificationRuleEngineService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class QualificationController extends Controller
{
    public function __construct(private QualificationRuleEngineService $engine)
    {
    }

    public function evaluate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'lead_id' => 'nullable|integer|exists:leads,id',
            'company_name' => 'nullable|string|max:255',
            'industry' => 'nullable|string|max:255',
            'company_size_band' => 'nullable|in:micro,small,medium,enterprise,unknown',
            'territory_fit' => 'nullable|boolean',
            'target_industry_fit' => 'nullable|in:high,medium,low,unknown',
            'problem_statement' => 'nullable|string',
            'pain_level' => 'nullable|in:high,medium,low,unknown',
            'use_case_fit' => 'nullable|in:high,medium,low,unknown',
            'budget_status' => 'nullable|in:confirmed,range,unknown,unavailable',
            'timeline_months' => 'nullable|integer|min:0|max:60',
            'commercial_urgency' => 'nullable|in:high,medium,low,unknown',
            'decision_maker_engaged' => 'nullable|boolean',
            'stakeholder_count' => 'nullable|integer|min:0|max:50',
            'contact_quality' => 'nullable|in:strong,weak,absent',
            'technical_fit' => 'nullable|in:high,medium,low,unknown',
            'integration_complexity' => 'nullable|in:low,medium,high,unknown',
            'required_capabilities' => 'nullable',
            'notes' => 'nullable|string',
        ]);

        $evaluation = isset($data['lead_id'])
            ? $this->engine->evaluateLead(Lead::findOrFail($data['lead_id']))
            : $this->engine->evaluate($data);

        return response()->json(['data' => $evaluation]);
    }
}
