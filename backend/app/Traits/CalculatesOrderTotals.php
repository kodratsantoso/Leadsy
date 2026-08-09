<?php

namespace App\Traits;

use App\Models\CurrencySetting;

trait CalculatesOrderTotals
{
    protected function getCurrencyOrError()
    {
        $currencySetting = CurrencySetting::with('currency')->first();
        if (!$currencySetting || !$currencySetting->currency) {
            abort(response()->json([
                'message' => 'Default currency is not configured. Please configure currency first.'
            ], 422));
        }
        return $currencySetting->currency;
    }

    protected function calculateTotals(array $itemsData, string $headerDiscountType = null, float $headerDiscountValue = 0, float $otherCost = 0)
    {
        $subtotal = 0;
        $totalLineDiscount = 0;
        $totalTax = 0;
        $totalWithholdingTax = 0;
        $items = [];

        foreach ($itemsData as $index => $item) {
            $qty = (float) $item['quantity'];
            $price = (float) $item['unit_price'];
            $discType = $item['line_discount_type'] ?? null;
            $discVal = (float) ($item['line_discount_value'] ?? 0);
            $taxRate = (float) ($item['tax_rate'] ?? 0);
            $whtRate = (float) ($item['withholding_tax_rate'] ?? 0);

            if ($qty <= 0) {
                throw new \InvalidArgumentException('Quantity must be greater than 0.');
            }
            if ($price < 0) {
                throw new \InvalidArgumentException('Unit price must be greater than or equal to 0.');
            }
            if ($discVal < 0) {
                throw new \InvalidArgumentException('Line discount value cannot be negative.');
            }
            if ($taxRate < 0) {
                throw new \InvalidArgumentException('Tax rate cannot be negative.');
            }
            if ($whtRate < 0) {
                throw new \InvalidArgumentException('Withholding tax rate cannot be negative.');
            }

            $duration = isset($item['duration_value']) && $item['duration_value'] !== '' ? (float) $item['duration_value'] : 1.0;
            if ($duration <= 0) {
                $duration = 1.0;
            }
            $durationMultiplier = $duration;
            $billingPeriod = $item['billing_period'] ?? null;
            $durationUnit = $item['duration_unit'] ?? null;

            if ($billingPeriod === 'monthly' && $durationUnit === 'year') {
                $durationMultiplier = $duration * 12;
            } elseif ($billingPeriod === 'yearly' && $durationUnit === 'month') {
                $durationMultiplier = $duration / 12;
            }

            $baseAmount = $qty * $price * $durationMultiplier;
            $lineDiscountAmount = 0;

            if ($discType === 'percentage') {
                $lineDiscountAmount = $baseAmount * ($discVal / 100);
            } elseif ($discType === 'amount') {
                $lineDiscountAmount = $discVal;
            }

            if ($lineDiscountAmount > $baseAmount) {
                throw new \InvalidArgumentException('Line discount amount cannot exceed the line base amount.');
            }

            $taxableAmount = $baseAmount - $lineDiscountAmount;
            $lineTaxAmount = $taxableAmount * ($taxRate / 100);
            $lineTotalBeforeWht = $taxableAmount + $lineTaxAmount;
            
            $lineWhtAmount = $taxableAmount * ($whtRate / 100);
            $lineTotalAfterWht = $lineTotalBeforeWht - $lineWhtAmount;

            $subtotal += $baseAmount;
            $totalLineDiscount += $lineDiscountAmount;
            $totalTax += $lineTaxAmount;
            $totalWithholdingTax += $lineWhtAmount;

            $items[] = array_merge($item, [
                'quantity' => $qty,
                'unit_price' => $price,
                'line_discount_amount' => $lineDiscountAmount,
                'tax_amount' => $lineTaxAmount,
                'withholding_tax_amount' => $lineWhtAmount,
                'line_total_before_wht' => $lineTotalBeforeWht,
                'line_total_after_wht' => $lineTotalAfterWht,
                'total_amount' => $lineTotalAfterWht,
                'sort_order' => $item['sort_order'] ?? $index
            ]);
        }

        // Header discount calculation
        $taxableSubtotal = $subtotal - $totalLineDiscount;
        $headerDiscountAmount = 0;

        if ($headerDiscountType === 'percentage') {
            $headerDiscountAmount = $taxableSubtotal * ($headerDiscountValue / 100);
        } elseif ($headerDiscountType === 'amount') {
            $headerDiscountAmount = $headerDiscountValue;
        }

        if ($headerDiscountAmount > $taxableSubtotal) {
            throw new \InvalidArgumentException('Header discount cannot exceed the taxable subtotal.');
        }

        $grandTotalBeforeWht = $subtotal - $totalLineDiscount - $headerDiscountAmount + $totalTax + $otherCost;
        $grandTotalAfterWht = $grandTotalBeforeWht - $totalWithholdingTax;

        return [
            'subtotal' => $subtotal,
            'total_line_discount' => $totalLineDiscount,
            'header_discount_amount' => $headerDiscountAmount,
            'tax_amount' => $totalTax,
            'total_withholding_tax' => $totalWithholdingTax,
            'grand_total_before_wht' => $grandTotalBeforeWht,
            'total' => max(0, $grandTotalAfterWht),
            'items' => $items
        ];
    }
}
