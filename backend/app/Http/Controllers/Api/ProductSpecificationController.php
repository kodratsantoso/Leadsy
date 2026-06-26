<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductSpecificationComparison;
use App\Services\Product\ProductScrapingService;
use App\Services\Product\ProductSpecificationComparisonService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ProductSpecificationController extends Controller
{
    /**
     * Scrape website and trigger comparison
     */
    public function scrapeAndCompare(
        Request $request,
        $id,
        ProductScrapingService $scrapingService,
        ProductSpecificationComparisonService $comparisonService
    ) {
        $product = Product::findOrFail($id);

        // 1. Scrape the website
        $scrapeRun = $scrapingService->scrapeProductWebsite($product, Auth::id());

        // 2. Run the AI comparison
        $comparison = $comparisonService->compare($product, $scrapeRun, Auth::id());

        return response()->json($comparison->load('updateSuggestions'));
    }

    /**
     * Get the latest comparison for a product
     */
    public function latestComparison($id)
    {
        $comparison = ProductSpecificationComparison::with('updateSuggestions')
            ->where('product_id', $id)
            ->orderBy('created_at', 'desc')
            ->first();

        if (!$comparison) {
            return response()->json(null, 404);
        }

        return response()->json($comparison);
    }

    /**
     * Approve a comparison
     */
    public function approve($id, $comparisonId, ProductSpecificationComparisonService $comparisonService)
    {
        $product = Product::findOrFail($id);
        $comparison = ProductSpecificationComparison::where('product_id', $product->id)->findOrFail($comparisonId);

        $comparisonService->applyApprovedSuggestions($comparison);

        return response()->json(['status' => 'success']);
    }

    /**
     * Reject a comparison
     */
    public function reject($id, $comparisonId)
    {
        $comparison = ProductSpecificationComparison::findOrFail($comparisonId);
        $comparison->update(['status' => 'rejected', 'reviewed_by' => Auth::id(), 'reviewed_at' => now()]);
        
        $comparison->updateSuggestions()->update(['status' => 'rejected']);

        return response()->json(['status' => 'success']);
    }
}
