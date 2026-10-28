<?php

namespace App\Console\Commands;

use App\Models\Lead;
use App\Models\LeadActivity;
use App\Models\LeadQuotation;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class CheckSlaBreachesCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'leadsy:check-sla-breaches';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Inspect active deals and quotations against enterprise SLAs and trigger escalation alerts';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Scanning pipeline for enterprise SLA breaches...');
        $breachesCount = 0;

        // 1. Check Quotations idling in draft status > 3 days
        $staleQuotations = LeadQuotation::where('quotation_status', 'draft')
            ->where('created_at', '<', now()->subDays(3))
            ->with('lead')
            ->get();

        foreach ($staleQuotations as $quote) {
            if (!$quote->lead) continue;

            $alreadyAlerted = LeadActivity::where('lead_id', $quote->lead_id)
                ->where('activity_type', 'system')
                ->where('description', 'like', "%[SLA BREACH]%Draft Quotation #{$quote->quotation_number}%")
                ->where('created_at', '>', now()->subDays(3))
                ->exists();

            if (!$alreadyAlerted) {
                LeadActivity::create([
                    'lead_id' => $quote->lead_id,
                    'activity_type' => 'system',
                    'description' => "[SLA BREACH] Draft Quotation #{$quote->quotation_number} telah mengendap > 3 hari tanpa finalisasi/pengiriman. Eskalasi otomatis ke pimpinan sales.",
                    'activity_date' => now(),
                ]);

                Log::warning("[SLA Breach Escalation] Lead #{$quote->lead_id} ({$quote->lead->company_name}) has stale draft quote #{$quote->quotation_number}.");
                $breachesCount++;
            }
        }

        // 2. Check Leads with overdue follow-ups > 24 hours
        $overdueLeads = Lead::whereIn('qualification_status', ['qualified', 'meeting_scheduled', 'proposal_sent'])
            ->whereHas('activities', function ($q) {
                $q->whereNotNull('next_follow_up_date')
                    ->where('next_follow_up_date', '<', now()->subHours(24));
            })
            ->get();

        foreach ($overdueLeads as $lead) {
            $alreadyAlerted = LeadActivity::where('lead_id', $lead->id)
                ->where('activity_type', 'system')
                ->where('description', 'like', "%[SLA BREACH]%Jadwal follow-up telah terlewat > 24 jam%")
                ->where('created_at', '>', now()->subDays(2))
                ->exists();

            if (!$alreadyAlerted) {
                LeadActivity::create([
                    'lead_id' => $lead->id,
                    'activity_type' => 'system',
                    'description' => "[SLA BREACH] Jadwal follow-up telah terlewat > 24 jam tanpa ada pencatatan interaksi baru oleh sales rep.",
                    'activity_date' => now(),
                ]);

                Log::warning("[SLA Breach Escalation] Lead #{$lead->id} ({$lead->company_name}) follow-up overdue by > 24 hours.");
                $breachesCount++;
            }
        }

        $this->info("Scan completed. Total {$breachesCount} SLA breach escalation(s) triggered.");
        return Command::SUCCESS;
    }
}
