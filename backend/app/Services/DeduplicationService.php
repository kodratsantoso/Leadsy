<?php

namespace App\Services;

use App\Models\Lead;
use App\Models\LeadActivity;
use App\Models\LeadContact;
use App\Models\LeadOutcome;
use App\Models\LeadQuotation;
use App\Models\LeadSalesOrder;
use App\Models\LeadTranscript;
use Illuminate\Support\Facades\DB;

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
                $driver = DB::connection()->getDriverName();
                if ($driver === 'sqlite') {
                    $match = Lead::whereNotNull('phone')
                        ->get()
                        ->first(function ($lead) use ($digits) {
                            $leadDigits = preg_replace('/\D/', '', (string) $lead->phone);
                            return str_ends_with($leadDigits, $digits) || str_ends_with($digits, $leadDigits);
                        });
                } else {
                    $match = Lead::whereRaw("regexp_replace(phone, '\\D', '', 'g') LIKE ?", ['%'.$digits])
                        ->first();
                }

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

    /**
     * Find potential duplicate candidates for a given lead.
     */
    public function findDuplicatesForLead(Lead $lead, int $limit = 10): array
    {
        $tenantId = $lead->tenant_id;
        $candidates = [];

        $query = Lead::where('id', '!=', $lead->id)
            ->whereNull('deleted_at');

        if ($tenantId) {
            $query->where('tenant_id', $tenantId);
        }

        // 1. Check exact or matching website domain
        if (!empty($lead->website_domain)) {
            $domainMatches = (clone $query)->where('website_domain', $lead->website_domain)->get();
            foreach ($domainMatches as $match) {
                $candidates[$match->id] = [
                    'lead' => $match,
                    'reasons' => ['Exact website domain match (' . $lead->website_domain . ')'],
                    'confidence_score' => 95,
                ];
            }
        }

        // 2. Check exact or normalized company name match
        $normalizedName = mb_strtolower(trim($lead->company_name));
        $nameMatches = (clone $query)
            ->whereRaw('LOWER(TRIM(company_name)) = ?', [$normalizedName])
            ->get();
        foreach ($nameMatches as $match) {
            if (isset($candidates[$match->id])) {
                $candidates[$match->id]['reasons'][] = 'Exact company name match';
                $candidates[$match->id]['confidence_score'] = max($candidates[$match->id]['confidence_score'], 98);
            } else {
                $candidates[$match->id] = [
                    'lead' => $match,
                    'reasons' => ['Exact company name match'],
                    'confidence_score' => 90,
                ];
            }
        }

        // 3. Check partial / substring company name match (at least 4 chars)
        if (mb_strlen($normalizedName) >= 4) {
            $partialMatches = (clone $query)
                ->where(function ($q) use ($normalizedName) {
                    $q->whereRaw('LOWER(company_name) LIKE ?', ['%' . $normalizedName . '%'])
                      ->orWhereRaw('? LIKE LOWER(CONCAT(\'%\', company_name, \'%\'))', [$normalizedName]);
                })
                ->limit(10)
                ->get();
            foreach ($partialMatches as $match) {
                if (!isset($candidates[$match->id])) {
                    $candidates[$match->id] = [
                        'lead' => $match,
                        'reasons' => ['Similar company name'],
                        'confidence_score' => 75,
                    ];
                }
            }
        }

        // 4. Check phone match
        if (!empty($lead->phone)) {
            $digits = preg_replace('/\D/', '', $lead->phone);
            if (strlen($digits) >= 8) {
                $suffix = substr($digits, -8);
                $driver = DB::connection()->getDriverName();
                if ($driver === 'sqlite') {
                    $phoneMatches = (clone $query)
                        ->whereNotNull('phone')
                        ->get()
                        ->filter(function ($cand) use ($suffix) {
                            $candDigits = preg_replace('/\D/', '', (string) $cand->phone);
                            return str_ends_with($candDigits, $suffix);
                        });
                } else {
                    $phoneMatches = (clone $query)
                        ->whereRaw("regexp_replace(COALESCE(phone, ''), '\\D', '', 'g') LIKE ?", ['%' . $suffix])
                        ->get();
                }

                foreach ($phoneMatches as $match) {
                    if (isset($candidates[$match->id])) {
                        $candidates[$match->id]['reasons'][] = 'Matching phone number digits';
                        $candidates[$match->id]['confidence_score'] = min(100, $candidates[$match->id]['confidence_score'] + 15);
                    } else {
                        $candidates[$match->id] = [
                            'lead' => $match,
                            'reasons' => ['Matching phone number digits'],
                            'confidence_score' => 85,
                        ];
                    }
                }
            }
        }

        // 5. Check email match
        if (!empty($lead->email)) {
            $emailMatches = (clone $query)
                ->whereRaw('LOWER(email) = ?', [mb_strtolower($lead->email)])
                ->get();
            foreach ($emailMatches as $match) {
                if (isset($candidates[$match->id])) {
                    $candidates[$match->id]['reasons'][] = 'Exact corporate email match';
                    $candidates[$match->id]['confidence_score'] = min(100, $candidates[$match->id]['confidence_score'] + 20);
                } else {
                    $candidates[$match->id] = [
                        'lead' => $match,
                        'reasons' => ['Exact corporate email match'],
                        'confidence_score' => 90,
                    ];
                }
            }
        }

        uasort($candidates, fn ($a, $b) => $b['confidence_score'] <=> $a['confidence_score']);
        $results = array_slice(array_values($candidates), 0, $limit);

        return array_map(function ($item) {
            $cand = $item['lead'];
            return [
                'id' => $cand->id,
                'company_name' => $cand->company_name,
                'brand' => $cand->brand,
                'website' => $cand->website,
                'website_domain' => $cand->website_domain,
                'phone' => $cand->phone,
                'email' => $cand->email,
                'address' => $cand->address,
                'lead_score' => $cand->lead_score,
                'qualification_status' => $cand->qualification_status,
                'funnel_stage' => $cand->funnelStage?->name ?? 'Unassigned',
                'owner' => $cand->owner?->name ?? 'Unassigned',
                'contacts_count' => $cand->contacts()->count(),
                'activities_count' => $cand->activities()->count(),
                'orders_count' => $cand->salesOrders()->count(),
                'created_at' => $cand->created_at?->toIso8601String(),
                'confidence_score' => $item['confidence_score'],
                'match_reasons' => $item['reasons'],
            ];
        }, $results);
    }

    /**
     * Consolidate duplicate secondary lead into primary lead.
     */
    public function mergeLeads(Lead $primaryLead, Lead $secondaryLead, array $fieldOverrides = [], ?int $userId = null): array
    {
        if ($primaryLead->id === $secondaryLead->id) {
            throw new \InvalidArgumentException("Cannot merge a lead into itself.");
        }

        return DB::transaction(function () use ($primaryLead, $secondaryLead, $fieldOverrides, $userId) {
            $contactsMoved = LeadContact::where('lead_id', $secondaryLead->id)
                ->update(['lead_id' => $primaryLead->id, 'is_primary' => false]);

            $activitiesMoved = LeadActivity::where('lead_id', $secondaryLead->id)
                ->update(['lead_id' => $primaryLead->id]);

            $transcriptsMoved = LeadTranscript::where('lead_id', $secondaryLead->id)
                ->update(['lead_id' => $primaryLead->id]);

            $quotationsMoved = LeadQuotation::where('lead_id', $secondaryLead->id)
                ->update(['lead_id' => $primaryLead->id]);

            $ordersMoved = LeadSalesOrder::where('lead_id', $secondaryLead->id)
                ->update(['lead_id' => $primaryLead->id]);

            $outcomesMoved = LeadOutcome::where('lead_id', $secondaryLead->id)
                ->update(['lead_id' => $primaryLead->id]);

            // Apply selected field overrides from secondary lead to primary lead
            $allowedOverrideFields = [
                'company_name', 'brand', 'website', 'website_domain', 'phone', 'email',
                'address', 'lat', 'lng', 'business_category', 'company_size_estimate',
                'industry_id', 'sub_industry_id', 'budget', 'authority', 'needs', 'timeline', 'competitor',
            ];

            $updatePayload = [];
            foreach ($allowedOverrideFields as $field) {
                if (in_array($field, $fieldOverrides) && !empty($secondaryLead->{$field})) {
                    $updatePayload[$field] = $secondaryLead->{$field};
                }
            }

            // Inherit score if primary has none
            if ($primaryLead->lead_score === null && $secondaryLead->lead_score !== null) {
                $updatePayload['lead_score'] = $secondaryLead->lead_score;
                $updatePayload['qualification_status'] = $secondaryLead->qualification_status;
            }

            if (!empty($updatePayload)) {
                $primaryLead->update($updatePayload);
            }

            // Record audit activity
            LeadActivity::create([
                'lead_id' => $primaryLead->id,
                'activity_type' => 'system',
                'description' => "Merged duplicate Lead #{$secondaryLead->id} ({$secondaryLead->company_name}) into this record. "
                    . "Consolidated {$contactsMoved} contact(s), {$activitiesMoved} activity(ies), {$transcriptsMoved} transcript(s), and {$ordersMoved} sales order(s).",
                'activity_date' => now(),
            ]);

            // Mark secondary lead as merged and soft-delete
            $secondaryLead->update([
                'duplicate_status' => 'merged',
                'duplicate_of_id' => $primaryLead->id,
            ]);
            $secondaryLead->delete();

            return [
                'success' => true,
                'primary_lead_id' => $primaryLead->id,
                'merged_lead_id' => $secondaryLead->id,
                'contacts_moved' => $contactsMoved,
                'activities_moved' => $activitiesMoved,
                'transcripts_moved' => $transcriptsMoved,
                'quotations_moved' => $quotationsMoved,
                'orders_moved' => $ordersMoved,
            ];
        });
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
