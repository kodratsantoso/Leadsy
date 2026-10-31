<?php

namespace App\Services\Finance;

use App\Models\LeadSalesOrder;
use App\Models\PaymentTerm;
use App\Models\SalesOrderBillingSchedule;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class BillingScheduleService
{
    /**
     * Generate or synchronize billing schedules for a Sales Order.
     */
    public function syncSchedulesForSalesOrder(LeadSalesOrder $salesOrder, ?int $paymentTermId = null, array $customSchedules = []): array
    {
        return DB::transaction(function () use ($salesOrder, $paymentTermId, $customSchedules) {
            // Delete existing pending schedules to recalculate
            $salesOrder->billingSchedules()->where('status', 'pending')->delete();

            $paymentTerm = null;
            if ($paymentTermId) {
                $paymentTerm = PaymentTerm::find($paymentTermId);
                $salesOrder->payment_term_id = $paymentTermId;
                $salesOrder->payment_term_type = $paymentTerm?->term_type ?? 'calendar';
                $salesOrder->save();
            }

            $schedules = [];
            $totalSubtotal = (float)$salesOrder->subtotal_amount > 0 ? (float)$salesOrder->subtotal_amount : (float)$salesOrder->total_amount;
            $taxRate = $salesOrder->tax_amount > 0 && $totalSubtotal > 0 ? ($salesOrder->tax_amount / $totalSubtotal) : 0.11;
            $whtRate = $salesOrder->total_withholding_tax > 0 && $totalSubtotal > 0 ? ($salesOrder->total_withholding_tax / $totalSubtotal) : 0.0;

            $startDate = $salesOrder->first_invoice_date 
                ? Carbon::parse($salesOrder->first_invoice_date) 
                : ($salesOrder->order_date ? Carbon::parse($salesOrder->order_date) : Carbon::today());

            // Case A: Custom user-provided schedule items
            if (!empty($customSchedules)) {
                $termNumber = 1;
                foreach ($customSchedules as $item) {
                    $pct = (float)($item['percentage'] ?? 100);
                    $subAmount = round($totalSubtotal * ($pct / 100), 2);
                    $taxAmount = round($subAmount * $taxRate, 2);
                    $whtAmount = round($subAmount * $whtRate, 2);
                    $totAmount = round($subAmount + $taxAmount - $whtAmount, 2);

                    $schedDate = !empty($item['scheduled_date']) ? Carbon::parse($item['scheduled_date'])->toDateString() : $startDate->copy()->toDateString();
                    $daysDue = (int)($paymentTerm?->days_due ?? 30);
                    $dueDate = !empty($item['due_date']) 
                        ? Carbon::parse($item['due_date'])->toDateString() 
                        : Carbon::parse($schedDate)->addDays($daysDue)->toDateString();

                    $schedules[] = SalesOrderBillingSchedule::create([
                        'sales_order_id' => $salesOrder->id,
                        'term_number' => $termNumber++,
                        'term_name' => $item['term_name'] ?? "Termin {$termNumber} ({$pct}%)",
                        'trigger_type' => $item['trigger_type'] ?? 'calendar_date',
                        'scheduled_date' => $schedDate,
                        'due_date' => $dueDate,
                        'percentage' => $pct,
                        'amount' => $subAmount,
                        'tax_amount' => $taxAmount,
                        'withholding_tax_amount' => $whtAmount,
                        'total_amount' => $totAmount,
                        'status' => 'pending',
                        'notes' => $item['notes'] ?? null,
                        'tenant_id' => $salesOrder->tenant_id,
                    ]);
                }
            } 
            // Case B: Preset-based generation from PaymentTerm
            elseif ($paymentTerm && !empty($paymentTerm->installments_config)) {
                $configs = $paymentTerm->installments_config;
                $termNumber = 1;
                $accumulatedDate = $startDate->copy();

                foreach ($configs as $idx => $conf) {
                    $pct = (float)($conf['percentage'] ?? 100);
                    $subAmount = round($totalSubtotal * ($pct / 100), 2);
                    $taxAmount = round($subAmount * $taxRate, 2);
                    $whtAmount = round($subAmount * $whtRate, 2);
                    $totAmount = round($subAmount + $taxAmount - $whtAmount, 2);

                    $trigger = $conf['trigger'] ?? 'calendar_date';
                    $daysAfter = (int)($conf['days_after'] ?? 0);
                    
                    if ($paymentTerm->frequency === 'monthly') {
                        $schedDate = $startDate->copy()->addMonths($idx)->toDateString();
                    } else {
                        $schedDate = $startDate->copy()->addDays($daysAfter)->toDateString();
                    }

                    $dueDate = Carbon::parse($schedDate)->addDays($paymentTerm->days_due)->toDateString();

                    $schedules[] = SalesOrderBillingSchedule::create([
                        'sales_order_id' => $salesOrder->id,
                        'term_number' => $termNumber++,
                        'term_name' => $conf['label'] ?? "Termin {$termNumber} ({$pct}%)",
                        'trigger_type' => $trigger === 'bast_milestone' ? 'bast_milestone' : 'calendar_date',
                        'scheduled_date' => $schedDate,
                        'due_date' => $dueDate,
                        'percentage' => $pct,
                        'amount' => $subAmount,
                        'tax_amount' => $taxAmount,
                        'withholding_tax_amount' => $whtAmount,
                        'total_amount' => $totAmount,
                        'status' => 'pending',
                        'notes' => $conf['description'] ?? null,
                        'tenant_id' => $salesOrder->tenant_id,
                    ]);
                }
            } 
            // Case C: Single 100% full invoice default
            else {
                $daysDue = $paymentTerm?->days_due ?? 30;
                $subAmount = $totalSubtotal;
                $taxAmount = round($subAmount * $taxRate, 2);
                $whtAmount = round($subAmount * $whtRate, 2);
                $totAmount = round($subAmount + $taxAmount - $whtAmount, 2);
                $schedDate = $startDate->toDateString();
                $dueDate = $startDate->copy()->addDays($daysDue)->toDateString();

                $schedules[] = SalesOrderBillingSchedule::create([
                    'sales_order_id' => $salesOrder->id,
                    'term_number' => 1,
                    'term_name' => 'Pelunasan Penuh (100%)',
                    'trigger_type' => 'calendar_date',
                    'scheduled_date' => $schedDate,
                    'due_date' => $dueDate,
                    'percentage' => 100.00,
                    'amount' => $subAmount,
                    'tax_amount' => $taxAmount,
                    'withholding_tax_amount' => $whtAmount,
                    'total_amount' => $totAmount,
                    'status' => 'pending',
                    'tenant_id' => $salesOrder->tenant_id,
                ]);
            }

            return $schedules;
        });
    }
}
