<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Lead;

class BackfillLeadBantcCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'leadsy:backfill-bantc';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Backfills BANT-C data into the leads table from historical lead_activities';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting BANT-C backfill...');
        
        $leads = Lead::with('activities')->get();
        $updatedCount = 0;

        foreach ($leads as $lead) {
            $budget = $lead->activities->filter(fn($a) => !empty($a->budget))->sortByDesc('created_at')->first()?->budget;
            $authority = $lead->activities->filter(fn($a) => !empty($a->authority))->sortByDesc('created_at')->first()?->authority;
            $needs = $lead->activities->filter(fn($a) => !empty($a->needs))->sortByDesc('created_at')->first()?->needs;
            $timeline = $lead->activities->filter(fn($a) => !empty($a->timeline))->sortByDesc('created_at')->first()?->timeline;
            $competitor = $lead->activities->filter(fn($a) => !empty($a->competitor))->sortByDesc('created_at')->first()?->competitor;

            if ($budget || $authority || $needs || $timeline || $competitor) {
                $lead->update([
                    'budget' => $budget,
                    'authority' => $authority,
                    'needs' => $needs,
                    'timeline' => $timeline,
                    'competitor' => $competitor,
                ]);
                $updatedCount++;
            }
        }

        $this->info("Completed! Backfilled {$updatedCount} leads.");
    }
}
