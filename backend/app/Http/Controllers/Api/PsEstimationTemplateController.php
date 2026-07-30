<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PsEstimationTemplate;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;

class PsEstimationTemplateController extends Controller
{
    public function index()
    {
        return response()->json(PsEstimationTemplate::with('serviceCategory')->orderBy('name')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'service_category_id' => 'required|exists:ps_service_categories,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $template = PsEstimationTemplate::create($validated);

        return response()->json($template->load('serviceCategory'), 201);
    }

    public function show($id)
    {
        return response()->json(PsEstimationTemplate::with(['serviceCategory', 'components'])->findOrFail($id));
    }

    public function update(Request $request, $id)
    {
        $template = PsEstimationTemplate::findOrFail($id);

        $validated = $request->validate([
            'service_category_id' => 'required|exists:ps_service_categories,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $template->update($validated);

        return response()->json($template->load('serviceCategory'));
    }

    public function destroy($id)
    {
        $template = PsEstimationTemplate::findOrFail($id);
        $template->update(['is_active' => false]);
        return response()->json(['message' => 'Template deactivated.'], 200);
    }
}
