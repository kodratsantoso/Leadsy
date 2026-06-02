<?php

namespace App\Services\Enrichment\Providers;

use App\Contracts\ContactEnrichmentProviderInterface;
use App\Models\Lead;
use App\Models\LeadContact;
use App\Models\IntegrationConfig;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class LushaProvider implements ContactEnrichmentProviderInterface
{
    private bool $enabled;

    private string $apiKey;

    public function __construct()
    {
        $this->enabled = (bool) (IntegrationConfig::where('key', 'LUSHA_ENABLED')->first()?->value ?? false);
        $this->apiKey = (string) (IntegrationConfig::where('key', 'LUSHA_API_KEY')->first()?->value ?? '');
    }

    public function isEnabled(): bool
    {
        return $this->enabled;
    }

    public function getIdentifier(): string
    {
        return 'LUSHA';
    }

    public function searchContacts(string $companyName, ?string $domain): array
    {
        Log::info("[LushaProvider] Querying contacts for {$companyName} ({$domain})");

        Log::info('[LushaProvider] Legacy automatic enrichment is disabled. Use the V3 preview/reveal workflow.');

        return [];
    }

    public function searchCandidates(Lead $lead, ?int $tenantId = null): array
    {
        return $this->searchCandidatesForContact($lead, null, $tenantId);
    }

    public function searchCandidatesForContact(Lead $lead, ?LeadContact $contact = null, ?int $tenantId = null): array
    {
        $this->assertEnabled($tenantId);

        $clientReferenceId = 'lead-'.$lead->id.'-'.Str::slug($lead->company_name).'-'.now()->format('YmdHis');
        $contactPayload = [
            'clientReferenceId' => $clientReferenceId,
            'companyName' => $lead->company_name,
        ];

        if (! empty($lead->website_domain)) {
            $contactPayload['companyDomain'] = $lead->website_domain;
        }

        if ($contact) {
            $contactPayload = array_filter($contactPayload + $this->contactSearchIdentity($contact), fn ($value) => $value !== null && $value !== '');
        }

        $payload = [
            'contacts' => [$contactPayload],
        ];

        $response = $this->client($tenantId)->post('https://api.lusha.com/v3/contacts/search', $payload);
        if (! $response->successful()) {
            $this->throwProviderException($response->status(), $response->json('message') ?? 'Lusha contact search failed.');
        }

        return [
            'request_id' => $response->json('requestId'),
            'billing' => $response->json('billing') ?? [],
            'rate_limits' => $this->rateLimitHeaders($response->headers()),
            'candidates' => collect($response->json('results') ?? [])
                ->map(fn (array $candidate): array => $this->normalizePreviewCandidate($candidate))
                ->filter(fn (array $candidate): bool => ! empty($candidate['provider_candidate_id']) && ! empty($candidate['name']))
                ->values()
                ->all(),
        ];
    }

    public function revealPhones(string $providerCandidateId, ?int $tenantId = null): array
    {
        $this->assertEnabled($tenantId);

        $response = $this->client($tenantId)->post('https://api.lusha.com/v3/contacts/enrich', [
            'ids' => [$providerCandidateId],
            'reveal' => ['phones'],
        ]);

        if (! $response->successful()) {
            $this->throwProviderException($response->status(), $response->json('message') ?? 'Lusha contact reveal failed.');
        }

        $result = $response->json('results.0') ?? [];

        return [
            'request_id' => $response->json('requestId'),
            'billing' => $response->json('billing') ?? [],
            'rate_limits' => $this->rateLimitHeaders($response->headers()),
            'contact' => $this->normalizeRevealedContact($result),
            'raw' => $result,
        ];
    }

    public function accountUsage(?int $tenantId = null): array
    {
        $this->assertEnabled($tenantId);

        $response = $this->client($tenantId)->get('https://api.lusha.com/v3/account/usage');
        if (! $response->successful()) {
            $this->throwProviderException($response->status(), $response->json('message') ?? 'Lusha account usage check failed.');
        }

        return $response->json() ?? [];
    }

    private function normalizePreviewCandidate(array $candidate): array
    {
        $canReveal = collect($candidate['canReveal'] ?? []);
        $emailReveal = $canReveal->firstWhere('field', 'emails');
        $phoneReveal = $canReveal->firstWhere('field', 'phones');
        $has = collect($candidate['has'] ?? []);
        $firstName = $candidate['firstName'] ?? '';
        $lastName = $candidate['lastName'] ?? '';
        $name = trim($firstName.' '.$lastName);

        return [
            'provider_candidate_id' => (string) ($candidate['id'] ?? ''),
            'name' => $name,
            'title' => $candidate['jobTitle']['title'] ?? null,
            'company_name' => $candidate['company']['name'] ?? null,
            'company_domain' => $candidate['company']['domain'] ?? null,
            'has_email' => $has->contains('emails') || $emailReveal !== null,
            'has_phone' => $has->contains('phones') || $phoneReveal !== null,
            'reveal_email_credits' => (int) ($emailReveal['credits'] ?? 0),
            'reveal_phone_credits' => (int) ($phoneReveal['credits'] ?? 0),
            'raw_preview' => $candidate,
        ];
    }

    private function contactSearchIdentity(LeadContact $contact): array
    {
        [$firstName, $lastName] = $this->splitName($contact->name);

        return [
            'id' => $this->lushaPersonId($contact),
            'linkedinUrl' => $contact->linkedin_url,
            'email' => $contact->email,
            'firstName' => $firstName,
            'lastName' => $lastName,
        ];
    }

    private function lushaPersonId(LeadContact $contact): ?string
    {
        $payload = $contact->payloads()
            ->where('source_type', 'LUSHA')
            ->latest()
            ->value('raw_payload');

        if (! is_array($payload)) {
            return null;
        }

        return $payload['provider_candidate_id']
            ?? $payload['id']
            ?? $payload['personId']
            ?? null;
    }

    private function splitName(?string $name): array
    {
        $parts = preg_split('/\s+/', trim((string) $name), 2, PREG_SPLIT_NO_EMPTY);

        return [
            $parts[0] ?? null,
            $parts[1] ?? null,
        ];
    }

    private function normalizeRevealedContact(array $contact): array
    {
        $firstName = $contact['firstName'] ?? '';
        $lastName = $contact['lastName'] ?? '';
        $name = $contact['fullName'] ?? trim($firstName.' '.$lastName);
        $phone = collect($contact['phones'] ?? [])
            ->first(fn ($phone): bool => empty($phone['doNotCall']) && ! empty($phone['number']));
        $email = collect($contact['emails'] ?? [])
            ->first(fn ($email): bool => ($email['type'] ?? null) === 'work' && ! empty($email['email']))
            ?? collect($contact['emails'] ?? [])->first(fn ($email): bool => ! empty($email['email']));

        return [
            'provider_candidate_id' => (string) ($contact['id'] ?? ''),
            'name' => $name,
            'title' => $contact['jobTitle']['title'] ?? null,
            'email' => $email['email'] ?? null,
            'phone' => $phone['number'] ?? null,
            'linkedin_url' => $contact['socialLinks']['linkedin'] ?? null,
            'confidence_score' => ! empty($phone['number']) ? 90 : 70,
        ];
    }

    private function client(?int $tenantId)
    {
        return Http::withHeaders([
            'api_key' => $this->apiKey($tenantId),
            'Accept' => 'application/json',
            'Content-Type' => 'application/json',
        ])->timeout(20);
    }

    private function assertEnabled(?int $tenantId): void
    {
        if (! $this->enabled($tenantId)) {
            throw new \RuntimeException('Lusha Contact Discovery is disabled.');
        }

        if ($this->apiKey($tenantId) === '') {
            throw new \RuntimeException('Lusha API key is not configured.');
        }
    }

    private function enabled(?int $tenantId): bool
    {
        $value = $this->configValue('LUSHA_ENABLED', $tenantId);

        return $value === true || $value === 'true' || $value === 1 || $value === '1';
    }

    private function apiKey(?int $tenantId): string
    {
        return (string) ($this->configValue('LUSHA_API_KEY', $tenantId) ?? '');
    }

    private function configValue(string $key, ?int $tenantId): mixed
    {
        return IntegrationConfig::query()
            ->where('key', $key)
            ->where(function ($query) use ($tenantId) {
                $query->whereNull('tenant_id');

                if ($tenantId !== null) {
                    $query->orWhere('tenant_id', $tenantId);
                }
            })
            ->get()
            ->sortBy(fn (IntegrationConfig $config) => $config->tenant_id === $tenantId ? 0 : 1)
            ->first()?->value;
    }

    private function rateLimitHeaders(array $headers): array
    {
        return collect($headers)
            ->mapWithKeys(fn (array $value, string $key): array => [Str::lower($key) => $value[0] ?? null])
            ->only([
                'x-rate-limit-daily',
                'x-daily-requests-left',
                'x-daily-usage',
                'x-rate-limit-hourly',
                'x-hourly-requests-left',
                'x-hourly-usage',
                'x-rate-limit-minute',
                'x-minute-requests-left',
                'x-minute-usage',
            ])
            ->filter()
            ->all();
    }

    private function throwProviderException(int $status, string $message): never
    {
        $context = match ($status) {
            401 => 'Invalid or missing Lusha API key.',
            402 => 'Lusha credits are insufficient for this request.',
            403 => 'Lusha account is inactive or forbidden.',
            429 => 'Lusha rate limit or daily quota was exceeded.',
            451 => 'Lusha blocked this request for legal/privacy reasons.',
            default => $message,
        };

        throw new \RuntimeException($context);
    }
}
