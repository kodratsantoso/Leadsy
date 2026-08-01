<?php

namespace App\Services\Lark;

class LarkMeetingUrlParser
{
    /**
     * Allowed Lark hostnames.
     */
    const ALLOWED_HOSTS = [
        'applink.larksuite.com',
        'vc.larksuite.com',
    ];

    /**
     * Parse a Lark URL and return extracted meeting identifiers.
     * 
     * @param string $url The provided URL
     * @return array{type: 'meetingId'|'minuteToken', id: string, valid: bool, error: ?string}
     */
    public static function parse(string $url): array
    {
        $parsed = parse_url($url);

        if (!$parsed || !isset($parsed['host'])) {
            return [
                'type' => '',
                'id' => '',
                'valid' => false,
                'error' => 'INVALID_LARK_URL'
            ];
        }

        $host = strtolower($parsed['host']);
        
        // Verify host against allowed hosts
        $isAllowed = false;
        if (str_ends_with($host, 'larksuite.com')) {
            $isAllowed = true;
        }

        if (!$isAllowed) {
            return [
                'type' => '',
                'id' => '',
                'valid' => false,
                'error' => 'UNSUPPORTED_LARK_HOST'
            ];
        }

        // 1. Check for Minute Token (e.g., https://vc.larksuite.com/minutes/obcnxxxxxxxxxxxx)
        if (isset($parsed['path']) && preg_match('/\/minutes\/([a-zA-Z0-9]+)/i', $parsed['path'], $matches)) {
            $token = $matches[1];
            if ($token) {
                return [
                    'type' => 'minuteToken',
                    'id' => $token,
                    'valid' => true,
                    'error' => null
                ];
            }
        }

        // 2. Check for Meeting ID in query string (e.g., ?meetingId=123456)
        if (isset($parsed['query'])) {
            parse_str($parsed['query'], $queryParams);
            if (isset($queryParams['meetingId'])) {
                $meetingId = $queryParams['meetingId'];
                // Meeting ID should be numeric
                if (ctype_digit($meetingId)) {
                    return [
                        'type' => 'meetingId',
                        'id' => $meetingId,
                        'valid' => true,
                        'error' => null
                    ];
                }
            }
        }

        // 3. Check for Meeting ID in path /j/123456 (e.g. https://vc-sg.larksuite.com/j/113975432)
        if (isset($parsed['path']) && preg_match('/\/j\/(\d+)/i', $parsed['path'], $matches)) {
            $meetingId = $matches[1];
            return [
                'type' => 'meetingId',
                'id' => $meetingId,
                'valid' => true,
                'error' => null
            ];
        }

        return [
            'type' => '',
            'id' => '',
            'valid' => false,
            'error' => 'MEETING_ID_NOT_FOUND'
        ];
    }
}
