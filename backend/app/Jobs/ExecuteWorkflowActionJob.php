<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Database\Eloquent\Model;
use App\Models\WorkflowAction;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;

class ExecuteWorkflowActionJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $action;
    protected $record;

    /**
     * Create a new job instance.
     */
    public function __construct(WorkflowAction $action, Model $record)
    {
        $this->action = $action;
        $this->record = $record;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        try {
            switch ($this->action->action_type) {
                case 'SEND_EMAIL':
                    $this->handleSendEmail();
                    break;
                case 'WEBHOOK':
                    $this->handleWebhook();
                    break;
                case 'UPDATE_FIELD':
                    $this->handleUpdateField();
                    break;
                default:
                    Log::warning("Unknown workflow action type: {$this->action->action_type}");
            }
        } catch (\Exception $e) {
            Log::error("Workflow Action Failed: " . $e->getMessage());
            // If failure_behavior is STOP_WORKFLOW we might want to flag the record, etc.
            if ($this->action->failure_behavior === 'STOP_WORKFLOW') {
                throw $e;
            }
        }
    }

    protected function handleSendEmail()
    {
        $config = $this->action->configuration ?? [];
        $to = $config['to'] ?? null;
        $subject = $config['subject'] ?? 'Notification';
        $body = $config['body'] ?? '';

        // E.g., parse merge tags like {{ record.name }} from the record
        // Here we just log for demonstration
        Log::info("Sending Workflow Email to {$to} - Subject: {$subject}");
    }

    protected function handleWebhook()
    {
        $config = $this->action->configuration ?? [];
        $url = $config['url'] ?? null;
        
        if ($url) {
            Log::info("Dispatching Workflow Webhook to {$url}");
            Http::post($url, [
                'record_id' => $this->record->id,
                'record_type' => get_class($this->record),
            ]);
        }
    }

    protected function handleUpdateField()
    {
        $config = $this->action->configuration ?? [];
        $field = $config['field'] ?? null;
        $value = $config['value'] ?? null;

        if ($field && in_array($field, $this->record->getFillable())) {
            $this->record->update([$field => $value]);
            Log::info("Workflow updated field {$field} to {$value} on Record {$this->record->id}");
        }
    }
}
