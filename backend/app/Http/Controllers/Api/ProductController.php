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
    public function index(Request $request): JsonResponse
    {
        $query = Product::orderBy('name');

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        return response()->json(['data' => $query->get()]);
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

    /**
     * POST /api/products/ai-generate
     *
     * Three source modes (mutually exclusive, in priority order):
     *   1. pdf_file   — multipart file upload, AI analyses extracted PDF text
     *   2. reference_url — AI fetches and analyses website content
     *   3. product_name  — AI generates metadata from product name alone (original)
     *
     * product_name is always accepted alongside url/pdf as an optional name hint.
     */
    public function aiGenerate(Request $request): JsonResponse
    {
        $request->validate([
            'product_name'  => 'nullable|string|max:255',
            'reference_url' => 'nullable|url|max:2048',
            'pdf_file'      => 'nullable|file|mimes:pdf|max:10240', // 10 MB
        ]);

        $productName  = trim($request->input('product_name', ''));
        $referenceUrl = trim($request->input('reference_url', ''));
        $pdfFile      = $request->file('pdf_file');

        // At least one source must be provided
        if (! $pdfFile && ! $referenceUrl && ! $productName) {
            return response()->json([
                'error' => 'Provide at least one of: product_name, reference_url, or pdf_file.',
            ], 422);
        }

        $availableCategories = $this->loadAvailableCategories();

        /** @var ProductMetadataGenerationService $service */
        $service = app(ProductMetadataGenerationService::class);

        // Determine source and call appropriate method
        if ($pdfFile) {
            $result     = $service->generateFromPdf($pdfFile->getRealPath(), $productName, $availableCategories);
            $auditSource = 'pdf';
        } elseif ($referenceUrl) {
            $result     = $service->generateFromUrl($referenceUrl, $productName, $availableCategories);
            $auditSource = 'url';
        } else {
            $result     = $service->generate($productName, $availableCategories);
            $auditSource = 'name';
        }

        if (! $result['success']) {
            return response()->json(['error' => $result['error']], 422);
        }

        AuditService::log(
            'ai_product_metadata_generated',
            'products',
            null,
            null,
            [
                'product_name' => $productName ?: null,
                'source'       => $auditSource,
                'reference_url'=> $referenceUrl ?: null,
                'ai_model'     => $result['ai_model'],
                'user_id'      => $request->user()?->id,
            ],
        );

        return response()->json([
            'data'     => $result['data'],
            'ai_model' => $result['ai_model'],
            'source'   => $auditSource,
        ]);
    }

    private function loadAvailableCategories(): array
    {
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

        return array_values(array_unique(array_merge($existingCategories, $industryNames)));
    }
}
