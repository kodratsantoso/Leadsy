<?php

namespace App\Services\WhatsApp;

use App\Models\Lead;
use App\Models\WhatsappSyncRule;

class WhatsAppSyncEngine
{
    /**
     * Determines if a message should be ingested based on Privacy Sync Rules.
     *
     * Evaluation Flow:
     * 1. If strict_allowlist is enabled, ONLY matches pass. (default deny)
     * 2. If sender's phone number exactly matches an existing Lead, ALWAYS PASS.
     * 3. Evaluate Exclusion Rules (keywords in sender name or message body) -> if match, DENY.
     * 4. Evaluate Inclusion Rules (keywords in sender name or message body) -> if match, PASS.
     * 5. If it reaches the end and no explicit pass/deny happened, default depends on strict_allowlist.
     */
    public function evaluateMessage(string $senderName, string $phoneNumber, string $body, ?int $userId = null): array
    {
        // 1. Check if it explicitly matches an existing lead number
        $cleanPhone = preg_replace('/[^0-9]/', '', $phoneNumber);
        $linkedLeadId = null;

        $leadQuery = Lead::where('phone', 'like', "%{$cleanPhone}%");
        if ($userId) {
            $leadQuery->where('owner_id', $userId);
        }

        if ($leadQuery->exists()) {
            $linkedLeadId = $leadQuery->value('id');

            // If we know this lead, we sync it.
            return ['allow' => true, 'reason' => 'matched_known_lead', 'lead_id' => $linkedLeadId];
        }

        $rules = WhatsappSyncRule::where('enabled', true)->get();

        // Separate rules by type
        $excludeKeywords = $rules->where('rule_type', 'exclude_keyword')->pluck('rule_value');
        $includeKeywords = $rules->where('rule_type', 'include_keyword')->pluck('rule_value');
        $isStrictAllowlist = $rules->where('rule_type', 'strict_allowlist')->where('rule_value', 'true')->isNotEmpty();

        $textToSearch = strtolower($senderName.' '.$body);

        // 2. Evaluate Exclusions (Denylist)
        foreach ($excludeKeywords as $keyword) {
            if (str_contains($textToSearch, strtolower($keyword))) {
                return ['allow' => false, 'reason' => 'exclusion_keyword_match', 'lead_id' => null];
            }
        }

        // 3. Evaluate Inclusions (Allowlist)
        foreach ($includeKeywords as $keyword) {
            if (str_contains($textToSearch, strtolower($keyword))) {
                return ['allow' => true, 'reason' => 'inclusion_keyword_match', 'lead_id' => null];
            }
        }

        // 4. Default fallback
        if ($isStrictAllowlist) {
            return ['allow' => false, 'reason' => 'strict_allowlist_enforced', 'lead_id' => null];
        }

        return ['allow' => true, 'reason' => 'default_allow', 'lead_id' => null];
    }
}
