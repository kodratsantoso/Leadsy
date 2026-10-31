<?php

namespace App\Console\Commands;

use App\Models\SalesOrderBillingSchedule;
use App\Services\Finance\CommercialInvoiceService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class GenerateScheduledInvoicesCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'finance:run-billing-scheduler {--date= : The target execution date (YYYY-MM-DD), defaults to today}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Automatically scan pending sales order billing schedules and generate commercial invoices when due dates arrive';

    /**
     * Execute the console command.
     */
    public function handle(CommercialInvoiceService $invoiceService): int
    {
        $targetDate = $this->option('date') ? Carbon::parse($this->option('date'))->toDateString() : Carbon::today()->toDateString();
        $this->info("Starting Billing Scheduler automation for trigger date: {$targetDate}...");

        $dueSchedules = SalesOrderBillingSchedule::where('status', 'pending')
            ->where('trigger_type', 'calendar_date')
            ->whereDate('scheduled_date', '<=', $targetDate)
            ->with(['salesOrder.lead'])
            ->get();

        if ($dueSchedules->isEmpty()) {
            $this->info("No due billing schedules found to process.");
            return Command::SUCCESS;
        }

        $this->info("Found {$dueSchedules->count()} pending billing schedules to generate.");
        $successCount = 0;
        $failedCount = 0;

        foreach ($dueSchedules as $schedule) {
            try {
                $this->line("Processing schedule #{$schedule->id}: {$schedule->term_name} for SO #{$schedule->salesOrder?->sales_order_number}...");
                $invoice = $invoiceService->createFromBillingSchedule($schedule, [
                    'invoice_date' => $targetDate,
                ]);
                $this->info(" -> Generated Invoice #{$invoice->invoice_number} (Total: Rp " . number_format($invoice->total_amount, 0, ',', '.') . ")");
                $successCount++;
            } catch (\Throwable $e) {
                $this->error(" -> Failed to process schedule #{$schedule->id}: {$e->getMessage()}");
                Log::error("GenerateScheduledInvoicesCommand error on schedule #{$schedule->id}: " . $e->getMessage(), [
                    'trace' => $e->getTraceAsString(),
                ]);
                $failedCount++;
            }
        }

        $this->info("Billing Scheduler finished: {$successCount} invoices generated, {$failedCount} failed.");
        return $failedCount > 0 ? Command::FAILURE : Command::SUCCESS;
    }
}
