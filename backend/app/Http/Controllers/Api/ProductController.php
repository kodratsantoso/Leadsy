<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => Product::orderBy('name')->get()]);
    }

    public function show(Product $product): JsonResponse
    {
        return response()->json(['data' => $product]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'                  => 'required|string|max:255',
            'category'              => 'nullable|string|max:255',
            'description'           => 'nullable|string',
            'target_industry'       => 'nullable|string|max:255',
            'target_pain_points'    => 'nullable|string',
            'target_buyer_persona'  => 'nullable|string',
            'ideal_company_profile' => 'nullable|string',
            'ai_reference_material' => 'nullable|string',
            'status'                => 'nullable|in:active,inactive',
        ]);

        $data['created_by'] = $request->user()?->id;
        $data['tenant_id'] = $request->user()?->tenant_id;
        $product = Product::create($data);

        AuditService::logCreated('products', $product);

        return response()->json(['data' => $product], 201);
    }

    public function update(Request $request, Product $product): JsonResponse
    {
        $original = $product->getAttributes();

        $data = $request->validate([
            'name'                  => 'sometimes|string|max:255',
            'category'              => 'nullable|string|max:255',
            'description'           => 'nullable|string',
            'target_industry'       => 'nullable|string|max:255',
            'target_pain_points'    => 'nullable|string',
            'target_buyer_persona'  => 'nullable|string',
            'ideal_company_profile' => 'nullable|string',
            'ai_reference_material' => 'nullable|string',
            'status'                => 'nullable|in:active,inactive',
        ]);

        $product->update($data);

        AuditService::logUpdated('products', $product, $original);

        return response()->json(['data' => $product]);
    }

    public function destroy(Product $product): JsonResponse
    {
        AuditService::logDeleted('products', $product);
        $product->delete();

        return response()->json(null, 204);
    }
}
