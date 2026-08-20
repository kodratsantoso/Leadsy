<?php

namespace App\Services\Lead;

use App\Models\Lead;
use App\Models\CompanyVerification;
use App\Models\CompanyVerificationEvidence;
use App\Models\IdxCompanyCache;
use App\Services\AI\AiOrchestrationService;
use Illuminate\Support\Facades\DB;

class CompanyVerificationService
{
    protected AiOrchestrationService $ai;

    public function __construct(AiOrchestrationService $ai)
    {
        $this->ai = $ai;
    }

    /**
     * Resolves a brand/company name into the correct legal entity and runs verification.
     */
    public function verifyLead(Lead $lead): CompanyVerification
    {
        return DB::transaction(function () use ($lead) {
            // Delete old verification runs to prevent duplicate history (idempotency rule)
            $lead->verifications()->delete();

            // Create baseline verification run
            $verification = $lead->verifications()->create([
                'legal_status' => 'UNVERIFIED',
                'legal_confidence' => 0,
                'entity_match_confidence' => 0,
                'operational_confidence' => 0,
            ]);

            $brandName = $lead->brand ?? $lead->company_name;
            $companyName = $lead->company_name;

            // 1. Check local IDX Emittent Cache (Tier 1 Authoritative local cache source)
            $idxMatch = $this->lookupIdxEmitents($brandName, $lead->website_domain);

            if ($idxMatch) {
                $verification->update([
                    'legal_name_resolved' => $idxMatch->company_name,
                    'legal_status' => 'VERIFIED',
                    'legal_confidence' => 95, // High authoritative index confidence
                    'entity_match_confidence' => $this->calculateMatchScore($lead, $idxMatch),
                    'operational_confidence' => 90, // Active listings carry operational status
                    'verified_at' => now(),
                ]);

                // Create Evidence record for IDX lookup
                $verification->evidences()->create([
                    'source_type' => 'IDX',
                    'source_name' => 'Bursa Efek Indonesia (IDX) Emittent Registry',
                    'source_url' => 'https://www.idx.co.id',
                    'evidence_type' => 'listing_status',
                    'raw_value' => json_encode($idxMatch->raw_payload_json),
                    'normalized_value' => "Emiten Code: {$idxMatch->idx_code}, Listing Board: {$idxMatch->listing_board}",
                    'confidence' => 95,
                    'retrieved_at' => now(),
                ]);

                // Automatically seed an alias mapping
                $lead->aliases()->updateOrCreate(
                    ['alias_value' => $idxMatch->company_name, 'alias_type' => 'legal_name'],
                    ['source' => 'IDX_LOOKUP', 'verified' => true]
                );

                if ($lead->brand) {
                    $lead->aliases()->updateOrCreate(
                        ['alias_value' => $lead->brand, 'alias_type' => 'brand'],
                        ['source' => 'MANUAL_ENTRY', 'verified' => true]
                    );
                }
            } else {
                // 2. Perform AI-based identity resolution using public details and strategies
                $aiResolution = $this->resolveViaAi($lead);

                $verification->update([
                    'legal_name_resolved' => $aiResolution['legal_name_resolved'] ?? $companyName,
                    'legal_status' => $aiResolution['legal_status'] ?? 'PARTIALLY_VERIFIED',
                    'legal_confidence' => $aiResolution['legal_confidence'] ?? 60,
                    'entity_match_confidence' => $aiResolution['entity_match_confidence'] ?? 50,
                    'operational_confidence' => $aiResolution['operational_confidence'] ?? 50,
                    'verified_at' => now(),
                ]);

                // Create verification evidence for the AI synthesis run (Tier 3 web inference)
                $verification->evidences()->create([
                    'source_type' => 'website',
                    'source_name' => 'Corporate Web Domain & Brand Identity Synthesis',
                    'source_url' => $lead->website,
                    'evidence_type' => 'registration',
                    'raw_value' => json_encode($aiResolution),
                    'normalized_value' => "Resolved Name: " . ($aiResolution['legal_name_resolved'] ?? 'Unknown'),
                    'confidence' => $aiResolution['legal_confidence'] ?? 60,
                    'retrieved_at' => now(),
                ]);
            }

            return $verification;
        });
    }

    /**
     * Looks up an emittent by ticker/company name or website domain.
     */
    protected function lookupIdxEmitents(string $name, ?string $domain): ?IdxCompanyCache
    {
        if (empty($name)) {
            return null;
        }

        // Exact code lookup or similar name lookup
        $match = IdxCompanyCache::where('idx_code', strtoupper(trim($name)))->first();
        if ($match) {
            return $match;
        }

        // Search by company name similarity
        $cleanName = preg_replace('/^(PT|CV|Tbk)\.?\s+/i', '', $name);
        $match = IdxCompanyCache::where('company_name', 'like', "%{$cleanName}%")->first();
        if ($match) {
            return $match;
        }

        // Domain match lookup
        if ($domain) {
            $match = IdxCompanyCache::where('website', 'like', "%{$domain}%")->first();
            if ($match) {
                return $match;
            }
        }

        return null;
    }

    /**
     * Calculates entity identity match confidence score (0 to 100).
     */
    protected function calculateMatchScore(Lead $lead, IdxCompanyCache $idx): int
    {
        $score = 50; // base score

        // Domain matching bonus
        if ($lead->website_domain && $idx->website && str_contains(strtolower($idx->website), strtolower($lead->website_domain))) {
            $score += 30;
        }

        // Name similarity bonus
        if (str_contains(strtolower($idx->company_name), strtolower($lead->company_name))) {
            $score += 20;
        }

        return min($score, 100);
    }

    /**
     * Uses AIService to verify operational/legal confidence from lead data context.
     */
    protected function resolveViaAi(Lead $lead): array
    {
        $prompt = "You are a corporate intelligence agent. Resolve the identity of this lead:\n" .
            "Company Name: {$lead->company_name}\n" .
            "Brand: {$lead->brand}\n" .
            "Website: {$lead->website}\n" .
            "Industry: " . ($lead->industry?->name ?? 'Unknown') . "\n" .
            "Address: {$lead->address}\n\n" .
            "Analyze whether this matches registered entities, typical abbreviations, and operational presence.\n" .
            "Return JSON matching this schema:\n" .
            "{\n" .
            "  \"legal_name_resolved\": \"string\",\n" .
            "  \"legal_status\": \"VERIFIED|PARTIALLY_VERIFIED|UNVERIFIED\",\n" .
            "  \"legal_confidence\": integer,\n" .
            "  \"entity_match_confidence\": integer,\n" .
            "  \"operational_confidence\": integer,\n" .
            "  \"reasoning\": \"string\"\n" .
            "}";

        try {
            // Fallback default response structure if AI service fails or returns prose
            $response = $this->ai->call('lead_icp_matching', $prompt, ['temperature' => 0.1]);
            if (is_array($response)) {
                return $response;
            }
            $parsed = json_decode($response, true);
            if (is_array($parsed)) {
                return $parsed;
            }
        } catch (\Exception $e) {
            // Silent fallback log
        }

        return [
            'legal_name_resolved' => $lead->company_name,
            'legal_status' => 'PARTIALLY_VERIFIED',
            'legal_confidence' => 50,
            'entity_match_confidence' => 60,
            'operational_confidence' => 50,
        ];
    }
}
