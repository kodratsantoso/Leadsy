<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Industry;
use App\Models\Product;
use App\Models\ProductQuestion;
use App\Services\AuditService;
use App\Services\ProductMetadataGenerationService;
use App\Services\ProductQuestionGenerationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Product::with('tiers')->orderBy('name');

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        return response()->json(['data' => $query->get()]);
    }

    public function show(Product $product): JsonResponse
    {
        return response()->json(['data' => $product->load('tiers')]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'website_url' => 'nullable|url|max:2048',
            'category' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'target_industry' => 'nullable|string|max:255',
            'target_company_size' => 'nullable|string|max:255',
            'target_pain_points' => 'nullable|string',
            'target_buyer_persona' => 'nullable|string',
            'ideal_company_profile' => 'nullable|string',
            'ai_reference_material' => 'nullable|string',
            'supported_regions' => 'nullable|string|max:500',
            'budget_range' => 'nullable|string|max:255',
            'use_cases' => 'nullable|array',
            'competitor_notes' => 'nullable|string',
            'keywords' => 'nullable|array',
            'status' => 'nullable|in:active,inactive',
            'tiers' => 'nullable|array',
            'tiers.*.name' => 'required|string|max:255',
            'tiers.*.price' => 'required|numeric|min:0',
            'tiers.*.pricing_type' => 'required|string|in:flat_rate,per_user,usage_based',
            'tiers.*.billing_period' => 'required|string|in:monthly,yearly,one_time,custom',
            'tiers.*.subscription_duration_value' => 'required|integer|min:1',
            'tiers.*.subscription_duration_unit' => 'required|string|in:day,month,year,lifetime',
            'tiers.*.features' => 'nullable|array',
            'tiers.*.features.*' => 'required|string|max:500',
            'tiers.*.status' => 'nullable|in:active,inactive',
        ]);

        $productData = collect($data)->except('tiers')->toArray();
        $productData['created_by'] = $request->user()?->id;
        $productData['tenant_id'] = $request->user()?->tenant_id;

        $product = Product::create($productData);

        $tiersData = $data['tiers'] ?? [];
        foreach ($tiersData as $tierData) {
            $product->tiers()->create($tierData);
        }

        AuditService::logCreated('products', $product);

        return response()->json(['data' => $product->load('tiers')], 201);
    }

    public function update(Request $request, Product $product): JsonResponse
    {
        $original = clone $product;

        $data = $request->validate([
            'name' => 'required|string|max:255',
            'website_url' => 'nullable|url|max:2048',
            'category' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'target_industry' => 'nullable|string|max:255',
            'target_pain_points' => 'nullable|string',
            'target_buyer_persona' => 'nullable|string',
            'ideal_company_profile' => 'nullable|string',
            'ai_reference_material' => 'nullable|string',
            'supported_regions' => 'nullable|string|max:255',
            'budget_range' => 'nullable|string|max:255',
            'target_company_size' => 'nullable|string|max:255',
            'use_cases' => 'nullable|array',
            'competitor_notes' => 'nullable|string',
            'keywords' => 'nullable|array',
            'status' => 'nullable|in:active,inactive',
            'tiers' => 'nullable|array',
            'tiers.*.id' => 'nullable|integer',
            'tiers.*.name' => 'required|string|max:255',
            'tiers.*.price' => 'required|numeric|min:0',
            'tiers.*.pricing_type' => 'required|string|in:flat_rate,per_user,usage_based',
            'tiers.*.billing_period' => 'required|string|in:monthly,yearly,one_time,custom',
            'tiers.*.subscription_duration_value' => 'required|integer|min:1',
            'tiers.*.subscription_duration_unit' => 'required|string|in:day,month,year,lifetime',
            'tiers.*.features' => 'nullable|array',
            'tiers.*.features.*' => 'required|string|max:500',
            'tiers.*.status' => 'nullable|in:active,inactive',
        ]);

        $productData = collect($data)->except('tiers')->toArray();
        $product->update($productData);

        $tiersData = $data['tiers'] ?? [];
        $keepIds = [];
        foreach ($tiersData as $tierData) {
            if (isset($tierData['id'])) {
                $tier = $product->tiers()->findOrFail($tierData['id']);
                $tier->update($tierData);
                $keepIds[] = $tier->id;
            } else {
                $newTier = $product->tiers()->create($tierData);
                $keepIds[] = $newTier->id;
            }
        }
        $product->tiers()->whereNotIn('id', $keepIds)->delete();

        AuditService::logUpdated('products', $product, $original);

        return response()->json(['data' => $product->load('tiers')]);
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
            'product_name' => 'nullable|string|max:255',
            'reference_url' => 'nullable|url|max:2048',
            'pdf_file' => 'nullable|file|mimes:pdf|max:10240', // 10 MB
        ]);

        $productName = trim($request->input('product_name', ''));
        $referenceUrl = trim($request->input('reference_url', ''));
        $pdfFile = $request->file('pdf_file');

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
            $result = $service->generateFromPdf($pdfFile->getRealPath(), $productName, $availableCategories);
            $auditSource = 'pdf';
        } elseif ($referenceUrl) {
            $result = $service->generateFromUrl($referenceUrl, $productName, $availableCategories);
            $auditSource = 'url';
        } else {
            $result = $service->generate($productName, $availableCategories);
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
                'source' => $auditSource,
                'reference_url' => $referenceUrl ?: null,
                'ai_model' => $result['ai_model'],
                'user_id' => $request->user()?->id,
            ],
        );

        return response()->json([
            'data' => $result['data'],
            'ai_model' => $result['ai_model'],
            'source' => $auditSource,
        ]);
    }

    // ── Question Guide ──────────────────────────────────────────────────────

    /**
     * GET /api/products/{product}/questions
     * Returns the saved question guide for the product (or empty list).
     */
    public function getQuestions(Product $product): JsonResponse
    {
        $guide = $product->questionGuide;

        return response()->json([
            'data' => [
                'questions' => $guide?->questions ?? [],
                'ai_generated' => $guide?->ai_generated ?? false,
                'ai_model' => $guide?->ai_model ?? null,
                'updated_at' => $guide?->updated_at?->toIso8601String(),
            ],
        ]);
    }

    /**
     * POST /api/products/{product}/questions/generate
     * Uses AI to generate a question guide based on the product metadata.
     * Does NOT save — the client previews and edits first.
     */
    public function generateQuestions(Request $request, Product $product): JsonResponse
    {
        /** @var ProductQuestionGenerationService $service */
        $service = app(ProductQuestionGenerationService::class);

        $result = $service->generate($product);

        if (! $result['success']) {
            return response()->json(['error' => $result['error']], 422);
        }

        AuditService::log(
            'ai_product_questions_generated',
            'products',
            $product,
            null,
            ['ai_model' => $result['ai_model'], 'count' => count($result['questions'])],
        );

        return response()->json([
            'data' => $result['questions'],
            'ai_model' => $result['ai_model'],
        ]);
    }

    /**
     * PUT /api/products/{product}/questions
     * Saves the (possibly edited) question guide for the product.
     * Idempotent — creates or replaces the single guide record.
     */
    public function saveQuestions(Request $request, Product $product): JsonResponse
    {
        $validated = $request->validate([
            'questions' => 'required|array',
            'questions.*.id' => 'required|string|max:64',
            'questions.*.text' => 'required|string|max:1000',
            'questions.*.category' => 'required|string|max:100',
            'questions.*.order' => 'required|integer|min:1',
            'ai_generated' => 'boolean',
            'ai_model' => 'nullable|string|max:200',
        ]);

        $guide = ProductQuestion::updateOrCreate(
            ['product_id' => $product->id],
            [
                'questions' => $validated['questions'],
                'ai_generated' => $validated['ai_generated'] ?? false,
                'ai_model' => $validated['ai_model'] ?? null,
                'updated_by' => $request->user()?->id,
            ],
        );

        AuditService::logUpdated('product_questions', $guide, []);

        return response()->json([
            'data' => [
                'questions' => $guide->questions,
                'ai_generated' => $guide->ai_generated,
                'ai_model' => $guide->ai_model,
                'updated_at' => $guide->updated_at?->toIso8601String(),
            ],
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
