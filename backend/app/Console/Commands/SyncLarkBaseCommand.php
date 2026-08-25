<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\LarkBaseTable;
use App\Jobs\PullLarkBaseJob;
use Illuminate\Support\Facades\Log;

class SyncLarkBaseCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'leadsy:lark-pull';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Trigger pull synchronization from all active Lark Base tables';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $tables = LarkBaseTable::where('is_active', true)->get();
        $count = 0;

        foreach ($tables as $table) {
            if ($table->allowsPull()) {
                Log::info("[Scheduler] Dispatching PullLarkBaseJob for table mapping ID: {$table->id}");
                PullLarkBaseJob::dispatch($table->id);
                $count++;
            }
        }

        $this->info("Successfully dispatched Lark Pull jobs for {$count} active table mapping(s).");
        return Command::SUCCESS;
    }
}
