<?php

namespace App\Services\Search;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Reads a company's own website: the homepage plus its About and Contact pages.
 *
 * Search snippets are capped at a couple of hundred characters, which is why profiles
 * stayed thin even when search worked: the phone number, email, founding year and
 * product lines sit on the company's own pages, which nothing ever opened. ChatGPT's
 * browsing reads those pages; this gives every AI provider Leadsy routes to the same
 * material.
 *
 * The URL comes from search results, so it is treated as untrusted:
 *  - only http/https on the default ports;
 *  - every hop (including redirects) must resolve to a public IPv4 address, and the
 *    connection is pinned to that address so DNS cannot be swapped between check and use;
 *  - robots.txt is respected; responses are size-capped and must be HTML.
 */
class CompanyPageFetcher
{
    private const USER_AGENT = 'LeadsyResearchBot/1.0 (+https://leadsy.virtuenet.space)';

    private const MAX_BYTES = 1_500_000;

    private const MAX_REDIRECTS = 3;

    private const MAX_TEXT_PER_PAGE = 4000;

    private const ABOUT_PATTERN = '/about|tentang|profil|profile|company|perusahaan|who-we-are|sejarah/i';

    private const CONTACT_PATTERN = '/contact|kontak|hubungi|call-us/i';

    private const SERVICES_PATTERN = '/service|layanan|produk|product|solution|solusi|bisnis/i';

    public function __construct(private readonly HostResolver $resolver) {}

    /**
     * @return list<array{url: string, title: string, description: string, text: string, emails: list<string>, phones: list<string>}>
     */
    public function fetchCompanySite(string $url): array
    {
        $home = $this->fetchPage($url);
        if ($home === null) {
            return [];
        }

        $pages = [$home['page']];
        $seen = [rtrim($home['page']['url'], '/')];

        foreach ([self::ABOUT_PATTERN, self::SERVICES_PATTERN, self::CONTACT_PATTERN] as $pattern) {
            $link = $this->findLink($home['links'], $pattern, $home['page']['url'], $seen);
            if ($link === null) {
                continue;
            }
            $seen[] = rtrim($link, '/');

            $sub = $this->fetchPage($link);
            if ($sub !== null) {
                $pages[] = $sub['page'];
            }
        }

        return $pages;
    }

    /**
     * @return array{page: array{url: string, title: string, description: string, text: string, emails: list<string>, phones: list<string>}, links: list<array{href: string, text: string}>}|null
     */
    private function fetchPage(string $url): ?array
    {
        $html = $this->get($url, true);
        if ($html === null) {
            return null;
        }

        [$finalUrl, $body] = $html;

        return $this->parse($finalUrl, $body);
    }

    /**
     * Safe GET with manual, re-validated redirects.
     *
     * @return array{0: string, 1: string}|null [final url, body]
     */
    private function get(string $url, bool $requireHtml): ?array
    {
        for ($hop = 0; $hop <= self::MAX_REDIRECTS; $hop++) {
            $target = $this->validate($url);
            if ($target === null) {
                return null;
            }

            if ($requireHtml && ! $this->allowedByRobots($target)) {
                Log::info('[CompanyPageFetcher] blocked by robots.txt', ['url' => $url]);

                return null;
            }

            try {
                $response = Http::withHeaders(['User-Agent' => self::USER_AGENT, 'Accept' => 'text/html,application/xhtml+xml'])
                    ->timeout(8)
                    ->connectTimeout(4)
                    ->withOptions([
                        'allow_redirects' => false,
                        'curl' => [CURLOPT_RESOLVE => ["{$target['host']}:{$target['port']}:{$target['ip']}"]],
                    ])
                    ->get($url);
            } catch (\Throwable $e) {
                Log::info('[CompanyPageFetcher] request failed', ['url' => $url, 'error' => $e->getMessage()]);

                return null;
            }

            if (in_array($response->status(), [301, 302, 303, 307, 308], true)) {
                $location = $response->header('Location');
                if (! $location) {
                    return null;
                }
                $url = $this->absolute($location, $url);

                continue;
            }

            if (! $response->successful()) {
                return null;
            }

            if ($requireHtml && ! str_contains(strtolower($response->header('Content-Type')), 'html')) {
                return null;
            }

            $body = $response->body();
            if (strlen($body) > self::MAX_BYTES) {
                $body = substr($body, 0, self::MAX_BYTES);
            }

            return [$url, $body];
        }

        return null;
    }

