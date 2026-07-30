<?php

namespace App\Services\ProfessionalServices;

use App\Models\PsBastDocument;
use App\Models\PsProjectPlan;
use App\Models\PsDocument;
use Exception;
use Illuminate\Support\Facades\DB;

class PsBastService
{
    protected PsPsaSettingService $settingService;

    public function __construct(PsPsaSettingService $settingService)
    {
        $this->settingService = $settingService;
    }

    public function generateBast(int $projectPlanId, array $data): PsBastDocument
    {
        return DB::transaction(function () use ($projectPlanId, $data) {
            $plan = PsProjectPlan::with(['estimations.lead'])->findOrFail($projectPlanId);
            $settings = $this->settingService->getSettings();
            
            // Validate Governance
            if ($settings->require_uat_signoff_before_bast) {
                $uatChecklist = $plan->deliveryChecklists()->where('checklist_type', 'UAT')->first();
                if (!$uatChecklist || !$uatChecklist->sign_off_status) {
                    throw new Exception("UAT Sign-off is required before generating BAST.");
                }
            }

            if ($settings->require_handover_before_bast) {
                $handoverChecklist = $plan->deliveryChecklists()->where('checklist_type', 'Handover')->first();
                if (!$handoverChecklist || !$handoverChecklist->sign_off_status) {
                    throw new Exception("Handover Sign-off is required before generating BAST.");
                }
            }

            $estimation = $plan->estimations()->first();
            $leadId = $estimation ? $estimation->lead_id : null;
            
            $bastNumber = 'BAST-' . date('Ymd') . '-' . strtoupper(uniqid());

            // Create BAST metadata record
            $bast = PsBastDocument::create([
                'bast_number' => $bastNumber,
                'project_plan_id' => $projectPlanId,
                'lead_id' => $leadId,
                'customer_name_snapshot' => $data['customer_name'] ?? 'Unknown Customer',
                'project_name' => $plan->project_name,
                'completion_summary' => $data['completion_summary'] ?? null,
                'delivered_scope' => $data['delivered_scope'] ?? null,
                'pending_items' => $data['pending_items'] ?? null,
                'status' => 'Generated',
            ]);

            // Create actual PsDocument
            $document = PsDocument::create([
                'document_number' => $bastNumber,
                'estimation_id' => $estimation ? $estimation->id : 1, // Fallback if no estimation
                'lead_id' => $leadId,
                'document_type' => 'bast',
                'document_title' => 'Project Acceptance (BAST) - ' . $plan->project_name,
                'status' => 'draft_generated',
                'file_name' => $bastNumber . '.pdf',
                'file_path' => 'ps_documents/' . $bastNumber . '.pdf',
                'generated_by' => auth()->id() ?? 1,
                'generated_at' => now(),
            ]);

            $bast->update(['document_id' => $document->id]);

            return $bast;
        });
    }
}
