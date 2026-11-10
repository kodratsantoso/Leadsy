<?php

namespace App\Services\Enrichment\Providers;

use App\Contracts\ContactEnrichmentProviderInterface;
use App\Models\IntegrationConfig;
use App\Models\Lead;
use App\Models\LeadContact;
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
        return $this->enabled(null);
    }

    public function isEnabledForTenant(?int $tenantId = null): bool
    {
        return $this->enabled($tenantId);
    }

    public function isConfigured(?int $tenantId = null): bool
    {
        return $this->enabled($tenantId) && $this->apiKey($tenantId) !== '';
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

        $contactPayloads = [];

        if ($contact) {
            $clientReferenceId = 'lead-'.$lead->id.'-c-'.$contact->id.'-'.now()->format('YmdHis');
            $contactPayload = [
                'clientReferenceId' => $clientReferenceId,
                'companyName' => $lead->company_name,
            ];

            if (! empty($lead->website_domain)) {
                $contactPayload['companyDomain'] = $this->cleanDomain($lead->website_domain);
            }

            $contactPayload = array_filter(
                $contactPayload + $this->contactSearchIdentity($contact),
                fn ($value) => $value !== null && $value !== ''
            );

            $contactPayloads[] = $contactPayload;
        } else {
            // If lead already has contacts, search Lusha in bulk for all existing contacts
            $existingContacts = $lead->contacts()->get();

            if ($existingContacts->isNotEmpty()) {
                foreach ($existingContacts as $ec) {
                    $identity = $this->contactSearchIdentity($ec);
                    if (! empty($identity['linkedinUrl']) || ! empty($identity['email']) || ! empty($identity['firstName'])) {
                        $clientRef = 'lead-'.$lead->id.'-c-'.$ec->id.'-'.now()->format('YmdHis');
                        $item = array_filter([
                            'clientReferenceId' => $clientRef,
                            'companyName' => $lead->company_name,
                            'companyDomain' => $this->cleanDomain($lead->website_domain),
                        ] + $identity, fn ($v) => $v !== null && $v !== '');

                        $contactPayloads[] = $item;
                    }
                }
            }

            // If no existing contacts, or none had identifiers, search by company identity
            if (empty($contactPayloads)) {
                $clientReferenceId = 'lead-'.$lead->id.'-'.Str::slug($lead->company_name).'-'.now()->format('YmdHis');
                $contactPayload = [
                    'clientReferenceId' => $clientReferenceId,
                    'companyName' => $lead->company_name,
                ];

                if (! empty($lead->website_domain)) {
                    $contactPayload['companyDomain'] = $this->cleanDomain($lead->website_domain);
                }

                $contactPayloads[] = $contactPayload;
            }
        }

        $payload = [
            'contacts' => array_values($contactPayloads),
        ];

        $response = $this->client($tenantId)->post('https://api.lusha.com/v3/contacts/search', $payload);
        if (! $response->successful()) {
            $this->throwProviderException($response->status(), $response->json('message') ?? 'Lusha contact search failed.');
        }

        $candidates = collect($response->json('results') ?? [])
            ->map(fn (array $candidate): array => $this->normalizePreviewCandidate($candidate))
            ->filter(fn (array $candidate): bool => ! empty($candidate['provider_candidate_id']) && ! empty($candidate['name']))
            ->values()
            ->all();

        // If contact search returned no candidates and company has domain/name, try prospecting
        if (empty($candidates) && ! $contact) {
            $prospectResult = $this->prospectCandidatesByCompany($lead, $tenantId);
            if (! empty($prospectResult['candidates'])) {
                return $prospectResult;
            }
        }

        return [
            'request_id' => $response->json('requestId'),
            'billing' => $response->json('billing') ?? [],
            'rate_limits' => $this->rateLimitHeaders($response->headers()),
            'candidates' => $candidates,
        ];
    }

    private function prospectCandidatesByCompany(Lead $lead, ?int $tenantId = null): array
    {
        $domain = $this->cleanDomain($lead->website_domain);
        $companyName = trim((string) $lead->company_name);

        // Try Lusha prospecting API if domain or company name exists
        if (! empty($domain) || ! empty($companyName)) {
            $filterCompanies = [];
            if (! empty($domain)) {
                $filterCompanies['domains'] = [$domain];
            }
            if (! empty($companyName)) {
                $filterCompanies['names'] = [$companyName];
            }

            try {
                $prospectResponse = $this->client($tenantId)->post('https://api.lusha.com/v3/contacts/prospecting', [
                    'pagination' => ['page' => 0, 'size' => 15],
                    'filters' => [
                        'companies' => $filterCompanies,
                    ],
                ]);

                if ($prospectResponse->successful()) {
                    $results = $prospectResponse->json('results') ?? $prospectResponse->json('data') ?? [];
                    if (! empty($results)) {
                        return [
                            'request_id' => $prospectResponse->json('requestId'),
                            'billing' => $prospectResponse->json('billing') ?? [],
                            'rate_limits' => $this->rateLimitHeaders($prospectResponse->headers()),
                            'candidates' => collect($results)
                                ->map(fn (array $candidate): array => $this->normalizePreviewCandidate($candidate))
                                ->filter(fn (array $candidate): bool => ! empty($candidate['provider_candidate_id']))
                                ->values()
                                ->all(),
                        ];
                    }
                }
            } catch (\Throwable $e) {
                Log::warning('[LushaProvider] Prospecting fallback error: '.$e->getMessage());
            }
        }

        // If no contacts existed and prospecting didn't find results, explain clearly
        return [
            'request_id' => null,
            'billing' => ['resultsReturned' => 0, 'creditsCharged' => 0],
            'rate_limits' => [],
            'candidates' => [],
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

    public function searchAndEnrichPhoneForContact(Lead $lead, LeadContact $contact, ?int $tenantId = null): array
    {
        $this->assertEnabled($tenantId);

        [$firstName, $lastName] = $this->splitCleanName($contact->name);

        $clientReferenceId = 'lead-'.$lead->id.'-c-'.$contact->id.'-'.now()->format('YmdHis');

        $contactPayload = array_filter([
            'clientReferenceId' => $clientReferenceId,
            'firstName' => $firstName,
            'lastName' => $lastName,
            'companyName' => $lead->company_name,
            'companyDomain' => $this->cleanDomain($lead->website_domain),
            'linkedinUrl' => $this->normalizeLinkedinUrl($contact->linkedin_url),
            'email' => $contact->email ? trim(strtolower($contact->email)) : null,
        ], fn ($val) => $val !== null && $val !== '');

        $payload = [
            'contacts' => [$contactPayload],
            'reveal' => ['phones'],
        ];

        try {
            $response = $this->client($tenantId)->post('https://api.lusha.com/v3/contacts/search-and-enrich', $payload);
        } catch (\Throwable $e) {
            return [
                'success' => false,
                'status' => 500,
                'error_code' => 'CONNECTION_ERROR',
                'message' => 'Gagal terhubung ke Lusha API: ' . $e->getMessage(),
                'lusha_response' => ['exception' => $e->getMessage()],
                'request_sent' => $payload,
            ];
        }

        $status = $response->status();
        $json = $response->json() ?? [];

        if (! $response->successful()) {
            $msg = $json['message'] ?? $json['error'] ?? "Lusha API request failed with HTTP {$status}";
            return [
                'success' => false,
                'status' => $status,
                'error_code' => 'LUSHA_HTTP_ERROR',
                'message' => $msg,
                'lusha_response' => $json,
                'request_sent' => $payload,
            ];
        }

        $result = $json['results'][0] ?? [];
        $resultStatus = strtoupper((string) ($result['status'] ?? ''));

        if ($resultStatus === 'NOT_FOUND' || (empty($result['phones']) && empty($result['phone']))) {
            return [
                'success' => false,
                'status' => 200,
                'error_code' => 'CONTACT_NOT_FOUND',
                'message' => 'Lusha tidak menemukan data nomor telepon untuk profil kontak ini di databasenya.',
                'lusha_response' => $json,
                'request_sent' => $payload,
            ];
        }

        $normalized = $this->normalizeRevealedContact($result);

        if (empty($normalized['phone'])) {
            return [
                'success' => false,
                'status' => 200,
                'error_code' => 'PHONE_UNAVAILABLE',
                'message' => 'Lusha mengembalikan profil kontak, namun nomor telepon tidak tersedia atau dibatasi kebijakan privasi.',
                'lusha_response' => $json,
                'request_sent' => $payload,
            ];
        }

        return [
            'success' => true,
            'status' => 200,
            'phone' => $normalized['phone'],
            'contact_data' => $normalized,
            'billing' => $json['billing'] ?? [],
            'rate_limits' => $this->rateLimitHeaders($response->headers()),
            'raw' => $result,
            'request_sent' => $payload,
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
        $emailReveal = $canReveal->first(fn ($r) => in_array($r['field'] ?? '', ['emails', 'email'], true));
        $phoneReveal = $canReveal->first(fn ($r) => in_array($r['field'] ?? '', ['phones', 'phone', 'phoneNumbers'], true));
        $has = collect($candidate['has'] ?? []);

        $firstName = $candidate['firstName'] ?? '';
        $lastName = $candidate['lastName'] ?? '';
        $name = $candidate['fullName'] ?? $candidate['name'] ?? trim($firstName.' '.$lastName);
        if (empty($name)) {
            $name = 'Lusha Contact';
        }

        $targetContactId = null;
        if (! empty($candidate['clientReferenceId']) && preg_match('/-c-(\d+)-/', (string) $candidate['clientReferenceId'], $matches)) {
            $targetContactId = (int) $matches[1];
        }

        return [
            'provider_candidate_id' => (string) ($candidate['id'] ?? ''),
            'name' => $name,
            'title' => $candidate['jobTitle']['title'] ?? $candidate['jobTitle'] ?? null,
            'company_name' => $candidate['company']['name'] ?? null,
            'company_domain' => $candidate['company']['domain'] ?? null,
            'has_email' => $has->contains('emails') || $has->contains('email') || $emailReveal !== null,
            'has_phone' => $has->contains('phones') || $has->contains('phone') || $has->contains('phoneNumbers') || $phoneReveal !== null,
            'reveal_email_credits' => (int) ($emailReveal['credits'] ?? 0),
            'reveal_phone_credits' => (int) ($phoneReveal['credits'] ?? 0),
            'target_contact_id' => $targetContactId,
            'raw_preview' => $candidate + ($targetContactId ? ['target_contact_id' => $targetContactId] : []),
        ];
    }

    private function contactSearchIdentity(LeadContact $contact): array
    {
        [$firstName, $lastName] = $this->splitCleanName($contact->name);

        return [
            'id' => $this->lushaPersonId($contact),
            'linkedinUrl' => $this->normalizeLinkedinUrl($contact->linkedin_url),
            'email' => $contact->email ? trim(strtolower($contact->email)) : null,
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

    private function splitCleanName(?string $name): array
    {
        if (empty($name)) {
            return [null, null];
        }

        // 1. Remove bracketed notes like (Director) or (PT Acme)
        $clean = preg_replace('/\s*[\(\[\{].*?[\)\]\}]\s*/', ' ', $name);

        // 2. Remove title suffixes after comma or dash (e.g. "Budi Santoso, S.Kom, M.M.")
        $clean = preg_replace('/,.*$/', '', $clean);
        $clean = preg_replace('/\s+-\s+.*$/', '', $clean);

        // 3. Remove common academic / professional prefixes
        $prefixes = [
            'dr\.', 'dr', 'drs\.', 'drs', 'dra\.', 'dra', 'ir\.', 'ir', 'prof\.', 'prof',
            'h\.', 'hj\.', 'bpk\.', 'bpk', 'bapak', 'ibu', 'mr\.', 'mr', 'ms\.', 'ms', 'mrs\.', 'mrs',
        ];
        $prefixPattern = '/\b('.implode('|', $prefixes).')\b\.?\s*/i';
        $clean = preg_replace($prefixPattern, '', $clean);

        // 4. Remove common degrees / suffixes at word boundaries
        $suffixes = [
            's\.kom', 's\.t', 's\.e', 's\.h', 's\.si', 's\.sos', 's\.ked',
            'm\.m', 'm\.kom', 'm\.t', 'm\.ba', 'mba', 'ph\.d', 'phd', 'msc', 'bsc', 'cpa', 'cfa',
        ];
        $suffixPattern = '/\b('.implode('|', $suffixes).')\b\.?/i';
        $clean = preg_replace($suffixPattern, '', $clean);

        $parts = preg_split('/\s+/', trim((string) $clean), 2, PREG_SPLIT_NO_EMPTY);
        $firstName = $parts[0] ?? null;
        $lastName = $parts[1] ?? null;

        // If single name (very common in Indonesia, e.g. "Budi"), Lusha requires both firstName and lastName
        // when matching by name with company, so we replicate the single name for lastName.
        if (! empty($firstName) && empty($lastName)) {
            $lastName = $firstName;
        }

        return [$firstName, $lastName];
    }

    private function cleanDomain(?string $domain): ?string
    {
        if (empty($domain)) {
            return null;
        }

        $clean = trim(strtolower($domain));
        $clean = preg_replace('#^https?://#i', '', $clean);
        $clean = preg_replace('#^www\.#i', '', $clean);
        $clean = preg_replace('#/.*$#', '', $clean);

        return $clean ?: null;
    }

    private function normalizeLinkedinUrl(?string $url): ?string
    {
        if (empty($url)) {
            return null;
        }

        $url = trim($url);
        // Normalize regional subdomains like id.linkedin.com to www.linkedin.com
        $url = preg_replace('#^(https?://)?[a-z]{2}\.linkedin\.com#i', 'https://www.linkedin.com', $url);
        if (! preg_match('#^https?://#i', $url)) {
            $url = 'https://' . ltrim($url, '/');
        }

        // Strip query strings and trailing slashes
        $parts = parse_url($url);
        if (! empty($parts['path'])) {
            $cleanPath = rtrim($parts['path'], '/');
            return 'https://www.linkedin.com' . $cleanPath;
        }

        return $url;
    }

    private function normalizeRevealedContact(array $contact): array
    {
        $firstName = $contact['firstName'] ?? '';
        $lastName = $contact['lastName'] ?? '';
        $name = $contact['fullName'] ?? $contact['name'] ?? trim($firstName.' '.$lastName);
        if (empty($name)) {
            $name = 'Lusha Contact';
        }

        // Robust phone extraction: handle array of phone objects or scalar numbers
        $rawPhones = collect($contact['phones'] ?? $contact['phoneNumbers'] ?? []);
        if ($rawPhones->isEmpty() && ! empty($contact['phone'])) {
            $rawPhones = collect([['number' => $contact['phone'], 'type' => 'DIRECT']]);
        }

        // Prefer mobile/direct line without DNC, then any non-DNC, then any line (so credit is never wasted)
        $selectedPhoneObj = $rawPhones->first(function ($p): bool {
            $num = is_array($p) ? ($p['number'] ?? $p['internationalNumber'] ?? $p['phone'] ?? '') : (string) $p;
            $type = is_array($p) ? strtoupper((string) ($p['type'] ?? '')) : '';
            $dnc = is_array($p) ? ! empty($p['doNotCall']) : false;
            return ! empty($num) && ! $dnc && in_array($type, ['MOBILE', 'DIRECT', 'WORK'], true);
        })
        ?? $rawPhones->first(function ($p): bool {
            $num = is_array($p) ? ($p['number'] ?? $p['internationalNumber'] ?? $p['phone'] ?? '') : (string) $p;
            $dnc = is_array($p) ? ! empty($p['doNotCall']) : false;
            return ! empty($num) && ! $dnc;
        })
        ?? $rawPhones->first(function ($p): bool {
            $num = is_array($p) ? ($p['number'] ?? $p['internationalNumber'] ?? $p['phone'] ?? '') : (string) $p;
            return ! empty($num);
        });

        $phoneNumber = null;
        if (is_array($selectedPhoneObj)) {
            $phoneNumber = $selectedPhoneObj['number'] ?? $selectedPhoneObj['internationalNumber'] ?? $selectedPhoneObj['phone'] ?? null;
        } elseif (is_string($selectedPhoneObj)) {
            $phoneNumber = $selectedPhoneObj;
        }

        if (! empty($phoneNumber)) {
            $phoneNumber = trim((string) $phoneNumber);
        }

        // Extract email
        $emails = collect($contact['emails'] ?? $contact['emailAddresses'] ?? []);
        if ($emails->isEmpty() && ! empty($contact['email'])) {
            $emails = collect([['email' => $contact['email'], 'type' => 'work']]);
        }

        $emailObj = $emails->first(fn ($e): bool => is_array($e) && ($e['type'] ?? '') === 'work' && ! empty($e['email']))
            ?? $emails->first(fn ($e): bool => (is_array($e) && ! empty($e['email'])) || is_string($e));

        $emailAddress = null;
        if (is_array($emailObj)) {
            $emailAddress = $emailObj['email'] ?? null;
        } elseif (is_string($emailObj)) {
            $emailAddress = $emailObj;
        }

        return [
            'provider_candidate_id' => (string) ($contact['id'] ?? ''),
            'name' => $name,
            'title' => $contact['jobTitle']['title'] ?? $contact['jobTitle'] ?? null,
            'email' => $emailAddress ? trim($emailAddress) : null,
            'phone' => $phoneNumber,
            'linkedin_url' => $this->normalizeLinkedinUrl($contact['socialLinks']['linkedin'] ?? $contact['linkedinUrl'] ?? null),
            'confidence_score' => ! empty($phoneNumber) ? 90 : 70,
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
            throw new \RuntimeException('Lusha integration is not enabled. Please enable it in Settings > Integration.');
        }

        if ($this->apiKey($tenantId) === '') {
            throw new \RuntimeException('Lusha API key is not configured. Please set your Lusha API Key in Settings > Integration.');
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
