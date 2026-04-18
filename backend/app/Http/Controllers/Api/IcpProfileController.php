<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\IcpProfile;
use App\Services\Revenue\ICPMatchingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IcpProfileController extends Controller
{
    public function index(): JsonResponse
    {
        $profiles = IcpProfile::orderByDesc('is_active')->orderBy('name')->get();
        return response()->json(['data' => $profiles]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'                 => 'required|string|max:255',
            'description'          => 'nullable|string',
            'target_industries'    => 'nullable|array',
            'target_company_sizes' => 'nullable|array',
            'target_territories'   => 'nullable|array',
            'min_lead_score'       => 'nullable|integer|min:0|max:100',
            'required_fields'      => 'nullable|array',
            'weight_lead_score'    => 'nullable|numeric|min:0|max:1',
            'weight_industry'      => 'nullable|numeric|min:0|max:1',
            'weight_company_size'  => 'nullable|numeric|min:0|max:1',
            'weight_territory'     => 'nullable|numeric|min:0|max:1',
            'weight_contact_info'  => 'nullable|numeric|min:0|max:1',
            'is_active'            => 'nullable|boolean',
        ]);

        $data['created_by'] = $request->user()->id;
        $profile = IcpProfile::create($data);
        return response()->json(['data' => $profile], 201);
    }

    public function show(IcpProfile $icpProfile): JsonResponse
    {
        return response()->json(['data' => $icpProfile]);
    }

    public function update(Request $request, IcpProfile $icpProfile): JsonResponse
    {
        $data = $request->validate([
            'name'                 => 'sometimes|string|max:255',
            'description'          => 'nullable|string',
            'target_industries'    => 'nullable|array',
            'target_company_sizes' => 'nullable|array',
            'target_territories'   => 'nullable|array',
            'min_lead_score'       => 'nullable|integer|min:0|max:100',
            'required_fields'      => 'nullable|array',
            'weight_lead_score'    => 'nullable|numeric|min:0|max:1',
            'weight_industry'      => 'nullable|numeric|min:0|max:1',
            'weight_company_size'  => 'nullable|numeric|min:0|max:1',
            'weight_territory'     => 'nullable|numeric|min:0|max:1',
            'weight_contact_info'  => 'nullable|numeric|min:0|max:1',
            'is_active'            => 'nullable|boolean',
        ]);

        $icpProfile->update($data);
        return response()->json(['data' => $icpProfile->fresh()]);
    }

    public function destroy(IcpProfile $icpProfile): JsonResponse
    {
        $icpProfile->delete();
        return response()->json(['message' => 'ICP profile deleted']);
    }

    public function batchMatch(IcpProfile $icpProfile, ICPMatchingService $service): JsonResponse
    {
        $count = $service->batchMatch($icpProfile);
        return response()->json(['message' => "Matched {$count} leads against ICP profile"]);
    }
}
