<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Industry;
use App\Models\Product;
use App\Services\AuditService;
use App\Services\ProductMetadataGenerationService;
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
            'target_company_size'   => 'nullable|string|max:255',
            'target_pain_points'    => 'nullable|string',
            'target_buyer_persona'  => 'nullable|string',
            'ideal_company_profile' => 'nullable|string',
            'ai_reference_material' => 'nullable|string',
            'supported_regions'     => 'nullable|string|max:500',
            'budget_range'          => 'nullable|string|max:255',
            'use_cases'             => 'nullable|array',
            'competitor_notes'      => 'nullable|string',
            'keywords'              => 'nullable|array',
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
            'target_company_size'   => 'nullable|string|max:255',
            'target_pain_points'    => 'nullable|string',
            'target_buyer_persona'  => 'nullable|string',
            'ideal_company_profile' => 'nullable|string',
            'ai_reference_material' => 'nullable|string',
            'supported_regions'     => 'nullable|string|max:500',
            'budget_range'          => 'nullable|string|max:255',
            'use_cases'             => 'nullable|array',
            'competitor_notes'      => 'nullable|string',
            'keywords'              => 'nullable|array',
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

    public function aiGenerate(Request $request): JsonResponse
    {
        $request->validate(['product_name' => 'required|string|max:255']);

        $productName = $request->string('product_name')->trim()->toString();

        // Load category options from DB: existing product categories + active industry names
        $existingCategories = Product::whereNotNull('category')
            ->where('category', '!=', '')
            ->distinct()
            ->pluck('category')
            ->flatMap(fn ($c) => array_map('trim', explode(',', $c)))
            ->filter()
            ->unique()
            ->values()
            ->all();

        $industryNames = Industry::where('is_active', true)
            ->pluck('name')
            ->values()
            ->all();

        $availableCategories = array_values(array_unique(array_merge($existingCategories, $industryNames)));

        /** @var ProductMetadataGenerationService $service */
        $service = app(ProductMetadataGenerationService::class);
        $result  = $service->generate($productName, $availableCategories);

        if (! $result['success']) {
            return response()->json(['error' => $result['error']], 422);
        }

        AuditService::log(
            'ai_product_metadata_generated',
            'products',
            null,
            null,
            [
                'product_name' => $productName,
                'ai_model'     => $result['ai_model'],
                'user_id'      => $request->user()?->id,
            ],
        );

        return response()->json([
            'data'                => $result['data'],
            'ai_model'            => $result['ai_model'],
            'available_categories'=> $availableCategories,
        ]);
    }
}