    /**
     * @return array{host: string, port: int, ip: string, scheme: string, path: string}|null
     */
    private function validate(string $url): ?array
    {
        $parts = parse_url($url);
        $scheme = strtolower($parts['scheme'] ?? '');
        $host = strtolower($parts['host'] ?? '');

        if (! in_array($scheme, ['http', 'https'], true) || $host === '' || isset($parts['user']) || isset($parts['pass'])) {
            return null;
        }

        $defaultPort = $scheme === 'https' ? 443 : 80;
        $port = (int) ($parts['port'] ?? $defaultPort);
        if ($port !== $defaultPort) {
            return null;
        }

        $ips = $this->resolver->resolve($host);
        if ($ips === []) {
            return null;
        }

        foreach ($ips as $ip) {
            if (! $this->isPublicIp($ip)) {
                Log::warning('[CompanyPageFetcher] refused non-public address', ['host' => $host, 'ip' => $ip]);

                return null;
            }
        }

        return ['host' => $host, 'port' => $port, 'ip' => $ips[0], 'scheme' => $scheme, 'path' => $parts['path'] ?? '/'];
    }

    public function isPublicIp(string $ip): bool
    {
        if (! filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4 | FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
            return false;
        }

        // Carrier-grade NAT (100.64.0.0/10) is not covered by PHP's private/reserved flags.
        $long = ip2long($ip);

        return ! ($long >= ip2long('100.64.0.0') && $long <= ip2long('100.127.255.255'));
    }

    /** @param  array{host: string, scheme: string, path: string}  $target */
    private function allowedByRobots(array $target): bool
    {
        $origin = "{$target['scheme']}://{$target['host']}";

        $disallow = Cache::remember('robots:'.sha1($origin), now()->addDay(), function () use ($origin) {
            $robots = $this->get($origin.'/robots.txt', false);

            return $robots === null ? [] : $this->parseRobots($robots[1]);
        });

        foreach ($disallow as $rule) {
            if ($rule === '/' || str_starts_with($target['path'] ?: '/', $rule)) {
                return false;
            }
        }

        return true;
    }

    /** @return list<string> Disallow rules that apply to us (group "*" or our bot name). */
    public function parseRobots(string $content): array
    {
        $rules = [];
        $applies = false;
        $inAgentBlock = false;

        foreach (preg_split('/\r?\n/', $content) as $line) {
            $line = trim(preg_replace('/#.*$/', '', $line));
            if ($line === '' || ! str_contains($line, ':')) {
                continue;
            }

            [$field, $value] = array_map('trim', explode(':', $line, 2));
            $field = strtolower($field);

            if ($field === 'user-agent') {
                if (! $inAgentBlock) {
                    $applies = false;
                }
                $inAgentBlock = true;
                $agent = strtolower($value);
                $applies = $applies || $agent === '*' || str_contains($agent, 'leadsyresearchbot');

                continue;
            }

            $inAgentBlock = false;

            if ($applies && $field === 'disallow' && $value !== '') {
                $rules[] = $value;
            }
        }

        return array_values(array_unique($rules));
    }

