<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PsDocument;
use App\Models\PsDocumentSigner;
use App\Services\DigitalSignature\DigitalSignatureManager;
use App\Services\AuditService;
use App\Services\Sales\LeadActivityService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class DigitalSignatureController extends Controller
{
    public function sendForSignature(Request $request, int $documentId, DigitalSignatureManager $dsManager, LeadActivityService $activityService): JsonResponse
    {
        $document = PsDocument::findOrFail($documentId);

        if (in_array($document->status, ['sent_for_signature', 'signed'])) {
            return response()->json(['message' => 'Document is already sent or signed.'], 422);
        }

        $validated = $request->validate([
            'subject' => 'required|string',
            'message' => 'nullable|string',
            'provider' => 'nullable|string|in:privy_psre,documenso,privy,vida',
            'signers' => 'required|array|min:1',
            'signers.*.type' => 'required|string|in:customer,internal',
            'signers.*.name' => 'required|string',
            'signers.*.email' => 'required|email',
            'signers.*.nik' => 'nullable|string',
            'signers.*.privy_id' => 'nullable|string',
        ]);

        $requestedProvider = $validated['provider'] ?? 'privy_psre';

        // Save signers
        $document->signers()->delete(); // clear existing if any
        foreach ($validated['signers'] as $signerData) {
            PsDocumentSigner::create([
                'document_id' => $document->id,
                'signer_type' => $signerData['type'],
                'signer_name' => $signerData['name'],
                'signer_email' => $signerData['email'],
                'status' => 'pending',
            ]);
        }
        $document->load('signers');

        try {
            $provider = $dsManager->getActiveProvider($requestedProvider);
            $envelope = $provider->sendDocumentForSignature($document, $validated['subject'], $validated['message'] ?? '');

            AuditService::logUpdated('professional_service_documents', $document, ['status' => 'draft_generated']);
            
            if ($document->lead_id) {
                $activityService->logActivity(
                    $document->lead,
                    'Document Sent for Signature',
                    "Sent {$document->document_title} (v{$document->version_number}) for digital signature.",
                    $request->user()->id
                );
            }

            return response()->json([
                'message' => 'Sent successfully',
                'envelope' => $envelope,
                'document' => $document->fresh(['signers', 'signatureEnvelope'])
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function refreshStatus(int $documentId, DigitalSignatureManager $dsManager, LeadActivityService $activityService): JsonResponse
    {
        $document = PsDocument::with('signatureEnvelope')->findOrFail($documentId);
        
        if (!$document->signatureEnvelope) {
            return response()->json(['message' => 'No active signature envelope found.'], 404);
        }

        try {
            $provider = $dsManager->getActiveProvider();
            $updatedEnvelope = $provider->checkSignatureStatus($document->signatureEnvelope);

            if ($updatedEnvelope->status === 'COMPLETED' && $document->status !== 'signed') {
                $provider->downloadSignedDocument($updatedEnvelope);
                
                AuditService::logUpdated('professional_service_documents', $document, ['status' => 'sent_for_signature']);
                
                if ($document->lead_id) {
                    $activityService->logActivity(
                        $document->lead,
                        'Document Signed',
                        "{$document->document_title} (v{$document->version_number}) was signed by all parties.",
                        request()->user()->id ?? null
                    );
                }
            }

            return response()->json([
                'envelope' => $updatedEnvelope,
                'document' => $document->fresh(['signers', 'signatureEnvelope'])
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /**
     * Webhook receiver for Digital Signature & PSrE providers (Privy, Documenso, VIDA)
     */
    public function handleWebhook(Request $request, string $provider): JsonResponse
    {
        $payload = $request->all();
        $envelopeId = $payload['envelope_id'] ?? $payload['document_id'] ?? null;
        $event = $payload['event'] ?? $payload['status'] ?? 'document.signed';

        if (!$envelopeId) {
            return response()->json(['status' => 'ignored', 'message' => 'No envelope ID found in payload']);
        }

        $envelope = \App\Models\DigitalSignatureEnvelope::where('provider_envelope_id', $envelopeId)->first();

        if ($envelope && $envelope->document) {
            if (in_array(strtolower($event), ['document.signed', 'completed', 'signed'])) {
                $envelope->update(['status' => 'completed']);
                $envelope->document->update(['status' => 'signed']);
                $envelope->document->signers()->update(['status' => 'signed']);

                if ($envelope->document->lead) {
                    app(LeadActivityService::class)->logActivity(
                        $envelope->document->lead,
                        'PSrE Document Signed',
                        "Dokumen {$envelope->document->document_title} telah ditandatangani secara sah melalui {$provider}.",
                        null
                    );
                }
            } elseif (in_array(strtolower($event), ['document.rejected', 'declined'])) {
                $envelope->update(['status' => 'rejected']);
                $envelope->document->update(['status' => 'rejected']);
            }
        }

        return response()->json([
            'status' => 'success',
            'provider' => $provider,
            'event' => $event,
            'envelope_id' => $envelopeId,
        ]);
    }
}
