<?php

namespace App\Services\WhatsApp;

use App\Models\Lead;
use App\Models\LeadContact;
use App\Models\WhatsappSyncRule;

class WhatsAppSyncEngine
{
    /**
     * Normalize a phone number and look up a matching Lead by phone — checking
     * both Lead.phone (the primary contact number) and LeadContact.phone (a
     * secondary/named contact on the lead), since a WhatsApp conversation may
     * be with either. Returns the lead id, or null if no match.
     */
    public function findLeadByPhone(string $phoneNumber, ?int $userId = null): ?int
    {
        $cleanPhone = preg_replace('/[^0-9]/', '', $phoneNumber);
        if (empty($cleanPhone)) {
            return null;
        }

        $leadQuery = Lead::where('phone', 'like', "%{$cleanPhone}%");
        if ($userId) {
            $leadQuery->where('owner_id', $userId);
        }
        if ($leadQuery->exists()) {
            return $leadQuery->value('id');
        }

        $contactQuery = LeadContact::where('phone', 'like', "%{$cleanPhone}%");
        if ($userId) {
            $contactQuery->whereHas('lead', fn ($q) => $q->where('owner_id', $userId));
        }

        return $contactQuery->value('lead_id');
    }

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
        $linkedLeadId = $this->findLeadByPhone($phoneNumber, $userId);

        if ($linkedLeadId) {
            // If we know this lead, we sync it.
            return ['allow' => true, 'reason' => 'matched_known_lead', 'lead_id' => $linkedLeadId];
        }

        // Scope rules to the receiving user's tenant so one tenant's keyword rules never
        // apply to another tenant's messages (2026-09-13 audit — rules previously had no
        // tenant scoping at all). Falls back to untenanted legacy/global rows.
        $tenantId = $userId ? \App\Models\User::find($userId)?->tenant_id : null;
        $rulesQuery = WhatsappSyncRule::where('enabled', true);
        $rulesQuery = $tenantId
            ? $rulesQuery->where(fn ($q) => $q->where('tenant_id', $tenantId)->orWhereNull('tenant_id'))
            : $rulesQuery->whereNull('tenant_id');
        $rules = $rulesQuery->get();

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
