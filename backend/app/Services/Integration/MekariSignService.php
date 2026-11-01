<?php

namespace App\Services\Integration;

use App\Models\IntegrationConfig;
use App\Models\LeadQuotation;
use App\Models\LeadSalesOrder;
use App\Models\Tenant;
use Exception;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class MekariSignService
{
    protected ?Tenant $tenant = null;
    protected string $baseUrl;
    protected ?string $clientId;
    protected ?string $clientSecret;
    protected bool $isSandbox = true;
    protected bool $isEnabled = false;
    protected bool $autoEmeterai = false;

    public function __construct(?Tenant $tenant = null)
    {
        $this->resolveTenantAndConfig($tenant);
    }

    /**
     * Set tenant context fluently.
     */
    public function forTenant(?Tenant $tenant): self
    {
        $clone = clone $this;
        $clone->resolveTenantAndConfig($tenant);
        return $clone;
    }

    /**
     * Resolve tenant and load integration configuration.
     */
    protected function resolveTenantAndConfig(?Tenant $tenant = null): void
    {
        $this->tenant = $tenant ?? auth()->user()?->tenant ?? auth('sanctum')->user()?->tenant;
        $tenantId = $this->tenant?->id;

        // Default fallback from config/env
        $this->isSandbox = config('services.mekari_sign.sandbox', true);
        $this->clientId = config('services.mekari_sign.client_id', env('MEKARI_SIGN_CLIENT_ID'));
        $this->clientSecret = config('services.mekari_sign.client_secret', env('MEKARI_SIGN_CLIENT_SECRET'));
        $this->isEnabled = !empty($this->clientId);
        $this->autoEmeterai = false;

        // If tenant exists, load per-tenant IntegrationConfig
        if ($tenantId !== null) {
            $configs = IntegrationConfig::query()
                ->where('category', 'mekari_sign')
                ->where('tenant_id', $tenantId)
                ->get()
                ->keyBy('key');

            if ($configs->has('MEKARI_SIGN_ENABLED')) {
                $this->isEnabled = (bool) $configs->get('MEKARI_SIGN_ENABLED')->value;
            }
            if ($configs->has('MEKARI_SIGN_SANDBOX')) {
                $this->isSandbox = (bool) $configs->get('MEKARI_SIGN_SANDBOX')->value;
            }
            if ($configs->has('MEKARI_SIGN_CLIENT_ID') && !empty($configs->get('MEKARI_SIGN_CLIENT_ID')->value)) {
                $this->clientId = (string) $configs->get('MEKARI_SIGN_CLIENT_ID')->value;
            }
            if ($configs->has('MEKARI_SIGN_CLIENT_SECRET') && !empty($configs->get('MEKARI_SIGN_CLIENT_SECRET')->value)) {
                $this->clientSecret = (string) $configs->get('MEKARI_SIGN_CLIENT_SECRET')->value;
            }
            if ($configs->has('MEKARI_SIGN_AUTO_EMETERAI')) {
                $this->autoEmeterai = (bool) $configs->get('MEKARI_SIGN_AUTO_EMETERAI')->value;
            }
        }

        $this->baseUrl = $this->isSandbox
            ? 'https://sandbox-api.mekari.com/v2/esign'
            : 'https://api.mekari.com/v2/esign';
    }

    /**
     * Check if tenant has entitlement privilege for Mekari Sign.
     */
    public function hasPrivilege(): bool
    {
        if (!$this->tenant) {
            return false;
        }

        return $this->tenant->hasModule('mekari_sign');
    }

    /**
     * Check if Mekari Sign is properly configured and enabled.
     */
    public function isConfigured(): bool
    {
        return $this->hasPrivilege() && $this->isEnabled && !empty($this->clientId) && !empty($this->clientSecret);
    }

    /**
     * Obtain OAuth access token with caching.
     */
    public function getAccessToken(): string
    {
        if (!$this->hasPrivilege()) {
            throw new Exception("Paket integrasi Mekari Sign belum diaktifkan oleh Administrator SaaS untuk workspace Anda.");
        }

        if (empty($this->clientId) || empty($this->clientSecret)) {
            throw new Exception("Kredensial Mekari Sign (Client ID & Client Secret) belum dikonfigurasi pada menu Pengaturan Integrasi.");
        }

        $cacheKey = 'mekari_sign_access_token_' . ($this->tenant ? $this->tenant->id : 'global');

        return Cache::remember($cacheKey, 3500, function () {
            $tokenUrl = $this->isSandbox
                ? 'https://sandbox-account.mekari.com/auth/oauth/token'
                : 'https://account.mekari.com/auth/oauth/token';

            $response = Http::asForm()->timeout(15)->post($tokenUrl, [
                'grant_type' => 'client_credentials',
                'client_id' => $this->clientId,
                'client_secret' => $this->clientSecret,
            ]);

            if ($response->failed()) {
                Log::error("Mekari Sign OAuth token failed: " . $response->body());
                throw new Exception("Gagal mendapatkan akses token dari Mekari Sign: " . $response->json('error_description', $response->status()));
            }

            return $response->json('access_token');
        });
    }

    /**
     * Test OAuth connection to Mekari Sign API.
     */
    public function testConnection(?string $clientId = null, ?string $clientSecret = null, ?bool $isSandbox = null): array
    {
        if (!$this->hasPrivilege()) {
            return [
                'success' => false,
                'message' => 'Paket integrasi Mekari Sign belum diaktifkan oleh Administrator SaaS untuk workspace ini.',
            ];
        }

        $id = $clientId ?: $this->clientId;
        $secret = $clientSecret ?: $this->clientSecret;
        $sandbox = $isSandbox !== null ? $isSandbox : $this->isSandbox;

        if (empty($id) || empty($secret)) {
            return [
                'success' => false,
                'message' => 'Client ID dan Client Secret wajib diisi.',
            ];
        }

        $tokenUrl = $sandbox
            ? 'https://sandbox-account.mekari.com/auth/oauth/token'
            : 'https://account.mekari.com/auth/oauth/token';

        $response = Http::asForm()->timeout(15)->post($tokenUrl, [
            'grant_type' => 'client_credentials',
            'client_id' => $id,
            'client_secret' => $secret,
        ]);

        if ($response->failed()) {
            $error = $response->json('error_description') ?? $response->json('error') ?? $response->body();
            return [
                'success' => false,
                'status' => $response->status(),
                'message' => "Koneksi ke Mekari Sign gagal ({$response->status()}): {$error}",
            ];
        }

        return [
            'success' => true,
            'status' => 200,
            'message' => 'Koneksi ke Mekari Sign OAuth API berhasil diverifikasi.',
            'expires_in' => $response->json('expires_in'),
            'token_type' => $response->json('token_type'),
        ];
    }

    /**
     * Upload document (PDF) to Mekari Sign.
     */
    public function uploadDocument(string $filePath, string $documentName): array
    {
        $token = $this->getAccessToken();

        // Resolve absolute storage path if relative
        if (!file_exists($filePath)) {
            $storageRelative = ltrim(str_replace('/storage/', '', $filePath), '/');
            $fullPath = storage_path('app/public/' . $storageRelative);
            if (file_exists($fullPath)) {
                $filePath = $fullPath;
            } else {
                throw new Exception("Berkas PDF tidak ditemukan pada path: {$filePath}");
            }
        }

        $response = Http::withToken($token)
            ->attach('file', file_get_contents($filePath), basename($filePath))
            ->post("{$this->baseUrl}/documents/upload", [
                'name' => $documentName,
            ]);

        if ($response->failed()) {
            Log::error("Mekari Sign document upload failed: " . $response->body());
            throw new Exception("Gagal mengunggah dokumen ke Mekari Sign: " . $response->json('message', $response->body()));
        }

        return $response->json('data') ?? $response->json();
    }

    /**
     * Send document for e-signature with signers and coordinates.
     */
    public function sendForSignature(
        string $documentId,
        array $signers,
        string $subject = 'Permohonan Tanda Tangan Dokumen Komersial',
        bool $useEmeterai = false
    ): array {
        $token = $this->getAccessToken();
        $callbackUrl = config('app.url') . '/api/webhooks/mekari-sign';

        $payload = [
            'document_id' => $documentId,
            'title' => $subject,
            'is_emeterai' => $useEmeterai,
            'callback_url' => $callbackUrl,
            'signers' => $signers,
        ];

        $response = Http::withToken($token)
            ->post("{$this->baseUrl}/documents/send", $payload);

        if ($response->failed()) {
            Log::error("Mekari Sign send document failed: " . $response->body());
            throw new Exception("Gagal mengirim permintaan tanda tangan ke Mekari Sign: " . $response->json('message', $response->body()));
        }

        return $response->json('data') ?? $response->json();
    }

    /**
     * Send Quotation or Sales Order to Mekari Sign for e-signature.
     */
    public function sendCommercialDocument(
        string $type,
        int $id,
        array $signerData,
        bool $useEmeterai = false
    ): array {
        if ($type === 'quotation') {
            $doc = LeadQuotation::with(['lead'])->findOrFail($id);
            $docNumber = $doc->quotation_number;
            $pdfPath = $doc->pdf_url;
            $title = "Quotation #{$docNumber} - {$doc->customer_name}";
        } else {
            $doc = LeadSalesOrder::with(['lead'])->findOrFail($id);
            $docNumber = $doc->sales_order_number;
            $pdfPath = $doc->pdf_url;
            $title = "Sales Order #{$docNumber} - {$doc->customer_name}";
        }

        if (!$pdfPath) {
            throw new Exception("Dokumen PDF belum digenerate. Silakan preview/generate PDF terlebih dahulu.");
        }

        // 1. Upload PDF to Mekari Sign
        $uploadResult = $this->uploadDocument($pdfPath, $title);
        $documentId = $uploadResult['document_id'] ?? $uploadResult['id'] ?? null;

        if (!$documentId) {
            throw new Exception("Mekari Sign tidak mengembalikan ID dokumen setelah pengunggahan.");
        }

        // 2. Format signers: Company Signer & Customer Signer
        $signers = [];
        
        // Customer Signer (Signer 1)
        $signers[] = [
            'name' => $signerData['customer_name'] ?? ($doc->customer_name ?: 'Customer PIC'),
            'email' => $signerData['customer_email'],
            'phone' => $signerData['customer_phone'] ?? null,
            'order' => 1,
            'page' => $signerData['page'] ?? 1,
            'pos_x' => $signerData['pos_x'] ?? 80,
            'pos_y' => $signerData['pos_y'] ?? 720,
            'width' => 150,
            'height' => 60,
        ];

        // 3. Send
        $sendResult = $this->sendForSignature($documentId, $signers, $title, $useEmeterai);

        return [
            'status' => 'success',
            'document_id' => $documentId,
            'mekari_sign_response' => $sendResult,
            'message' => "Dokumen #{$docNumber} berhasil dikirim ke Mekari Sign untuk penandatanganan elektronik.",
        ];
    }

    /**
     * Handle incoming webhook payload from Mekari Sign.
     */
    public function handleWebhook(array $payload): array
    {
        $event = $payload['event'] ?? ($payload['type'] ?? 'unknown');
        $documentId = $payload['document_id'] ?? ($payload['data']['document_id'] ?? null);
        $downloadUrl = $payload['download_url'] ?? ($payload['data']['download_url'] ?? null);

        Log::info("Mekari Sign webhook received: event={$event}, doc_id={$documentId}");

        if ($event === 'document.completed' && $downloadUrl) {
            // Download signed PDF and save locally
            $fileContent = Http::get($downloadUrl)->body();
            if ($fileContent) {
                $filename = 'signed-' . $documentId . '.pdf';
                $relativePath = 'signed-documents/' . date('Y/m') . '/' . $filename;
                Storage::disk('public')->put($relativePath, $fileContent);
                $publicUrl = '/storage/' . $relativePath;

                // Update document reference if matches
                Log::info("Signed document saved successfully: {$publicUrl}");
            }
        }

        return ['status' => 'received', 'event' => $event];
    }
}
