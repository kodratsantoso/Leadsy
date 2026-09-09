<?php

namespace App\Services\CustomerSuccess;

use App\Models\CustomerRenewalOpportunity;
use App\Models\Lead;
use App\Models\LeadSalesOrder;
use App\Models\Product;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class CustomerRenewalIntelligenceService
{
    /**
     * Scan orders for renewal windows and generate renewal opportunities.
     *
     * @return Collection<int, CustomerRenewalOpportunity>
     */
    public function detectRenewalOpportunities(): Collection
    {
        $orders = LeadSalesOrder::with(['lead', 'items.product'])
            ->whereIn('order_status', ['confirmed', 'delivered', 'active'])
            ->whereNotNull('contract_end_date')
            ->get();

        $opportunities = collect();

        foreach ($orders as $order) {
            $endDate = Carbon::parse($order->contract_end_date);
            $daysLeft = (int) now()->diffInDays($endDate, false);

            // Only track if expiring within the next 90 days or recently expired (< 14 days ago)
            if ($daysLeft <= 90 && $daysLeft >= -14) {
                $urgency = match (true) {
                    $daysLeft <= 30 => 'critical',
                    $daysLeft <= 60 => 'high',
                    default => 'normal',
                };

                $reasoning = $daysLeft < 0
                    ? "Contract expired " . abs($daysLeft) . " days ago. Immediate renewal intervention required to prevent service lapse."
                    : "Contract expiring in {$daysLeft} days. Initiate commercial renewal discussions and present annual value recap.";

                $talkingPoints = [
                    "Highlight total ROI delivered over the past contract period.",
                    "Present renewal incentive or multi-year discount option.",
                    "Confirm current user seat count and propose necessary tier expansion.",
                ];

                $opp = CustomerRenewalOpportunity::updateOrCreate(
                    [
                        'lead_id' => $order->lead_id,
                        'sales_order_id' => $order->id,
                        'opportunity_type' => 'renewal',
                    ],
                    [
                        'current_contract_end' => $endDate->toDateString(),
                        'urgency' => $urgency,
                        'days_until_expiration' => max(0, $daysLeft),
                        'estimated_value' => $order->recurring_amount ?: $order->total_amount,
                        'reasoning' => $reasoning,
                        'pitch_talking_points' => $talkingPoints,
                        'status' => 'identified',
                    ]
                );

                $opportunities->push($opp);
            }
        }

        return $opportunities;
    }

    /**
     * Identify upsell & cross-sell white space for a specific client.
     *
     * @param Lead $lead
     * @return Collection<int, CustomerRenewalOpportunity>
     */
    public function detectCrossSellOpportunities(Lead $lead): Collection
    {
        $existingProductIds = $lead->salesOrders()
            ->with('items')
            ->get()
            ->flatMap(fn ($so) => $so->items->pluck('product_id'))
            ->filter()
            ->unique()
            ->toArray();

        // Find relevant unpurchased products from catalogue
        $unpurchasedProducts = Product::where('status', 'active')
            ->whereNotIn('id', $existingProductIds)
            ->take(2)
            ->get();

        $latestOrder = $lead->salesOrders()->latest('order_date')->first();
        if (!$latestOrder) {
            return collect();
        }

        $crossSellOpps = collect();

        foreach ($unpurchasedProducts as $product) {
            $opp = CustomerRenewalOpportunity::updateOrCreate(
                [
                    'lead_id' => $lead->id,
                    'sales_order_id' => $latestOrder->id,
                    'opportunity_type' => 'cross_sell',
                    'recommended_product_id' => $product->id,
                ],
                [
                    'current_contract_end' => $latestOrder->contract_end_date ?? now()->addYear()->toDateString(),
                    'urgency' => 'normal',
                    'days_until_expiration' => 90,
                    'estimated_value' => $product->base_price ?: 25000000,
                    'reasoning' => "White space identified: Client has established adoption in {$lead->company_name}. Recommending complementary add-on '{$product->name}' to expand operational scope.",
                    'pitch_talking_points' => [
                        "Position '{$product->name}' as a seamless add-on to existing deployed workflows.",
                        "Offer bundled trial or early-adopter credit.",
                    ],
                    'status' => 'identified',
                ]
            );

            $crossSellOpps->push($opp);
        }

        return $crossSellOpps;
    }
}
