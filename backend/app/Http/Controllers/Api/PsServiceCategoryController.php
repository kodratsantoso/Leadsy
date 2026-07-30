<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PsServiceCategory;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PsServiceCategoryController extends Controller
{
    public function index()
    {
        return response()->json(PsServiceCategory::orderBy('name')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:ps_service_categories',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $category = PsServiceCategory::create($validated);

        return response()->json($category, 201);
    }

    public function show($id)
    {
        return response()->json(PsServiceCategory::findOrFail($id));
    }

    public function update(Request $request, $id)
    {
        $category = PsServiceCategory::findOrFail($id);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('ps_service_categories')->ignore($category->id)],
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $category->update($validated);

        return response()->json($category);
    }

    public function destroy($id)
    {
        $category = PsServiceCategory::findOrFail($id);
        
        // Soft delete / Deactivate instead of hard delete if used
        if ($category->templates()->exists()) {
            $category->update(['is_active' => false]);
            return response()->json(['message' => 'Category deactivated because it is in use.'], 200);
        }

        $category->delete();

        return response()->json(null, 204);
    }
}
