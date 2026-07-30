<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PsComplexityLevel;
use App\Models\PsComplexityDimension;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PsComplexityController extends Controller
{
    public function indexLevels()
    {
        return response()->json(PsComplexityLevel::orderBy('multiplier')->get());
    }

    public function storeLevel(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:ps_complexity_levels',
            'multiplier' => 'required|numeric|min:0',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $level = PsComplexityLevel::create($validated);

        return response()->json($level, 201);
    }

    public function updateLevel(Request $request, $id)
    {
        $level = PsComplexityLevel::findOrFail($id);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('ps_complexity_levels')->ignore($level->id)],
            'multiplier' => 'required|numeric|min:0',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $level->update($validated);

        return response()->json($level);
    }

    public function destroyLevel($id)
    {
        $level = PsComplexityLevel::findOrFail($id);
        $level->update(['is_active' => false]);
        return response()->json(['message' => 'Complexity Level deactivated.'], 200);
    }

    public function indexDimensions()
    {
        return response()->json(PsComplexityDimension::orderBy('name')->get());
    }

    public function storeDimension(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:ps_complexity_dimensions',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $dimension = PsComplexityDimension::create($validated);

        return response()->json($dimension, 201);
    }

    public function updateDimension(Request $request, $id)
    {
        $dimension = PsComplexityDimension::findOrFail($id);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('ps_complexity_dimensions')->ignore($dimension->id)],
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $dimension->update($validated);

        return response()->json($dimension);
    }

    public function destroyDimension($id)
    {
        $dimension = PsComplexityDimension::findOrFail($id);
        $dimension->update(['is_active' => false]);
        return response()->json(['message' => 'Complexity Dimension deactivated.'], 200);
    }
}
