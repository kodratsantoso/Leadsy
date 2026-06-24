<?php

namespace App\Services;

use App\Models\Lead;

/**
 * Deduplication Engine — BRD §3.7
 *
 * Priority order:
 *   1. website_domain
 *   2. company_name + nearby location
 *   3. email
 *   4. phone
 *
 * Returns a decision object with:
 *   - is_duplicate (bool)
 *   - status: 'new' | 'probable_duplicate' | 'exact_duplicate'
 *   - matched_lead_id (nullable)
 *   - match_reason (string)
 *   - recommendation: 'create_new' | 'append_contact' | 'skip'
 */
class DeduplicationService
{
    /**
     * Check whether a given company payload is a duplicate.
     *
     * @param  array{
     *   company_name: string,
     *   website_domain?: string|null,
     *   email?: string|null,
     *   phone?: string|null,
     *   lat?: float|null,
     *   lng?: float|null,
     * } $payload
     */
    public function check(array $payload): DedupResult
    {
        // Rule 0 — Place ID match (exact duplicate for Google Maps leads)
        if (! empty($payload['external_place_id'])) {
            $match = Lead::where('external_place_id', $payload['external_place_id'])->first();
            if ($match) {
                return DedupResult::exactDuplicate($match->id, 'external_place_id');
            }
        }

        // Rule 1 — Domain match (exact duplicate)
        if (! empty($payload['website_domain'])) {
            $match = Lead::where('website_domain', $payload['website_domain'])->first();
            if ($match) {
                return DedupResult::exactDuplicate($match->id, 'website_domain');
            }
        }

        // Rule 1.5 — Exact Name match
        if (! empty($payload['company_name'])) {
            $nameLower = mb_strtolower(trim($payload['company_name']));
            $match = Lead::whereRaw('LOWER(TRIM(company_name)) = ?', [$nameLower])->first();
            if ($match) {
                return DedupResult::probableDuplicate($match->id, 'company_name');
            }
        }

        // Rule 2 — Name + location (probable duplicate, within ~500m)
        if (! empty($payload['company_name']) && ! empty($payload['lat']) && ! empty($payload['lng'])) {
            $nameLower = mb_strtolower(trim($payload['company_name']));
            $match = Lead::whereRaw('LOWER(TRIM(company_name)) = ?', [$nameLower])
                ->whereNotNull('lat')
                ->whereNotNull('lng')
                ->get()
                ->first(function (Lead $lead) use ($payload) {
                    $dist = $this->haversine(
                        $payload['lat'], $payload['lng'],
                        $lead->lat, $lead->lng,
                    );

                    return $dist <= 500; // within 500 m
                });

            if ($match) {
                return DedupResult::probableDuplicate($match->id, 'name_location');
            }
        }

        // Rule 3 — Email
        if (! empty($payload['email'])) {
            $match = Lead::where('email', mb_strtolower($payload['email']))->first();
            if ($match) {
                return DedupResult::probableDuplicate($match->id, 'email');
            }
        }

        // Rule 4 — Phone (normalised digits only)
        if (! empty($payload['phone'])) {
            $digits = preg_replace('/\D/', '', $payload['phone']);
            if (strlen($digits) >= 8) {
                $match = Lead::whereRaw("regexp_replace(phone, '\\D', '', 'g') LIKE ?", ['%'.$digits])
                    ->first();
                if ($match) {
                    return DedupResult::probableDuplicate($match->id, 'phone');
                }
            }
        }

        return DedupResult::newLead();
    }

    /**
     * Haversine formula — returns distance in metres between two coordinates.
     */
    private function haversine(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $R = 6371000; // earth radius in metres
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat / 2) ** 2
           + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;
        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $R * $c;
    }
}

/**
 * Value object for dedup results.
 */
class DedupResult
{
    public function __construct(
        public readonly bool $isDuplicate,
        public readonly string $status,          // 'new' | 'probable_duplicate' | 'exact_duplicate'
        public readonly ?int $matchedLeadId,
        public readonly ?string $matchReason,
        public readonly string $recommendation,  // 'create_new' | 'append_contact' | 'skip'
    ) {}

    public static function newLead(): self
    {
        return new self(
            isDuplicate: false,
            status: 'new',
            matchedLeadId: null,
            matchReason: null,
            recommendation: 'create_new',
        );
    }

    public static function exactDuplicate(int $leadId, string $reason): self
    {
        return new self(
            isDuplicate: true,
            status: 'exact_duplicate',
            matchedLeadId: $leadId,
            matchReason: $reason,
            recommendation: 'append_contact',
        );
    }

    public static function probableDuplicate(int $leadId, string $reason): self
    {
        return new self(
            isDuplicate: true,
            status: 'probable_duplicate',
            matchedLeadId: $leadId,
            matchReason: $reason,
            recommendation: 'append_contact',
        );
    }

    public function toArray(): array
    {
        return [
            'is_duplicate' => $this->isDuplicate,
            'status' => $this->status,
            'matched_lead_id' => $this->matchedLeadId,
            'match_reason' => $this->matchReason,
            'recommendation' => $this->recommendation,
        ];
    }
}
