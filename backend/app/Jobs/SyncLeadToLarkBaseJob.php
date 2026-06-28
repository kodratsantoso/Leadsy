<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

use App\Models\Lead;
use App\Models\LarkBaseRecordMapping;
use App\Models\LarkBaseFieldMapping;
use App\Models\LarkBaseConnection;
use App\Models\LarkBaseSyncLog;
use App\Services\Lark\LarkBaseService;
use Exception;

class SyncLeadToLarkBaseJob implements ShouldQueue
{
    use Queueable;

    protected $leadId;

    /**
     * Create a new job instance.
     */
    public function __construct($leadId)
    {
        $this->leadId = $leadId;
    }

    /**
     * Execute the job.
     */
    public function handle(LarkBaseService $larkBaseService): void
    {
        $lead = Lead::with('aiEvaluations')->find($this->leadId);
        if (!$lead) return;

        $mappings = LarkBaseRecordMapping::where('leadsy_entity_type', 'lead')
            ->where('leadsy_entity_id', $lead->id)
            ->whereNotNull('lark_record_id')
            ->get();

        foreach ($mappings as $mapping) {
            $connection = LarkBaseConnection::where('app_token', $mapping->lark_app_token)->first();
            if (!$connection || !$connection->is_active) continue;

            $fieldMappings = LarkBaseFieldMapping::where('connection_id', $connection->id)
                ->where('leadsy_entity_type', 'lead')
                ->where('is_active', true)
                ->whereIn('sync_direction', ['leadsy_to_lark', 'two_way'])
                ->get();

            if ($fieldMappings->isEmpty()) continue;

            $payloadFields = [];
            $evaluation = $lead->aiEvaluations->first();
            $bantc = $evaluation ? ($evaluation->bantc_extracted ?? []) : [];

            foreach ($fieldMappings as $field) {
                $val = null;
                switch ($field->leadsy_field_key) {
                    case 'budget': $val = $bantc['budget'] ?? null; break;
                    case 'authority': $val = $bantc['authority'] ?? null; break;
                    case 'needs': $val = $bantc['needs'] ?? null; break;
                    case 'timeline': $val = $bantc['timeline'] ?? null; break;
                    case 'competitor': $val = $bantc['competitor'] ?? null; break;
                    case 'eligibility_status': $val = $lead->eligibility_status; break;
                    case 'eligibility_reason': $val = $evaluation->eligibility_reason ?? null; break;
                    case 'leads_score': $val = $lead->score; break;
                    case 'confidentiality_score': $val = $lead->confidentiality_score; break;
                    case 'presales_analysis': $val = $evaluation->presales_analysis ?? null; break;
                    case 'presales_recommendation': $val = $evaluation->presales_recommendation ?? null; break;
                    // Note: meeting_summary_attachment is handled by another job
                }

                if ($val !== null) {
                    $payloadFields[$field->lark_field_id] = $val;
                }
            }

            if (empty($payloadFields)) continue;

            $payload = ['fields' => $payloadFields];

            try {
                $larkBaseService->updateRecord(
                    $connection->app_id,
                    $connection->encrypted_app_secret,
                    $mapping->lark_app_token,
                    $mapping->lark_table_id,
                    $mapping->lark_record_id,
                    $payload
                );

                $mapping->update([
                    'sync_status' => 'success',
                    'last_synced_at' => now(),
                    'last_sync_error' => null,
                ]);

                LarkBaseSyncLog::create([
                    'connection_id' => $connection->id,
                    'leadsy_entity_type' => 'lead',
                    'leadsy_entity_id' => $lead->id,
                    'lark_record_id' => $mapping->lark_record_id,
                    'sync_direction' => 'leadsy_to_lark',
                    'sync_action' => 'update_record',
                    'payload_json' => $payload,
                    'status' => 'success',
                ]);

            } catch (Exception $e) {
                $mapping->update([
                    'sync_status' => 'failed',
                    'last_sync_error' => $e->getMessage(),
                ]);

                LarkBaseSyncLog::create([
                    'connection_id' => $connection->id,
                    'leadsy_entity_type' => 'lead',
                    'leadsy_entity_id' => $lead->id,
                    'lark_record_id' => $mapping->lark_record_id,
                    'sync_direction' => 'leadsy_to_lark',
                    'sync_action' => 'update_record',
                    'payload_json' => $payload,
                    'status' => 'failed',
                    'error_message' => $e->getMessage(),
                ]);
            }
        }
    }
}
