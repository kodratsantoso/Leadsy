<?php

namespace App\Services;

use App\Models\PsEstimation;
use App\Models\PsDocument;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;
use Exception;
use Illuminate\Support\Str;

class ProfessionalServiceDocumentService
{
    /**
     * Generate a professional service document (PDF) for a given estimation.
     *
     * @param int $estimationId
     * @param array $options
     * @param int|null $userId
     * @return PsDocument
     * @throws Exception
     */
    public function generateDocument(int $estimationId, array $options, ?int $userId = null): PsDocument
    {
        $estimation = PsEstimation::with(['lead', 'lines.role', 'lines.taskGroup', 'quotation', 'category', 'complexityLevel'])->findOrFail($estimationId);

        $this->validateEligibility($estimation);

        $documentType = $options['document_type'] ?? 'estimation';
        
        // Prepare data for the PDF view
        $data = [
            'estimation' => $estimation,
            'lead' => $estimation->lead,
            'lines' => $estimation->lines->groupBy('task_group_id'),
            'documentType' => $documentType,
            'documentTitle' => $this->getDocumentTitle($documentType),
            'includeCommercial' => $options['include_commercial'] ?? true,
            'includeTaskBreakdown' => $options['include_task_breakdown'] ?? true,
            'includeAppendix' => $options['include_appendix'] ?? false,
            'roleBreakdown' => $this->calculateRoleBreakdown($estimation),
        ];

        // Determine version number
        $latestDoc = PsDocument::where('estimation_id', $estimation->id)
            ->where('document_type', $documentType)
            ->orderBy('version_number', 'desc')
            ->first();

        $versionNumber = $latestDoc ? $latestDoc->version_number + 1 : 1;

        $documentNumber = 'DOC-' . $estimation->estimation_number . '-V' . $versionNumber;
        
        // Render PDF
        $pdf = Pdf::loadView('pdf.ps-estimation-document', $data);

        // Save PDF to storage
        $safeFilename = Str::slug($estimation->title . '-' . $documentNumber) . '.pdf';
        $path = 'ps_documents/' . $estimation->id . '/' . $safeFilename;
        
        Storage::disk('public')->put($path, $pdf->output());

        // Create database record
        $document = PsDocument::create([
            'document_number' => $documentNumber,
            'estimation_id' => $estimation->id,
            'lead_id' => $estimation->lead_id,
            'quotation_id' => $estimation->converted_quotation_id,
            'document_type' => $documentType,
            'document_title' => $this->getDocumentTitle($documentType),
            'version_number' => $versionNumber,
            'status' => 'draft_generated',
            'file_name' => $safeFilename,
            'file_path' => $path,
            'file_url' => Storage::disk('public')->url($path),
            'file_mime_type' => 'application/pdf',
            'file_size' => Storage::disk('public')->size($path),
            'storage_disk' => 'public',
            'generated_by' => $userId,
            'generated_at' => now(),
        ]);

        return $document;
    }

    /**
     * Enforce strict eligibility rules.
     */
    private function validateEligibility(PsEstimation $estimation): void
    {
        if (!in_array($estimation->status, ['pm_reviewed', 'approved', 'converted_to_quotation'])) {
            throw new Exception("Estimation must be Approved or PM Reviewed to generate a document. Current status: {$estimation->status}.");
        }

        if ($estimation->lines->isEmpty()) {
            throw new Exception("Estimation has no task breakdown.");
        }

        $totalManDays = $estimation->lines->sum('final_mandays');
        if ($totalManDays <= 0) {
            throw new Exception("Total Final ManDays must be greater than 0.");
        }
    }

    private function getDocumentTitle(string $documentType): string
    {
        return match ($documentType) {
            'sow' => 'Statement of Work',
            'scope_agreement' => 'Scope Agreement',
            default => 'Professional Services Estimation',
        };
    }

    private function calculateRoleBreakdown(PsEstimation $estimation): array
    {
        $breakdown = [];
        $totalManDays = 0;

        foreach ($estimation->lines as $line) {
            $roleName = $line->role ? $line->role->name : 'Unassigned';
            if (!isset($breakdown[$roleName])) {
                $breakdown[$roleName] = [
                    'role' => $roleName,
                    'mandays' => 0,
                    'fee' => 0,
                ];
            }
            $breakdown[$roleName]['mandays'] += $line->final_mandays;
            $breakdown[$roleName]['fee'] += $line->estimated_fee;
            $totalManDays += $line->final_mandays;
        }

        foreach ($breakdown as &$roleData) {
            $roleData['percentage'] = $totalManDays > 0 ? round(($roleData['mandays'] / $totalManDays) * 100, 1) : 0;
        }

        return $breakdown;
    }
}