    /**
     * @return array{page: array{url: string, title: string, description: string, text: string, emails: list<string>, phones: list<string>}, links: list<array{href: string, text: string}>}
     */
    private function parse(string $url, string $html): array
    {
        $dom = new \DOMDocument();
        $previous = libxml_use_internal_errors(true);
        $dom->loadHTML('<?xml encoding="UTF-8">'.$html, LIBXML_NOWARNING | LIBXML_NOERROR);
        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        $xpath = new \DOMXPath($dom);

        $title = trim((string) ($xpath->query('//title')->item(0)?->textContent ?? ''));
        $description = '';
        foreach ($xpath->query('//meta[@name="description" or @property="og:description"]') as $meta) {
            $description = trim((string) $meta->getAttribute('content'));
            if ($description !== '') {
                break;
            }
        }

        $links = [];
        $emails = [];
        $phones = [];
        foreach ($xpath->query('//a[@href]') as $a) {
            $href = trim((string) $a->getAttribute('href'));
            $text = trim(preg_replace('/\s+/', ' ', (string) $a->textContent));

            if (str_starts_with(strtolower($href), 'mailto:')) {
                $email = strtolower(trim(explode('?', substr($href, 7))[0]));
                if (filter_var($email, FILTER_VALIDATE_EMAIL)) {
                    $emails[] = $email;
                }

                continue;
            }

            if (str_starts_with(strtolower($href), 'tel:')) {
                $phone = trim(urldecode(substr($href, 4)));
                if (preg_match('/\d{6,}/', preg_replace('/\D/', '', $phone))) {
                    $phones[] = $phone;
                }

                continue;
            }

            if (str_contains(strtolower($href), 'wa.me/') || str_contains(strtolower($href), 'api.whatsapp.com')) {
                $phones[] = 'WhatsApp: '.$href;

                continue;
            }

            $links[] = ['href' => $href, 'text' => $text];
        }

        foreach ($xpath->query('//script|//style|//noscript|//svg|//iframe|//template') as $node) {
            $node->parentNode?->removeChild($node);
        }

        $body = $xpath->query('//body')->item(0);
        $text = Str::of((string) ($body?->textContent ?? $dom->textContent))
            ->replaceMatches('/\s+/u', ' ')
            ->trim()
            ->limit(self::MAX_TEXT_PER_PAGE, '…')
            ->toString();

        return [
            'page' => [
                'url' => $url,
                'title' => Str::limit($title, 200, ''),
                'description' => Str::limit($description, 400, ''),
                'text' => $text,
                'emails' => array_values(array_unique($emails)),
                'phones' => array_values(array_unique($phones)),
            ],
            'links' => $links,
        ];
    }

    /**
     * Same-site link whose URL or anchor text matches the pattern.
     *
     * @param  list<array{href: string, text: string}>  $links
     * @param  list<string>  $seen
     */
    private function findLink(array $links, string $pattern, string $baseUrl, array $seen): ?string
    {
        $baseHost = $this->bareHost((string) parse_url($baseUrl, PHP_URL_HOST));

        foreach ($links as $link) {
            if (! preg_match($pattern, $link['href'].' '.$link['text'])) {
                continue;
            }

            $absolute = $this->absolute($link['href'], $baseUrl);
            $host = $this->bareHost((string) parse_url($absolute, PHP_URL_HOST));

            if ($host !== $baseHost || in_array(rtrim($absolute, '/'), $seen, true)) {
                continue;
            }

            return strtok($absolute, '#') ?: $absolute;
        }

        return null;
    }

    private function bareHost(string $host): string
    {
        return preg_replace('/^www\./', '', strtolower($host));
    }

    private function absolute(string $href, string $base): string
    {
        if (preg_match('#^https?://#i', $href)) {
            return $href;
        }

        $parts = parse_url($base);
        $origin = ($parts['scheme'] ?? 'https').'://'.($parts['host'] ?? '');

        if (str_starts_with($href, '//')) {
            return ($parts['scheme'] ?? 'https').':'.$href;
        }

        if (str_starts_with($href, '/')) {
            return $origin.$href;
        }

        $dir = rtrim(str_contains($parts['path'] ?? '/', '.') ? dirname($parts['path']) : ($parts['path'] ?? '/'), '/');

        return $origin.$dir.'/'.$href;
    }
}
