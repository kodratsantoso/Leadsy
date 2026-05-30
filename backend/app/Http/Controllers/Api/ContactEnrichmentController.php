<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ContactEnrichmentCandidate;
use App\Models\IntegrationConfig;
use App\Models\Lead;
use App\Models\LeadContact;
use App\Services\AuditService;
use App\Services\Enrichment\Providers\LushaProvider;
use App\Services\Lead\LeadContactGoogleSearchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ContactEnrichmentController extends Controller
{
    private const MIN_LUSHA_SCORE = 60;

    public function googleCandidates(Request $request, Lead $lead): JsonResponse
    {
        $candidates = $lead->contactEnrichmentCandidates()
            ->where('provider', 'GOOGLE_SEARCH')
            ->whereIn('status', ['previewed', 'added'])
            ->latest()
            ->limit(20)
            ->get()
            ->map(fn (ContactEnrichmentCandidate $candidate): array => $this->candidatePayload($candidate));

        return response()->json(['data' => $candidates]);
    }

    public function searchGoogleLinkedin(Request $request, Lead $lead, LeadContactGoogleSearchService $search): JsonResponse
    {
        if (empty($lead->company_name)) {
            return response()->json(['message' => 'Lead company name is required before Google contact search.'], 422);
        }

        $result = $search->search($lead, $this->currentTenantId($request));
        if (! $result['success']) {
            return response()->json(['message' => $result['error'] ?? 'Google contact search failed.'], 422);
        }

        $candidates = collect($result['candidates'] ?? [])->map(function (array $candidate) use ($lead, $request) {
            $model = ContactEnrichmentCandidate::updateOrCreate(
                [
                    'lead_id' => $lead->id,
                    'provider' => 'GOOGLE_SEARCH',
                    'provider_candidate_id' => $candidate['provider_candidate_id'],
                ],
                [
                    'created_by' => $request->user()?->id,
                    'name' => $candidate['name'],
                    'title' => $candidate['title'] ?: null,
                    'company_name' => $candidate['company_name'] ?: $lead->company_name,
                    'company_domain' => $candidate['company_domain'] ?: null,
                    'has_email' => false,
                    'has_phone' => false,
                    'reveal_email_credits' => 0,
                    'reveal_phone_credits' => 0,
                    'status' => 'previewed',
                    'raw_preview' => $candidate['raw_preview'] ?? $candidate,
                    'expires_at' => now()->addDays(14),
                ]
            );

            return $this->candidatePayload($model);
        })->values();

        AuditService::log('google_linkedin_contact_search', 'leads', $lead, null, [
            'candidate_count' => $candidates->count(),
            'query' => $result['query'] ?? null,
        ]);

        return response()->json([
            'message' => $result['message'] ?? 'Google LinkedIn contact candidates loaded.',
            'data' => $candidates,
            'meta' => [
                'query' => $result['query'] ?? null,
                'google' => $result['meta'] ?? [],
            ],
        ]);
    }

    public function addGoogleCandidateToContact(
        Request $request,
        Lead $lead,
        ContactEnrichmentCandidate $candidate
    ): JsonResponse {
        if ((int) $candidate->lead_id !== (int) $lead->id || $candidate->provider !== 'GOOGLE_SEARCH') {
            return response()->json(['message' => 'Contact candidate does not belong to this lead.'], 404);
        }

        if ($candidate->expires_at && $candidate->expires_at->isPast()) {
            return response()->json(['message' => 'This Google search candidate expired. Run search again before adding it.'], 422);
        }

        $contact = $this->mergeGoogleSearchContact($lead, $candidate);
        $candidate->update([
            'status' => 'added',
            'revealed_at' => now(),
        ]);

        AuditService::log('google_linkedin_contact_added', 'lead_contacts', $contact, null, [
            'lead_id' => $lead->id,
            'candidate_id' => $candidate->id,
        ]);

        return response()->json([
            'message' => 'Google search candidate added to this lead contact.',
            'data' => [
                'contact' => $contact->fresh('payloads'),
                'candidate' => $this->candidatePayload($candidate->fresh()),
            ],
        ]);
    }

    public function linkedinCandidates(Request $request, Lead $lead): JsonResponse
    {
        $candidates = $lead->contactEnrichmentCandidates()
            ->where('provider', 'LINKEDIN')
            ->whereIn('status', ['previewed', 'added'])
            ->latest()
            ->limit(20)
            ->get()
            ->map(fn (ContactEnrichmentCandidate $candidate): array => $this->candidatePayload($candidate));

        return response()->json(['data' => $candidates]);
    }

    public function searchLinkedin(Request $request, Lead $lead, LeadContactGoogleSearchService $search): JsonResponse
    {
        $tenantId = $this->currentTenantId($request);
        $linkedinEnabledRecord = IntegrationConfig::where('key', 'LINKEDIN_ENABLED')
            ->where('is_active', true)
            ->where(function ($query) use ($tenantId) {
                $query->whereNull('tenant_id');
                if ($tenantId !== null) {
                    $query->orWhere('tenant_id', $tenantId);
                }
            })
            ->orderByRaw('tenant_id is null')
            ->latest()
            ->first();

        $linkedinEnabled = $linkedinEnabledRecord ? $linkedinEnabledRecord->value : null;

        if ($linkedinEnabled !== true && $linkedinEnabled !== 'true') {
            return response()->json(['message' => 'LinkedIn integration is not enabled. Please enable it in Settings > Integration.'], 422);
        }

        if (empty($lead->company_name)) {
            return response()->json(['message' => 'Lead company name is required before LinkedIn contact search.'], 422);
        }

        $result = $search->search($lead, $tenantId);
        if (! $result['success']) {
            return response()->json(['message' => $result['error'] ?? 'LinkedIn contact search failed.'], 422);
        }

        $candidates = collect($result['candidates'] ?? [])->map(function (array $candidate) use ($lead, $request) {
            $model = ContactEnrichmentCandidate::updateOrCreate(
                [
                    'lead_id' => $lead->id,
                    'provider' => 'LINKEDIN',
                    'provider_candidate_id' => $candidate['provider_candidate_id'],
                ],
                [
                    'created_by' => $request->user()?->id,
                    'name' => $candidate['name'],
                    'title' => $candidate['title'] ?: null,
                    'company_name' => $candidate['company_name'] ?: $lead->company_name,
                    'company_domain' => $candidate['company_domain'] ?: null,
                    'has_email' => false,
                    'has_phone' => false,
                    'reveal_email_credits' => 0,
                    'reveal_phone_credits' => 0,
                    'status' => 'previewed',
                    'raw_preview' => $candidate['raw_preview'] ?? $candidate,
                    'expires_at' => now()->addDays(14),
                ]
            );

            return $this->candidatePayload($model);
        })->values();

        AuditService::log('linkedin_contact_search', 'leads', $lead, null, [
            'candidate_count' => $candidates->count(),
            'query' => $result['query'] ?? null,
        ]);

        return response()->json([
            'message' => $result['message'] ?? 'LinkedIn contact candidates loaded.',
            'data' => $candidates,
            'meta' => [
                'query' => $result['query'] ?? null,
                'google' => $result['meta'] ?? [],
            ],
        ]);
    }

    public function addLinkedinCandidateToContact(
        Request $request,
        Lead $lead,
        ContactEnrichmentCandidate $candidate
    ): JsonResponse {
        if ((int) $candidate->lead_id !== (int) $lead->id || $candidate->provider !== 'LINKEDIN') {
            return response()->json(['message' => 'Contact candidate does not belong to this lead.'], 404);
        }

        if ($candidate->expires_at && $candidate->expires_at->isPast()) {
            return response()->json(['message' => 'This LinkedIn search candidate expired. Run search again before adding it.'], 422);
        }

        $contact = $this->mergeLinkedinContact($lead, $candidate);
        $candidate->update([
            'status' => 'added',
            'revealed_at' => now(),
        ]);

        AuditService::log('linkedin_contact_added', 'lead_contacts', $contact, null, [
            'lead_id' => $lead->id,
            'candidate_id' => $candidate->id,
        ]);

        return response()->json([
            'message' => 'LinkedIn search candidate added to this lead contact.',
            'data' => [
                'contact' => $contact->fresh('payloads'),
                'candidate' => $this->candidatePayload($candidate->fresh()),
            ],
        ]);
    }

    public function lushaCandidates(Request $request, Lead $lead): JsonResponse
    {
        $this->authorizeLushaGate($lead);

        $candidates = $lead->contactEnrichmentCandidates()
            ->where('provider', 'LUSHA')
            ->whereIn('status', ['previewed', 'revealed'])
            ->latest()
            ->limit(20)
            ->get()
            ->map(fn (ContactEnrichmentCandidate $candidate): array => $this->candidatePayload($candidate));

        return response()->json([
            'data' => $candidates,
            'meta' => ['min_score' => self::MIN_LUSHA_SCORE, 'current_score' => $this->currentScore($lead)],
        ]);
    }

    public function searchLusha(Request $request, Lead $lead, LushaProvider $provider): JsonResponse
    {
        $this->authorizeLushaGate($lead);

        if (empty($lead->company_name)) {
            return response()->json(['message' => 'Lead company name is required before Lusha search.'], 422);
        }

        $data = $request->validate([
            'contact_id' => 'nullable|integer|exists:lead_contacts,id',
        ]);

        $contact = null;
        if (! empty($data['contact_id'])) {
            $contact = $lead->contacts()->whereKey($data['contact_id'])->first();
            if (! $contact) {
                return response()->json(['message' => 'Selected contact does not belong to this lead.'], 404);
            }
        }

        try {
            $result = $provider->searchCandidatesForContact($lead, $contact, $this->currentTenantId($request));
        } catch (\Throwable $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }

        $candidates = collect($result['candidates'] ?? [])->map(function (array $candidate) use ($lead, $request) {
            $model = ContactEnrichmentCandidate::updateOrCreate(
                [
                    'lead_id' => $lead->id,
                    'provider' => 'LUSHA',
                    'provider_candidate_id' => $candidate['provider_candidate_id'],
                ],
                [
                    'created_by' => $request->user()?->id,
                    'name' => $candidate['name'],
                    'title' => $candidate['title'],
                    'company_name' => $candidate['company_name'],
                    'company_domain' => $candidate['company_domain'],
                    'has_email' => $candidate['has_email'],
                    'has_phone' => $candidate['has_phone'],
                    'reveal_email_credits' => $candidate['reveal_email_credits'],
                    'reveal_phone_credits' => $candidate['reveal_phone_credits'],
                    'status' => 'previewed',
                    'raw_preview' => $candidate['raw_preview'],
                    'expires_at' => now()->addDays(7),
                ]
            );

            return $this->candidatePayload($model);
        })->values();

        AuditService::log('lusha_contact_preview', 'leads', $lead, null, [
            'contact_id' => $contact?->id,
            'candidate_count' => $candidates->count(),
            'billing' => $result['billing'] ?? null,
        ]);

        return response()->json([
            'message' => 'Lusha contact candidates loaded.',
            'data' => $candidates,
            'meta' => [
                'billing' => $result['billing'] ?? [],
                'rate_limits' => $result['rate_limits'] ?? [],
                'request_id' => $result['request_id'] ?? null,
                'search_identity' => $this->lushaSearchIdentityPayload($lead, $contact),
            ],
        ]);
    }

    public function revealLushaPhone(
        Request $request,
        Lead $lead,
        ContactEnrichmentCandidate $candidate,
        LushaProvider $provider
    ): JsonResponse {
        $this->authorizeLushaGate($lead);

        if ((int) $candidate->lead_id !== (int) $lead->id || $candidate->provider !== 'LUSHA') {
            return response()->json(['message' => 'Contact candidate does not belong to this lead.'], 404);
        }

        if ($candidate->expires_at && $candidate->expires_at->isPast()) {
            return response()->json(['message' => 'This Lusha preview expired. Run search again before revealing phone data.'], 422);
        }

        if (! $candidate->has_phone) {
            return response()->json(['message' => 'This candidate does not report revealable phone data.'], 422);
        }

        try {
            $result = $provider->revealPhones($candidate->provider_candidate_id, $this->currentTenantId($request));
        } catch (\Throwable $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }

        $contactPayload = $result['contact'] ?? [];
        if (empty($contactPayload['phone'])) {
            return response()->json(['message' => 'Lusha did not return a callable phone number for this candidate.'], 422);
        }

        $contact = $this->mergeRevealedContact($lead, $contactPayload, $result['raw'] ?? []);
        $candidate->update([
            'status' => 'revealed',
            'raw_reveal' => $result['raw'] ?? [],
            'revealed_at' => now(),
        ]);

        AuditService::log('lusha_contact_reveal_phone', 'lead_contacts', $contact, null, [
            'lead_id' => $lead->id,
            'candidate_id' => $candidate->id,
            'billing' => $result['billing'] ?? null,
        ]);

        return response()->json([
            'message' => 'Lusha phone revealed and saved to this lead contact.',
            'data' => [
                'contact' => $contact->fresh('payloads'),
                'candidate' => $this->candidatePayload($candidate->fresh()),
            ],
            'meta' => [
                'billing' => $result['billing'] ?? [],
                'rate_limits' => $result['rate_limits'] ?? [],
                'request_id' => $result['request_id'] ?? null,
            ],
        ]);
    }

    private function mergeRevealedContact(Lead $lead, array $payload, array $raw): LeadContact
    {
        $query = $lead->contacts();
        if (! empty($payload['phone'])) {
            $query->where('phone', $payload['phone']);
        } elseif (! empty($payload['email'])) {
            $query->where('email', $payload['email']);
        } else {
            $query->where('name', $payload['name']);
        }

        $contact = $query->first();
        $values = [
            'name' => $payload['name'],
            'title' => $payload['title'] ?? null,
            'email' => $payload['email'] ?? null,
            'phone' => $payload['phone'] ?? null,
            'linkedin_url' => $payload['linkedin_url'] ?? null,
            'confidence_score' => $payload['confidence_score'] ?? 90,
            'confidence' => 'high',
            'source' => 'LUSHA',
        ];

        if ($contact) {
            $contact->update(collect($values)
                ->filter(fn ($value, string $key): bool => $value !== null && empty($contact->{$key}))
                ->all());
        } else {
            $contact = $lead->contacts()->create($values + [
                'is_primary' => ! $lead->contacts()->where('is_primary', true)->exists(),
            ]);
        }

        $contact->payloads()->create([
            'source_type' => 'LUSHA',
            'raw_payload' => $raw,
        ]);

        return $contact;
    }

    private function mergeGoogleSearchContact(Lead $lead, ContactEnrichmentCandidate $candidate): LeadContact
    {
        $raw = $candidate->raw_preview ?? [];
        $linkedinUrl = $raw['linkedin_url'] ?? null;

        $query = $lead->contacts();
        if (! empty($linkedinUrl)) {
            $query->where('linkedin_url', $linkedinUrl);
        } else {
            $query->where('name', $candidate->name);
        }

        $contact = $query->first();
        $values = [
            'name' => $candidate->name,
            'title' => $candidate->title,
            'linkedin_url' => $linkedinUrl,
            'confidence_score' => $raw['confidence_score'] ?? 70,
            'confidence' => (($raw['confidence_score'] ?? 70) >= 80) ? 'high' : 'medium',
            'source' => 'GOOGLE_SEARCH',
        ];

        if ($contact) {
            $contact->update(collect($values)
                ->filter(fn ($value, string $key): bool => $value !== null && empty($contact->{$key}))
                ->all());
        } else {
            $contact = $lead->contacts()->create($values + [
                'is_primary' => ! $lead->contacts()->where('is_primary', true)->exists(),
            ]);
        }

        $contact->payloads()->create([
            'source_type' => 'GOOGLE_LINKEDIN_SEARCH',
            'raw_payload' => $raw,
        ]);

        return $contact;
     }

     private function mergeLinkedinContact(Lead $lead, ContactEnrichmentCandidate $candidate): LeadContact
     {
         $raw = $candidate->raw_preview ?? [];
         $linkedinUrl = $raw['linkedin_url'] ?? null;

         $query = $lead->contacts();
         if (! empty($linkedinUrl)) {
             $query->where('linkedin_url', $linkedinUrl);
         } else {
             $query->where('name', $candidate->name);
         }

         $contact = $query->first();
         $values = [
             'name' => $candidate->name,
             'title' => $candidate->title,
             'linkedin_url' => $linkedinUrl,
             'confidence_score' => $raw['confidence_score'] ?? 70,
             'confidence' => (($raw['confidence_score'] ?? 70) >= 80) ? 'high' : 'medium',
             'source' => 'LINKEDIN',
         ];

         if ($contact) {
             $contact->update(collect($values)
                 ->filter(fn ($value, string $key): bool => $value !== null && empty($contact->{$key}))
                 ->all());
         } else {
             $contact = $lead->contacts()->create($values + [
                 'is_primary' => ! $lead->contacts()->where('is_primary', true)->exists(),
             ]);
         }

         $contact->payloads()->create([
             'source_type' => 'LINKEDIN_SEARCH',
             'raw_payload' => $raw,
         ]);

         return $contact;
     }

    private function authorizeLushaGate(Lead $lead): void
    {
        abort_if($this->currentScore($lead) < self::MIN_LUSHA_SCORE, 422, 'Lusha enrichment is available after the lead reaches an initial score of 60.');
    }

    private function currentScore(Lead $lead): int
    {
        $latestScore = $lead->scores()->latest('calculated_at')->value('score');

        return (int) max($lead->lead_score ?? 0, $latestScore ?? 0);
    }

    private function currentTenantId(Request $request): ?int
    {
        return $request->user()?->tenant_id
            ?? auth('sanctum')->user()?->tenant_id;
    }

    private function candidatePayload(ContactEnrichmentCandidate $candidate): array
    {
        return [
            'id' => $candidate->id,
            'provider' => $candidate->provider,
            'provider_candidate_id' => $candidate->provider_candidate_id,
            'name' => $candidate->name,
            'title' => $candidate->title,
            'company_name' => $candidate->company_name,
            'company_domain' => $candidate->company_domain,
            'has_email' => $candidate->has_email,
            'has_phone' => $candidate->has_phone,
            'reveal_email_credits' => $candidate->reveal_email_credits,
            'reveal_phone_credits' => $candidate->reveal_phone_credits,
            'status' => $candidate->status,
            'expires_at' => $candidate->expires_at,
            'revealed_at' => $candidate->revealed_at,
            'linkedin_url' => $candidate->raw_preview['linkedin_url'] ?? null,
            'linkedin_id' => $candidate->raw_preview['linkedin_id'] ?? null,
            'confidence_score' => $candidate->raw_preview['confidence_score'] ?? null,
            'relevance_reason' => $candidate->raw_preview['relevance_reason'] ?? null,
            'evidence' => $candidate->raw_preview['evidence'] ?? null,
        ];
    }

    private function lushaSearchIdentityPayload(Lead $lead, ?LeadContact $contact): array
    {
        $nameParts = preg_split('/\s+/', trim((string) $contact?->name), 2, PREG_SPLIT_NO_EMPTY);

        return [
            'contact_id' => $contact?->id,
            'linkedin_url' => $contact?->linkedin_url,
            'email' => $contact?->email,
            'first_name' => $nameParts[0] ?? null,
            'last_name' => $nameParts[1] ?? null,
            'company_name' => $lead->company_name,
            'company_domain' => $lead->website_domain,
        ];
    }
}
