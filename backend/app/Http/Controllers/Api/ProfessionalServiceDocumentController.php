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
