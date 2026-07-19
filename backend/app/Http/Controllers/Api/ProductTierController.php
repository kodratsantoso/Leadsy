<?php
 
namespace App\Http\Controllers\Api;
 
use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductTier;
use App\Services\AuditService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
 
class ProductTierController extends Controller
{
    public function getTiers($productId): JsonResponse
    {
        $product = Product::findOrFail($productId);
        return response()->json([
            'data' => $product->tiers()->orderBy('name')->get()
        ]);
    }
 
    public function storeTier(Request $request, $productId): JsonResponse
    {
        $product = Product::findOrFail($productId);
 
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'price' => 'required|numeric|min:0',
            'pricing_type' => 'required|string|in:flat_rate,per_user,usage_based,per_license,per_package,per_mandays,custom',
            'billing_period' => 'required|string|in:monthly,yearly,one_time,custom,quarterly',
            'subscription_duration_value' => 'required|integer|min:1',
            'subscription_duration_unit' => 'required|string|in:day,month,year,lifetime',
            'features' => 'nullable|array',
            'features.*' => 'required|string|max:500',
            'status' => 'nullable|in:active,inactive',
        ]);
 
        return DB::transaction(function () use ($product, $validated) {
            $tier = $product->tiers()->create($validated);
            AuditService::logCreated('product_tiers', $tier);
            return response()->json(['data' => $tier], 201);
        });
    }
 
    public function updateTier(Request $request, $id): JsonResponse
    {
        $tier = ProductTier::findOrFail($id);
 
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'price' => 'required|numeric|min:0',
            'pricing_type' => 'required|string|in:flat_rate,per_user,usage_based,per_license,per_package,per_mandays,custom',
            'billing_period' => 'required|string|in:monthly,yearly,one_time,custom,quarterly',
            'subscription_duration_value' => 'required|integer|min:1',
            'subscription_duration_unit' => 'required|string|in:day,month,year,lifetime',
            'features' => 'nullable|array',
            'features.*' => 'required|string|max:500',
            'status' => 'nullable|in:active,inactive',
        ]);
 
        $original = $tier->toArray();
 
        return DB::transaction(function () use ($tier, $validated, $original) {
            $tier->update($validated);
            AuditService::logUpdated('product_tiers', $tier, $original);
            return response()->json(['data' => $tier]);
        });
    }
 
    public function destroyTier($id): JsonResponse
    {
        $tier = ProductTier::findOrFail($id);
        $original = $tier->toArray();
 
        DB::transaction(function () use ($tier, $original) {
            $tier->delete();
            AuditService::logDeleted('product_tiers', $tier, $original);
        });
 
        return response()->json(['message' => 'Product tier deleted successfully.']);
    }
}
