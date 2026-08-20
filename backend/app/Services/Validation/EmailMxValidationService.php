<?php

namespace App\Services\Validation;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class EmailMxValidationService
{
    private const CACHE_TTL_HOURS = 24;

    /**
     * Validate that a domain has valid MX records (accepts email).
     *
     * @return array{valid: bool, mx_hosts: string[], domain: string, cached: bool}
     */
    public function validateDomain(string $domain): array
    {
        $domain = strtolower(trim($domain));
        if ($domain === '') {
            return ['valid' => false, 'mx_hosts' => [], 'domain' => $domain, 'cached' => false];
        }

        $cacheKey = "mx_validation_{$domain}";
        $cached = Cache::get($cacheKey);

        if ($cached !== null) {
            return array_merge($cached, ['cached' => true]);
        }

        try {
            $hasMx = checkdnsrr($domain, 'MX');
            $mxHosts = [];

            if ($hasMx) {
                $records = dns_get_record($domain, DNS_MX);
                if (is_array($records)) {
                    // Sort by priority (lowest = highest priority)
                    usort($records, fn ($a, $b) => ($a['pri'] ?? 999) - ($b['pri'] ?? 999));
                    $mxHosts = array_map(fn ($r) => $r['target'] ?? '', $records);
                    $mxHosts = array_filter($mxHosts, fn ($h) => $h !== '');
                }
            }

            $result = [
                'valid' => $hasMx && ! empty($mxHosts),
                'mx_hosts' => array_values($mxHosts),
                'domain' => $domain,
            ];

            Cache::put($cacheKey, $result, now()->addHours(self::CACHE_TTL_HOURS));

            return array_merge($result, ['cached' => false]);
        } catch (\Throwable $e) {
            Log::warning("[MxValidation] DNS lookup failed for {$domain}: {$e->getMessage()}");

            return ['valid' => false, 'mx_hosts' => [], 'domain' => $domain, 'cached' => false];
        }
    }

    /**
     * Validate an email address's domain MX records.
     *
     * @return array{valid: bool, email: string, domain: string, mx_hosts: string[]}
     */
    public function validateEmail(string $email): array
    {
        $email = strtolower(trim($email));
        $parts = explode('@', $email, 2);

        if (count($parts) !== 2 || $parts[0] === '' || $parts[1] === '') {
            return ['valid' => false, 'email' => $email, 'domain' => '', 'mx_hosts' => []];
        }

        $domainResult = $this->validateDomain($parts[1]);

        return [
            'valid' => $domainResult['valid'],
            'email' => $email,
            'domain' => $parts[1],
            'mx_hosts' => $domainResult['mx_hosts'],
        ];
    }

    /**
     * Generate email pattern candidates for a person name + company domain.
     *
     * @return string[] Array of email candidates (e.g., first.last@domain.com, flast@domain.com)
     */
    public function generateEmailCandidates(string $fullName, string $domain): array
    {
        $domain = strtolower(trim($domain));
        if ($domain === '' || $fullName === '') {
            return [];
        }

        $nameParts = $this->parseNameParts($fullName);
        $firstName = $nameParts['first'];
        $lastName = $nameParts['last'];

        if ($firstName === '') {
            return [];
        }

        $candidates = [];

        // Pattern 1: first.last@domain (most common)
        if ($lastName !== '') {
            $candidates[] = "{$firstName}.{$lastName}@{$domain}";
        }

        // Pattern 2: flast@domain
        if ($lastName !== '') {
            $candidates[] = $firstName[0] . "{$lastName}@{$domain}";
        }

        // Pattern 3: first@domain
        $candidates[] = "{$firstName}@{$domain}";

        // Pattern 4: firstl@domain
        if ($lastName !== '') {
            $candidates[] = "{$firstName}" . $lastName[0] . "@{$domain}";
        }

        // Pattern 5: first_last@domain
        if ($lastName !== '') {
            $candidates[] = "{$firstName}_{$lastName}@{$domain}";
        }

        // Pattern 6: last.first@domain (some companies use this)
        if ($lastName !== '') {
            $candidates[] = "{$lastName}.{$firstName}@{$domain}";
        }

        return array_values(array_unique($candidates));
    }

    /**
     * Parse a full name into first and last name components.
     * Handles: "John Doe", "John William Doe", "Mr. John Doe"
     *
     * @return array{first: string, last: string}
     */
    private function parseNameParts(string $fullName): array
    {
        // Remove common prefixes/suffixes
        $clean = preg_replace('/\b(Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.|Ir\.|S\.T\.|S\.E\.|MBA|S\.Kom|M\.M\.|SE|ST|MM)\b/i', '', $fullName) ?? $fullName;
        $clean = preg_replace('/\s+/', ' ', trim($clean));

        // Transliterate accents to ASCII for email
        $clean = Str::ascii($clean);
        $clean = strtolower($clean);

        // Remove any remaining non-alpha characters except space
        $clean = preg_replace('/[^a-z\s]/', '', $clean) ?? $clean;
        $clean = trim($clean);

        $parts = array_values(array_filter(explode(' ', $clean)));

        if (empty($parts)) {
            return ['first' => '', 'last' => ''];
        }

        $first = $parts[0];
        $last = count($parts) > 1 ? end($parts) : '';

        return ['first' => $first, 'last' => $last];
    }
}
