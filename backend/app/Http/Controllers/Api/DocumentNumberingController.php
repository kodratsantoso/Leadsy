<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Setting\DocumentNumberingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DocumentNumberingController extends Controller
{
    protected DocumentNumberingService $numberingService;

    public function __construct(DocumentNumberingService $numberingService)
    {
        $this->numberingService = $numberingService;
    }

    /**
     * Get all document numbering sequences for current tenant
     */
    public function index(Request $request): JsonResponse
    {
        $tenantId = $request->user()?->tenant_id ?? 1;
        $sequences = $this->numberingService->getSequencesForTenant($tenantId);

        return response()->json([
            'success' => true,
            'data' => $sequences,
            'available_tokens' => [
                ['token' => '{PREFIX}', 'description' => 'Prefix dokumen (contoh: QT, SO, INV, BAST)'],
                ['token' => '{YYYY}', 'description' => 'Tahun 4 digit (contoh: ' . date('Y') . ')'],
                ['token' => '{YY}', 'description' => 'Tahun 2 digit (contoh: ' . date('y') . ')'],
                ['token' => '{MM}', 'description' => 'Bulan 2 digit (contoh: ' . date('m') . ')'],
                ['token' => '{DD}', 'description' => 'Tanggal 2 digit (contoh: ' . date('d') . ')'],
                ['token' => '{COUNTER}', 'description' => 'Nomor urut sekuensial dengan padding digit'],
            ],
            'reset_frequencies' => [
                ['value' => 'monthly', 'label' => 'Reset Bulanan (Kembali ke 1 setiap awal bulan)'],
                ['value' => 'yearly', 'label' => 'Reset Tahunan (Kembali ke 1 setiap awal tahun)'],
                ['value' => 'never', 'label' => 'Berkelanjutan (Tidak pernah reset)'],
            ],
        ]);
    }

    /**
     * Update sequence configuration for a specific document type
     */
    public function update(Request $request, string $documentType): JsonResponse
    {
        $tenantId = $request->user()?->tenant_id ?? 1;

        $validated = $request->validate([
            'prefix' => 'required|string|max:30',
            'format' => 'required|string|max:100',
            'counter_digits' => 'required|integer|min:1|max:10',
            'current_counter' => 'nullable|integer|min:0',
            'reset_frequency' => 'required|string|in:monthly,yearly,never',
            'description' => 'nullable|string|max:255',
            'is_active' => 'boolean',
        ]);

        $updated = $this->numberingService->updateSequence(
            $tenantId,
            $documentType,
            $validated,
            $request->user()?->id
        );

        return response()->json([
            'success' => true,
            'message' => "Pengaturan penomoran untuk {$documentType} berhasil diperbarui.",
            'data' => $updated,
        ]);
    }

    /**
     * Preview a document numbering format pattern
     */
    public function preview(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'prefix' => 'required|string|max:30',
            'format' => 'required|string|max:100',
            'counter_digits' => 'required|integer|min:1|max:10',
            'counter' => 'nullable|integer|min:1',
        ]);

        $preview = $this->numberingService->renderPattern(
            $validated['prefix'],
            $validated['format'],
            $validated['counter_digits'],
            $validated['counter'] ?? 1
        );

        return response()->json([
            'success' => true,
            'preview' => $preview,
        ]);
    }
}
