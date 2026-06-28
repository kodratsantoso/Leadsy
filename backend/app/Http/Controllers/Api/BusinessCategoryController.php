<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BusinessCategory;
use Illuminate\Http\Request;

class BusinessCategoryController extends Controller
{
    public function index()
    {
        return response()->json([
            'data' => BusinessCategory::orderBy('name')->get()
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'code' => 'nullable|string|max:100',
            'name' => 'required|string|max:255|unique:business_categories',
            'synonyms' => 'nullable|array',
            'scoring_hints' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $category = BusinessCategory::create($validated);

        return response()->json([
            'success' => true,
            'data' => $category
        ], 201);
    }

    public function show(BusinessCategory $businessCategory)
    {
        return response()->json([
            'data' => $businessCategory
        ]);
    }

    public function update(Request $request, BusinessCategory $businessCategory)
    {
        $validated = $request->validate([
            'code' => 'nullable|string|max:100',
            'name' => 'required|string|max:255|unique:business_categories,name,' . $businessCategory->id,
            'synonyms' => 'nullable|array',
            'scoring_hints' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $businessCategory->update($validated);

        return response()->json([
            'success' => true,
            'data' => $businessCategory
        ]);
    }

    public function destroy(BusinessCategory $businessCategory)
    {
        $businessCategory->delete();

        return response()->json([
            'success' => true,
            'message' => 'Business Category deleted'
        ]);
    }
}
