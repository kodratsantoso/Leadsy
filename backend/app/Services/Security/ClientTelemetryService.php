<?php

namespace App\Services\Security;

use Illuminate\Http\Request;

class ClientTelemetryService
{
    /**
     * Map of common ISO country codes to English names.
     */
    private const COUNTRY_NAMES = [
        'ID' => 'Indonesia',
        'SG' => 'Singapore',
        'MY' => 'Malaysia',
        'TH' => 'Thailand',
        'VN' => 'Vietnam',
        'PH' => 'Philippines',
        'US' => 'United States',
        'GB' => 'United Kingdom',
        'AU' => 'Australia',
        'JP' => 'Japan',
        'KR' => 'South Korea',
        'CN' => 'China',
        'IN' => 'India',
        'DE' => 'Germany',
        'NL' => 'Netherlands',
        'FR' => 'France',
        'CA' => 'Canada',
        'AE' => 'United Arab Emirates',
        'SA' => 'Saudi Arabia',
    ];

    /**
     * Capture enriched client telemetry from HTTP Request.
     */
    public function captureFromRequest(?Request $request = null): array
    {
        $req = $request ?? request();

        $ip = $this->resolveClientIp($req);
        $geo = $this->resolveGeoLocation($req, $ip);
        $client = $this->parseUserAgent($req?->userAgent() ?? '');

        return [
            'ip_address' => $ip,
            'user_agent' => $req?->userAgent() ? substr($req->userAgent(), 0, 500) : null,
            'city' => $geo['city'],
            'country_code' => $geo['country_code'],
            'country_name' => $geo['country_name'],
            'region' => $geo['region'],
            'flag' => $geo['flag'],
            'device_type' => $client['device_type'],
            'browser' => $client['browser'],
            'os' => $client['os'],
        ];
    }

    /**
     * Resolve the most accurate client IP address.
     */
    public function resolveClientIp(?Request $request = null): string
    {
        $req = $request ?? request();
        if (! $req) {
            return '127.0.0.1';
        }

        // 1. Cloudflare Connecting IP
        if ($cfIp = $req->header('CF-Connecting-IP')) {
            return trim($cfIp);
        }

        // 2. Nginx / Edge X-Real-IP
        if ($realIp = $req->header('X-Real-IP')) {
            return trim($realIp);
        }

        // 3. X-Forwarded-For (take the first client IP)
        if ($forwarded = $req->header('X-Forwarded-For')) {
            $parts = explode(',', $forwarded);
            $first = trim($parts[0] ?? '');
            if ($first !== '') {
                return $first;
            }
        }

        return $req->ip() ?: '127.0.0.1';
    }

    /**
     * Resolve Geolocation from edge headers or private fallback.
     */
    public function resolveGeoLocation(?Request $request, string $ip): array
    {
        $req = $request ?? request();

        $countryCode = strtoupper(trim((string) ($req?->header('CF-IPCountry') ?: $req?->header('X-Country-Code') ?: '')));
        $city = trim((string) ($req?->header('CF-IPCity') ?: $req?->header('X-City') ?: ''));
        $region = trim((string) ($req?->header('CF-Region') ?: $req?->header('X-Region') ?: ''));

        // If Cloudflare didn't supply country code or is Tor/Anonymous (XX/T1)
        if ($countryCode === '' || $countryCode === 'XX' || $countryCode === 'T1') {
            if ($this->isPrivateOrLoopbackIp($ip)) {
                $countryCode = 'ID';
                $countryName = 'Indonesia (Local/Dev)';
                $city = $city !== '' ? $city : 'Jakarta (Local)';
                $region = $region !== '' ? $region : 'DKI Jakarta';
                $flag = '🇮🇩';

                return [
                    'city' => $city,
                    'country_code' => $countryCode,
                    'country_name' => $countryName,
                    'region' => $region,
                    'flag' => $flag,
                ];
            }

            $countryCode = 'ID'; // Default staging / operational region
            $countryName = 'Indonesia';
            $city = $city !== '' ? $city : 'Jakarta';
            $flag = '🇮🇩';
        } else {
            $countryName = self::COUNTRY_NAMES[$countryCode] ?? $countryCode;
            $flag = $this->countryCodeToEmoji($countryCode);
        }

        return [
            'city' => $city !== '' ? $city : null,
            'country_code' => $countryCode,
            'country_name' => $countryName,
            'region' => $region !== '' ? $region : null,
            'flag' => $flag,
        ];
    }

