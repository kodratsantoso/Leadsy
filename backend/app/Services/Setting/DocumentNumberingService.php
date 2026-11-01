<?php

namespace App\Services\Setting;

use App\Models\DocumentNumberSequence;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class DocumentNumberingService
{
    /**
     * Default configurations per document type
     */
    public static function getDefaults(): array
    {
        return [
            'quotation' => [
                'prefix' => 'QT',
                'format' => '{PREFIX}-{YYYY}{MM}-{COUNTER}',
                'counter_digits' => 4,
                'reset_frequency' => 'monthly',
                'description' => 'Penomoran Penawaran Harga Komersial (Quotation)',
            ],
            'sales_order' => [
                'prefix' => 'SO',
                'format' => '{PREFIX}-{YYYY}{MM}-{COUNTER}',
                'counter_digits' => 4,
                'reset_frequency' => 'monthly',
                'description' => 'Penomoran Pesanan Penjualan (Sales Order)',
            ],
            'invoice' => [
                'prefix' => 'INV',
                'format' => '{PREFIX}/{YYYY}/{MM}/{COUNTER}',
                'counter_digits' => 4,
                'reset_frequency' => 'monthly',
                'description' => 'Penomoran Faktur Penagihan Komersial (Commercial Invoice)',
            ],
            'bast' => [
                'prefix' => 'BAST',
                'format' => '{PREFIX}-{YYYY}{MM}-{COUNTER}',
                'counter_digits' => 4,
                'reset_frequency' => 'monthly',
                'description' => 'Penomoran Berita Acara Serah Terima (BAST)',
            ],
            'sow' => [
                'prefix' => 'SOW',
                'format' => '{PREFIX}-{YYYY}{MM}-{COUNTER}',
                'counter_digits' => 4,
                'reset_frequency' => 'monthly',
                'description' => 'Penomoran Dokumen Statement of Work (SOW)',
            ],
        ];
    }

    /**
     * Get or initialize sequences for a specific tenant
     */
    public function getSequencesForTenant(?int $tenantId): \Illuminate\Support\Collection
    {
        $tenantId = $tenantId ?? 1;
        $defaults = self::getDefaults();

        // Check which exist
        $existing = DocumentNumberSequence::where('tenant_id', $tenantId)->get()->keyBy('document_type');

        // Seed missing defaults for this tenant
        foreach ($defaults as $docType => $def) {
            if (!$existing->has($docType)) {
                $created = DocumentNumberSequence::create([
                    'tenant_id' => $tenantId,
                    'document_type' => $docType,
                    'prefix' => $def['prefix'],
                    'format' => $def['format'],
                    'counter_digits' => $def['counter_digits'],
                    'current_counter' => 0,
                    'reset_frequency' => $def['reset_frequency'],
                    'last_reset_date' => Carbon::now(),
                    'description' => $def['description'],
                    'is_active' => true,
                ]);
                $existing->put($docType, $created);
            }
        }

        // Return sorted by document type
        return $existing->values()->map(function ($item) {
            $item->preview = $this->renderPattern(
                $item->prefix,
                $item->format,
                $item->counter_digits,
                $item->current_counter > 0 ? $item->current_counter : 1
            );
            return $item;
        });
    }

    /**
     * Generate the next document number atomically
     */
    public function getNextNumber(string $documentType, ?int $tenantId = null): string
    {
        $tenantId = $tenantId ?? 1;
        $defaults = self::getDefaults();

        return DB::transaction(function () use ($documentType, $tenantId, $defaults) {
            $sequence = DocumentNumberSequence::where('tenant_id', $tenantId)
                ->where('document_type', $documentType)
                ->lockForUpdate()
                ->first();

            if (!$sequence) {
                $def = $defaults[$documentType] ?? [
                    'prefix' => strtoupper(substr($documentType, 0, 3)),
                    'format' => '{PREFIX}-{YYYY}{MM}-{COUNTER}',
                    'counter_digits' => 4,
                    'reset_frequency' => 'monthly',
                    'description' => "Penomoran {$documentType}",
                ];

                $sequence = DocumentNumberSequence::create([
                    'tenant_id' => $tenantId,
                    'document_type' => $documentType,
                    'prefix' => $def['prefix'],
                    'format' => $def['format'],
                    'counter_digits' => $def['counter_digits'],
                    'current_counter' => 0,
                    'reset_frequency' => $def['reset_frequency'],
                    'last_reset_date' => Carbon::now(),
                    'description' => $def['description'],
                    'is_active' => true,
                ]);

                // Re-lock
                $sequence = DocumentNumberSequence::where('id', $sequence->id)->lockForUpdate()->first();
            }

            $now = Carbon::now();
            $shouldReset = false;

            if ($sequence->reset_frequency === 'monthly') {
                if (!$sequence->last_reset_date || $sequence->last_reset_date->format('Y-m') !== $now->format('Y-m')) {
                    $shouldReset = true;
                }
            } elseif ($sequence->reset_frequency === 'yearly') {
                if (!$sequence->last_reset_date || $sequence->last_reset_date->format('Y') !== $now->format('Y')) {
                    $shouldReset = true;
                }
            }

            if ($shouldReset) {
                $sequence->current_counter = 1;
                $sequence->last_reset_date = $now;
            } else {
                $sequence->current_counter += 1;
                $sequence->last_reset_date = $now;
            }

            $sequence->save();

            return $this->renderPattern(
                $sequence->prefix,
                $sequence->format,
                $sequence->counter_digits,
                $sequence->current_counter
            );
        });
    }

    /**
     * Update tenant sequence configuration
     */
    public function updateSequence(int $tenantId, string $documentType, array $data, ?int $userId = null): DocumentNumberSequence
    {
        $sequence = DocumentNumberSequence::firstOrNew([
            'tenant_id' => $tenantId,
            'document_type' => $documentType,
        ]);

        if (isset($data['prefix'])) {
            $sequence->prefix = trim($data['prefix']);
        }
        if (isset($data['format'])) {
            $sequence->format = trim($data['format']);
        }
        if (isset($data['counter_digits'])) {
            $sequence->counter_digits = max(1, min(10, (int)$data['counter_digits']));
        }
        if (isset($data['current_counter'])) {
            $sequence->current_counter = max(0, (int)$data['current_counter']);
        }
        if (isset($data['reset_frequency'])) {
            $sequence->reset_frequency = in_array($data['reset_frequency'], ['monthly', 'yearly', 'never'])
                ? $data['reset_frequency']
                : 'monthly';
        }
        if (isset($data['description'])) {
            $sequence->description = $data['description'];
        }
        if (isset($data['is_active'])) {
            $sequence->is_active = (bool)$data['is_active'];
        }

        if (!$sequence->exists) {
            $sequence->created_by = $userId;
            $sequence->last_reset_date = Carbon::now();
        }
        $sequence->updated_by = $userId;
        $sequence->save();

        $sequence->preview = $this->renderPattern(
            $sequence->prefix,
            $sequence->format,
            $sequence->counter_digits,
            $sequence->current_counter > 0 ? $sequence->current_counter : 1
        );

        return $sequence;
    }

    /**
     * Render the template pattern with concrete values
     */
    public function renderPattern(string $prefix, string $format, int $counterDigits, int $counter): string
    {
        $now = Carbon::now();
        $counterStr = sprintf("%0{$counterDigits}d", $counter);

        $replacements = [
            '{PREFIX}' => $prefix,
            '{YYYY}' => $now->format('Y'),
            '{YY}' => $now->format('y'),
            '{MM}' => $now->format('m'),
            '{DD}' => $now->format('d'),
            '{COUNTER}' => $counterStr,
        ];

        return str_replace(array_keys($replacements), array_values($replacements), $format);
    }
}
