<?php

namespace App\Services;

use App\Models\Lead;
use Illuminate\Support\Facades\DB;

class LeadDuplicateDetectionService
{
    /**
     * Checks if a lead already exists based on IDX primary/secondary checks.
     * Primary: source_external_id = IDX Code (handled via LeadSource external mapping if any, or custom field).
     * Since we only have `external_id` (used by LarkBase) and `LeadSource` holds notes...
     * Actually, the spec says "Primary: source_external_id = IDX Code and channel = IDX".
     * Let's check `LeadSource` table.
     */
    public function findDuplicate(string $idxCode, string $companyName, ?string $website, int $tenantId): ?Lead
    {
        // 1. Primary Check: By source reference in LeadSource
        // The previous implementation saved the IDX Code in `notes` of `LeadSource` 
        // e.g. "Kode Emiten: BBCA"
        // Let's do a strict check if there's a LeadSource with source_type='website', channel='IDX' and notes containing the idx_code.
        // Wait, the spec says map "Lead Source = Website, Channel = IDX". 
        // We will store the idx_code in `source_reference` or `external_id`?
        // The Lead model has `external_id`. It is currently used for Lark Base? "lark_base_id" is used for Lark Base.
        // So we can use `external_id` for the IDX Code.
        // Let's check `external_id` and `tenant_id`.

        $lead = Lead::where('tenant_id', $tenantId)
            ->where('external_id', $idxCode)
            ->first();

        if ($lead) {
            return $lead;
        }

        // 2. Secondary Check: By normalized Company Name
        $nameLower = mb_strtolower(trim($companyName));
        $leadQuery = Lead::where('tenant_id', $tenantId)
            ->whereRaw('LOWER(TRIM(company_name)) = ?', [$nameLower]);

        if ($website) {
            $websiteLower = mb_strtolower(trim($website));
            // Only add OR if we want loose matching, but let's stick to exact name match as it's safer.
            // Or exact website match:
            $leadQuery->orWhere(function($q) use ($tenantId, $websiteLower) {
                $q->where('tenant_id', $tenantId)
                  ->whereRaw('LOWER(TRIM(website)) = ?', [$websiteLower]);
            });
        }

        return $leadQuery->first();
    }
}
