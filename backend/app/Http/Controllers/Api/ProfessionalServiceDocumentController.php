<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PsEstimation;
use App\Models\PsDocument;
use App\Services\ProfessionalServiceDocumentService;
use App\Services\AuditService;
use App\Services\Sales\LeadActivityService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ProfessionalServiceDocumentController extends Controller
{
    public function index(int $estimationId): JsonResponse
    {
        $documents = PsDocument::with(['signers', 'signatureEnvelope', 'generatedBy'])
            ->where('estimation_id', $estimationId)
            ->orderBy('created_at', 'desc')
            ->get();
            
        return response()->json($documents);
    }

    public function generate(Request $request, int $estimationId, ProfessionalServiceDocumentService $documentService, LeadActivityService $activityService): JsonResponse
    {
        $validated = $request->validate([
            'document_type' => 'required|string',
            'include_commercial' => 'boolean',
            'include_task_breakdown' => 'boolean',
            'include_appendix' => 'boolean',
        ]);

        try {
            $document = $documentService->generateDocument($estimationId, $validated, $request->user()->id);

            // Audit
            AuditService::logCreated('professional_service_documents', $document);

            // Activity Log
            $estimation = PsEstimation::find($estimationId);
            if ($estimation && $estimation->lead_id) {
                $activityService->logActivity(
                    $estimation->lead,
                    'Document Generated',
                    "Generated {$document->document_title} (v{$document->version_number}) for estimation {$estimation->estimation_number}.",
                    $request->user()->id
                );
            }

            return response()->json($document->load(['signers', 'signatureEnvelope', 'generatedBy']));
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function show(int $id): JsonResponse
    {
        $document = PsDocument::with(['signers', 'signatureEnvelope', 'generatedBy'])->findOrFail($id);
        return response()->json($document);
    }

    public function download(int $id)
    {
        $document = PsDocument::findOrFail($id);
        $disk = $document->storage_disk ?: 'public';

        if (! \Illuminate\Support\Facades\Storage::disk($disk)->exists($document->file_path)) {
            abort(404, 'PDF document file not found.');
        }

        return \Illuminate\Support\Facades\Storage::disk($disk)->response(
            $document->file_path,
            $document->file_name,
            [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'inline; filename="' . $document->file_name . '"',
            ]
        );
    }

    public function convertToProjectPlan(Request $request, int $id): JsonResponse
    {
        $document = PsDocument::with(['estimation.lines', 'lead'])->findOrFail($id);

        if ($document->document_type !== 'sow') {
            return response()->json([
                'status' => 'error',
                'message' => 'Hanya dokumen Statement of Work (SOW) yang dapat dikonversi menjadi Project Plan.',
            ], 422);
        }

        $estimation = $document->estimation;
        if (!$estimation) {
            return response()->json([
                'status' => 'error',
                'message' => 'Dokumen SOW tidak terikat dengan data Estimasi PSA.',
            ], 422);
        }

        // Check if project plan already exists for this SOW/estimation
        $existingPlan = \App\Models\PsProjectPlan::where('estimation_id', $estimation->id)->first();
        if ($existingPlan) {
            return response()->json([
                'status' => 'success',
                'message' => 'Project Plan untuk SOW ini sudah ada sebelumnya.',
                'data' => $existingPlan->load('tasks'),
            ]);
        }

        $projectPlanNumber = 'PP-' . date('Ym') . '-' . str_pad((string)$document->id, 4, '0', STR_PAD_LEFT);
        $companyName = $document->lead?->company_name ?? 'Pelanggan';

        $projectPlan = \App\Models\PsProjectPlan::create([
            'project_plan_number' => $projectPlanNumber,
            'estimation_id' => $estimation->id,
            'lead_id' => $document->lead_id,
            'quotation_id' => $document->quotation_id,
            'project_name' => "Implementasi SOW: {$companyName}",
            'customer_name_snapshot' => $companyName,
            'project_status' => 'planning',
            'project_start_date' => now()->toDateString(),
            'target_completion_date' => now()->addDays(60)->toDateString(),
            'estimated_duration_days' => 60,
            'total_estimated_mandays' => (float) ($estimation->total_mandays ?? 0),
            'service_category_id' => $estimation->service_category_id,
            'estimation_template_id' => $estimation->estimation_template_id,
            'complexity_level_id' => $estimation->complexity_level_id,
            'project_manager_id' => auth()->id(),
            'solution_architect_id' => $estimation->architect_id ?? auth()->id(),
            'delivery_notes' => "Rencana kerja diinisialisasi otomatis dari dokumen SOW #{$document->document_number}.",
            'created_by' => auth()->id(),
        ]);

        // Auto-generate project tasks from estimation lines
        if ($estimation->lines && $estimation->lines->count() > 0) {
            foreach ($estimation->lines as $idx => $line) {
                \App\Models\PsProjectTask::create([
                    'project_plan_id' => $projectPlan->id,
                    'task_name' => $line->task_name ?: "Deliverable Tahap " . ($idx + 1),
                    'description' => $line->description ?: "Pekerjaan teknis sesuai klausul SOW.",
                    'deliverable' => $line->deliverable_output ?: $line->task_name,
                    'assigned_role_id' => $line->role_id,
                    'estimated_mandays' => (float) ($line->mandays ?? 1.0),
                    'planned_start_date' => now()->addDays($idx * 5)->toDateString(),
                    'planned_end_date' => now()->addDays(($idx + 1) * 5)->toDateString(),
                    'status' => 'not_started',
                    'sort_order' => $idx + 1,
                ]);
            }
        }

        // Notify Project Manager and Delivery
        app(\App\Services\Notification\CrossDepartmentNotificationService::class)->notifySowSigned($document);

        return response()->json([
            'status' => 'success',
            'message' => "Project Plan #{$projectPlanNumber} berhasil diinisialisasi dari SOW #{$document->document_number} beserta task deliverable.",
            'data' => $projectPlan->load('tasks'),
        ], 201);
    }

    public function destroy(int $id): JsonResponse
    {
        $document = PsDocument::findOrFail($id);

        if (in_array($document->status, ['sent_for_signature', 'signed'])) {
            return response()->json(['message' => 'Cannot delete a document that is sent or signed.'], 403);
        }

        $document->delete();
        AuditService::logDeleted('professional_service_documents', $document);
        
        return response()->json(['message' => 'Deleted successfully']);
    }
}

