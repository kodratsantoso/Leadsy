<?php

namespace App\Services\Revenue;

use App\Models\Lead;
use App\Models\Product;
use Illuminate\Support\Collection;

class ProductBundlingRecommendationService
{
    /**
     * Generate smart product bundling packages with simulated margin analysis for a lead.
     *
     * @param Lead $lead
     * @return array
     */
    public function generateBundlingRecommendations(Lead $lead): array
    {
        $products = Product::where('status', 'active')->get();
        if ($products->isEmpty()) {
            return [
                'lead_id' => $lead->id,
                'company_name' => $lead->company_name,
                'bundles' => [],
            ];
        }

        $bundles = [];

        // Match based on lead industry or assign complementary sets
        $leadIndustry = strtolower($lead->industry?->name ?? $lead->industry_name ?? '');

        // 1. Core Enterprise Package (Flagship Product + Professional Services)
        $primaryProduct = $lead->product ?: $products->first();
        $complementaryProducts = $products->where('id', '!=', $primaryProduct->id)->take(2);

        $bundleItems = collect([$primaryProduct])->concat($complementaryProducts);

        $totalStandardPrice = 0;
        $totalCogs = 0;
        $itemsData = [];

        foreach ($bundleItems as $idx => $prod) {
            $basePrice = $prod->base_price ?: ($prod->price ?: 50000000);
            $cogs = $basePrice * 0.55; // Estimated 55% COGS for tech solutions

            $totalStandardPrice += $basePrice;
            $totalCogs += $cogs;

            $itemsData[] = [
                'id' => $prod->id,
                'name' => $prod->name,
                'code' => $prod->code ?? "PROD-{$prod->id}",
                'category' => $prod->category ?? 'Software & Services',
                'standard_price' => (float) $basePrice,
                'role' => $idx === 0 ? 'Core Platform' : 'Implementation & Value-Add',
            ];
        }

        // Apply 12% Bundled Discount
        $discountRate = 0.12;
        $bundledPrice = $totalStandardPrice * (1 - $discountRate);
        $projectedGrossProfit = $bundledPrice - $totalCogs;
        $marginPercent = $bundledPrice > 0 ? round(($projectedGrossProfit / $bundledPrice) * 100, 1) : 40.0;

        $bundles[] = [
            'id' => 'bundle_enterprise_core',
            'bundle_name' => "Paket Solusi Terpadu: {$primaryProduct->name} Enterprise Suite",
            'badge' => 'Rekomendasi Tertinggi',
            'recommended_for' => "Dirancang khusus untuk akselerasi implementasi pada klien {$lead->company_name}.",
            'items' => $itemsData,
            'pricing' => [
                'currency' => 'IDR',
                'standard_total' => (float) $totalStandardPrice,
                'discount_percent' => 12,
                'bundled_total' => (float) round($bundledPrice),
                'estimated_cogs' => (float) round($totalCogs),
                'projected_gross_margin_percent' => $marginPercent,
            ],
            'sales_pitch' => "Menyatukan modul {$primaryProduct->name} dengan layanan implementasi presales, menghemat biaya awal hingga 12% sekaligus menjamin SLA implementasi lebih cepat 30%.",
        ];

        return [
            'lead_id' => $lead->id,
            'company_name' => $lead->company_name,
            'industry' => $lead->industry?->name ?? 'Enterprise Commercial',
            'total_bundles' => count($bundles),
            'generated_at' => now()->toISOString(),
            'bundles' => $bundles,
        ];
    }
}
