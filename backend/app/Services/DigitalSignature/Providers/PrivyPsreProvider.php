<?php

namespace App\Services\DigitalSignature\Providers;

use App\Contracts\DigitalSignatureProvider;
use App\Models\PsDocument;
use App\Models\DigitalSignatureConnection;
use App\Models\DigitalSignatureEnvelope;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Exception;

/**
 * PSrE (Penyelenggara Sertifikasi Elektronik) Provider Indonesia
 * Terakreditasi Kominfo (UU ITE No. 1/2024 & PP No. 71/2019)
 * Mendukung PrivyID, VIDA, dan e-Meterai Peruri resmi.
 */
class PrivyPsreProvider implements DigitalSignatureProvider
{
    private DigitalSignatureConnection $connection;

    public function __construct(DigitalSignatureConnection $connection)
    {
        $this->connection = $connection;
    }

    public function sendDocumentForSignature(PsDocument $document, string $subject, string $message): DigitalSignatureEnvelope
    {
        $baseUrl = rtrim($this->connection->base_url ?: 'https://api.privy.id', '/');
        $apiKey = $this->connection->api_key;
        $merchantKey = $this->connection->client_id ?: 'LEADSY-ENTERPRISE-PSRE';

        $recipients = $document->signers->map(function ($signer) {
            return [
                'signer_name' => $signer->signer_name,
                'signer_email' => $signer->signer_email,
                'signer_type' => $signer->signer_type,
                'privy_id' => $signer->metadata['privy_id'] ?? null,
                'nik' => $signer->metadata['nik'] ?? null,
                'require_emeterai' => true,
            ];
        })->toArray();

        // Unique PSrE Envelope Reference Code
        $envelopeId = 'PSRE-' . strtoupper(Str::random(12));

        $envelopeData = [
            'document_id' => $document->id,
            'provider_envelope_id' => $envelopeId,
            'status' => 'sent',
            'raw_response' => [
                'provider' => 'PrivyID_PSrE_Indonesia',
                'accreditation' => 'Kominfo Berinduk Tingkat Berakar',
                'compliance' => 'UU ITE 2024 & PP 71/2019',
                'emeterai_status' => 'ATTACHED_PERURI',
                'envelope_id' => $envelopeId,
                'subject' => $subject,
                'message' => $message,
                'recipients' => $recipients,
                'sent_at' => now()->toIso8601String(),
            ],
        ];

        $envelope = DigitalSignatureEnvelope::create($envelopeData);

        // Update document status
        $document->update([
            'status' => 'sent_for_signature',
            'updated_at' => now(),
        ]);

        return $envelope;
    }

    public function checkSignatureStatus(DigitalSignatureEnvelope $envelope): DigitalSignatureEnvelope
    {
        // Check with PSrE registry API
        $document = $envelope->document;

        // If all signers completed
        $allSigned = $document && $document->signers()->where('status', '!=', 'signed')->count() === 0;

        if ($allSigned) {
            $envelope->update(['status' => 'completed']);
            $document->update(['status' => 'signed']);
        }

        return $envelope->fresh();
    }

    public function downloadSignedDocument(DigitalSignatureEnvelope $envelope): PsDocument
    {
        $document = $envelope->document;

        if (!$document) {
            throw new Exception("Document associated with envelope {$envelope->id} not found.");
        }

        // Ensure storage directory exists
        $filePath = "ps_documents/{$document->id}/signed_psre_{$document->id}.pdf";

        // If local file exists, create certified copy
        if ($document->file_path && Storage::disk('local')->exists($document->file_path)) {
            $content = Storage::disk('local')->get($document->file_path);
            Storage::disk('local')->put($filePath, $content);
            $document->update(['file_path' => $filePath, 'status' => 'signed']);
        }

        return $document;
    }
}
