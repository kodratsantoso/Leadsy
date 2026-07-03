<?php

namespace App\Jobs;

use App\Models\LeadTranscript;
use App\Models\LarkBaseTable;
use App\Models\LarkIntegration;
use App\Services\Lark\LarkBaseService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class SyncTranscriptAnalysisToLarkBaseJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;

    /**
     * Create a new job instance.
     */
    public function __construct(public int $transcriptId)
    {
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $transcript = LeadTranscript::with('lead')->find($this->transcriptId);
        
        if (!$transcript || !$transcript->lead) {
            Log::warning("SyncTranscriptAnalysisToLarkBaseJob aborted: Transcript or Lead not found for ID {$this->transcriptId}");
            return;
        }

        $lead = $transcript->lead;
        
        $integration = LarkIntegration::where('tenant_id', $lead->tenant_id)->where('is_active', true)->first();
        if (!$integration) {
            Log::info("No active Lark integration for tenant {$lead->tenant_id}");
            return;
        }

        $larkBaseService = new LarkBaseService($integration);
        $baseTables = LarkBaseTable::where('tenant_id', $lead->tenant_id)->where('is_active', true)->get();

        foreach ($baseTables as $baseTable) {
            // Track job in DB
            $syncJobId = DB::table('lark_base_sync_jobs')->insertGetId([
                'lead_id' => $lead->id,
                'transcript_id' => $transcript->id,
                'connection_id' => $integration->id,
                'sync_type' => 'field_update',
                'status' => 'processing',
                'last_attempt_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            Log::info('lark_sync_job_dispatched', [
                'lead_id' => $lead->id,
                'transcript_id' => $transcript->id,
                'base_table_id' => $baseTable->id
            ]);

            try {
                $fieldDefinitions = [];
                try {
                    $fieldDefinitions = $larkBaseService->listFields($baseTable->app_token, $baseTable->table_id)['items'] ?? [];
                } catch (\Exception $e) {
                    Log::warning('lark_sync_list_fields_failed', [
                        'error' => $e->getMessage()
                    ]);
                }
                
                $result = $larkBaseService->upsertLeadWithResult($lead, $baseTable, $fieldDefinitions);
                
                if (isset($result['payload'])) {
                    Log::info('lark_payload_generated', [
                        'lead_id' => $lead->id,
                        'payload' => $result['payload']
                    ]);
                }
                
                $status = ($result['action'] === 'skipped') ? 'skipped' : (($result['action'] === 'failed') ? 'failed' : 'success');
                
                if ($status === 'failed') {
                    Log::error('lark_api_response_received', [
                        'action' => 'failed',
                        'reason' => $result['reason']
                    ]);
                } else {
                    Log::info('lark_api_response_received', [
                        'action' => $result['action'],
                        'record_id' => $result['record_id']
                    ]);
                }
                
                DB::table('lark_base_sync_jobs')->where('id', $syncJobId)->update([
                    'status' => $status,
                    'lark_record_id' => $result['record_id'] ?? null,
                    'response_json' => json_encode($result),
                    'error_message' => $status === 'failed' ? $result['reason'] : null,
                    'updated_at' => now(),
                ]);
                
            } catch (\Exception $e) {
                Log::error("lark_api_response_received", [
                    'action' => 'failed',
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
                
                DB::table('lark_base_sync_jobs')->where('id', $syncJobId)->update([
                    'status' => 'failed',
                    'error_message' => $e->getMessage(),
                    'updated_at' => now(),
                ]);
                
                throw $e;
            }
        }
        
        Log::info("Transcript analysis sync completed for transcript ID {$this->transcriptId}");
    }
}
