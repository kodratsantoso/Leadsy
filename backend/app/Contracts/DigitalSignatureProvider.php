<?php

namespace App\Contracts;

use App\Models\PsDocument;
use App\Models\DigitalSignatureEnvelope;

interface DigitalSignatureProvider
{
    /**
     * Send a document for digital signature.
     * 
     * @param PsDocument $document
     * @param string $subject
     * @param string $message
     * @return DigitalSignatureEnvelope
     */
    public function sendDocumentForSignature(PsDocument $document, string $subject, string $message): DigitalSignatureEnvelope;

    /**
     * Check and update the status of an existing envelope.
     * 
     * @param DigitalSignatureEnvelope $envelope
     * @return DigitalSignatureEnvelope
     */
    public function checkSignatureStatus(DigitalSignatureEnvelope $envelope): DigitalSignatureEnvelope;

    /**
     * Download the signed document and store it.
     * 
     * @param DigitalSignatureEnvelope $envelope
     * @return PsDocument
     */
    public function downloadSignedDocument(DigitalSignatureEnvelope $envelope): PsDocument;
}