    /**
     * Parse User-Agent string to device, browser, and OS.
     */
    public function parseUserAgent(string $ua): array
    {
        if (trim($ua) === '') {
            return [
                'device_type' => 'desktop',
                'browser' => 'System / CLI',
                'os' => 'Unknown',
            ];
        }

        // 1. Device Type
        $deviceType = 'desktop';
        if (preg_match('/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i', $ua)) {
            $deviceType = 'tablet';
        } elseif (preg_match('/(iphone|ipod|android.*mobile|blackberry|bb10|windows phone|opera mini|mobile)/i', $ua)) {
            $deviceType = 'mobile';
        } elseif (preg_match('/(bot|crawl|spider|slurp|curl|wget|python|postman)/i', $ua)) {
            $deviceType = 'bot';
        }

        // 2. Operating System
        $os = 'Unknown OS';
        if (preg_match('/iPhone/i', $ua)) {
            $os = 'iOS (iPhone)';
        } elseif (preg_match('/iPad/i', $ua)) {
            $os = 'iPadOS';
        } elseif (preg_match('/Android/i', $ua)) {
            $os = 'Android';
        } elseif (preg_match('/Macintosh|Mac OS X/i', $ua)) {
            $os = 'macOS';
        } elseif (preg_match('/Windows NT 10.0/i', $ua)) {
            $os = 'Windows 10/11';
        } elseif (preg_match('/Windows NT/i', $ua)) {
            $os = 'Windows';
        } elseif (preg_match('/Linux/i', $ua)) {
            $os = 'Linux';
        } elseif (preg_match('/CrOS/i', $ua)) {
            $os = 'ChromeOS';
        }

        // 3. Browser
        $browser = 'Browser';
        if (preg_match('/PostmanRuntime/i', $ua)) {
            $browser = 'Postman';
        } elseif (preg_match('/curl/i', $ua)) {
            $browser = 'cURL';
        } elseif (preg_match('/Edg/i', $ua)) {
            $browser = 'Microsoft Edge';
        } elseif (preg_match('/OPR|Opera/i', $ua)) {
            $browser = 'Opera';
        } elseif (preg_match('/Chrome/i', $ua) && ! preg_match('/Chromium/i', $ua)) {
            $browser = 'Google Chrome';
        } elseif (preg_match('/Safari/i', $ua) && ! preg_match('/Chrome/i', $ua)) {
            $browser = 'Apple Safari';
        } elseif (preg_match('/Firefox/i', $ua)) {
            $browser = 'Mozilla Firefox';
        } elseif (preg_match('/MSIE|Trident/i', $ua)) {
            $browser = 'Internet Explorer';
        }

        return [
            'device_type' => $deviceType,
            'browser' => $browser,
            'os' => $os,
        ];
    }

    /**
     * Compute risk level for an audit action.
     */
    public function computeRiskLevel(string $action, string $status = 'success'): string
    {
        $action = strtolower($action);

        if ($status === 'denied' || $status === 'failed') {
            if (in_array($action, ['login_failed', 'access_denied', 'unauthorized', 'permission_denied'])) {
                return 'critical';
            }

            return 'high';
        }

        // Critical actions
        if (in_array($action, [
            'session_terminated',
            'idle_sessions_purged',
            'force_logout',
            'impersonate',
            'impersonate_start',
            'impersonate_stop',
            'user_deleted',
            'tenant_suspended',
            'tenant_deleted',
            'database_wipe_prevented',
        ])) {
            return 'critical';
        }

        // High risk actions
        if (in_array($action, [
            'password_changed',
            'password_reset',
            'two_factor_disabled',
            'two_factor_enabled',
            'role_updated',
            'permissions_changed',
            'api_token_created',
            'api_token_revoked',
            'export',
            'export_leads',
            'deleted',
            'bulk_delete',
        ])) {
            return 'high';
        }

        // Medium risk actions
        if (in_array($action, [
            'user_created',
            'user_invited',
            'status_changed',
            'bulk_update',
            'import',
            'integration_configured',
            'api_key_updated',
        ])) {
            return 'medium';
        }

        return 'low';
    }

    /**
     * Categorize action into clean business event category.
     */
    public function categorizeAction(string $module, string $action): string
    {
        $action = strtolower($action);
        $module = strtolower($module);

        if (in_array($module, ['auth', 'session', 'security']) || str_contains($action, 'login') || str_contains($action, 'password') || str_contains($action, 'session') || str_contains($action, '2fa')) {
            return 'security_auth';
        }

        if (in_array($module, ['leads', 'contacts', 'customers'])) {
            return 'leads_crm';
        }

        if (in_array($module, ['ai', 'ai_providers', 'intelligence', 'screening', 'enrichment'])) {
            return 'ai_intelligence';
        }

        if (in_array($module, ['users', 'roles', 'permissions', 'tenants', 'platform'])) {
            return 'administration';
        }

        if (in_array($module, ['whatsapp', 'lark', 'integrations'])) {
            return 'integrations';
        }

        return $module ?: 'general';
    }

    /**
     * Convert 2-letter ISO country code to Emoji Flag.
     */
    public function countryCodeToEmoji(string $code): string
    {
        $code = strtoupper(trim($code));
        if (strlen($code) !== 2) {
            return '🌐';
        }

        $ord1 = ord($code[0]);
        $ord2 = ord($code[1]);

        if ($ord1 < 65 || $ord1 > 90 || $ord2 < 65 || $ord2 > 90) {
            return '🌐';
        }

        return mb_chr($ord1 + 127397, 'UTF-8').mb_chr($ord2 + 127397, 'UTF-8');
    }

    /**
     * Check if an IP address is private, loopback, or local.
     */
    private function isPrivateOrLoopbackIp(string $ip): bool
    {
        if ($ip === '127.0.0.1' || $ip === '::1' || $ip === 'localhost') {
            return true;
        }

        return filter_var(
            $ip,
            FILTER_VALIDATE_IP,
            FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE
        ) === false;
    }
}
