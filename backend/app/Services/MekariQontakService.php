<?php

namespace App\Services;

use App\Models\IntegrationConfig;
use App\Models\WhatsappContact;
use App\Models\WhatsappConversation;
use App\Models\WhatsappMessage;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MekariQontakService
{
    /**
     * Retrieve the Qontak integration configuration values for a tenant.
     *
     * Now reads CLIENT_ID and CLIENT_SECRET for HMAC auth instead of ACCESS_TOKEN.
     */
    public function getCredentials(?int $tenantId = null): array
    {
        $prefix = 'MEKARI_QONTAK_';
        $configs = IntegrationConfig::query()
            ->where('category', 'lead_platforms')
            ->where('key', 'like', $prefix.'%')
            ->where(function ($query) use ($tenantId) {
                $query->whereNull('tenant_id');
                if ($tenantId !== null) {
                    $query->orWhere('tenant_id', $tenantId);
                }
            })
            ->get()
            ->sortBy(fn ($config) => $config->tenant_id === $tenantId ? 0 : 1)
            ->groupBy('key')
            ->map(fn ($rows) => $rows->first()->value);

        return [
            'enabled' => $configs->get('MEKARI_QONTAK_ENABLED') ?? false,
            'base_url' => $configs->get('MEKARI_QONTAK_BASE_URL') ?? 'https://api.mekari.com',
            'client_id' => $configs->get('MEKARI_QONTAK_CLIENT_ID'),
            'client_secret' => $configs->get('MEKARI_QONTAK_CLIENT_SECRET'),
            'channel_id' => $configs->get('MEKARI_QONTAK_CHANNEL_ID'),
            'access_token' => $configs->get('MEKARI_QONTAK_ACCESS_TOKEN'),
        ];
    }

    /**
     * Build HMAC-SHA256 authentication headers required by Mekari API v1.0.
     *
     * Signature format:
     *   payload = "date: <RFC7231 date>\n<METHOD> <PATH> HTTP/1.1"
     *   signature = base64(hmac_sha256(payload, client_secret))
     *   Authorization: hmac username="<client_id>", algorithm="hmac-sha256",
     *                  headers="date request-line", signature="<signature>"
     *
     * For POST/PUT/PATCH/DELETE, a Digest header is also required:
     *   Digest: SHA-256=base64(sha256(body))
     */
    private function buildHmacHeaders(
        string $clientId,
        string $clientSecret,
        string $method,
        string $path,
        ?string $body = null
    ): array {
        $date = gmdate('D, d M Y H:i:s T');
        $method = strtoupper($method);

        $requestLine = "{$method} {$path} HTTP/1.1";
        $signingPayload = "date: {$date}\n{$requestLine}";

        $digest = hash_hmac('sha256', $signingPayload, $clientSecret, true);
        $signature = base64_encode($digest);

        $authorization = sprintf(
            'hmac username="%s", algorithm="hmac-sha256", headers="date request-line", signature="%s"',
            $clientId,
            $signature
        );

        $headers = [
            'Date' => $date,
            'Authorization' => $authorization,
            'Content-Type' => 'application/json',
        ];

        // For request methods with a body, add the Digest header
        if ($body !== null && in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'])) {
            $bodyHash = base64_encode(hash('sha256', $body, true));
            $headers['Digest'] = "SHA-256={$bodyHash}";
        }

        return $headers;
    }

    /**
     * Make an authenticated request to the Mekari Qontak API.
     */
    private function makeRequest(
        string $method,
        string $baseUrl,
        string $path,
        ?string $clientId,
        ?string $clientSecret,
        array $queryParams = [],
        ?array $bodyData = null,
        int $timeout = 15,
        ?string $accessToken = null
    ): \Illuminate\Http\Client\Response {
        if (!empty($queryParams)) {
            ksort($queryParams);
            $queryString = http_build_query($queryParams);
            $path .= '?' . $queryString;
        }

        $url = rtrim($baseUrl, '/') . $path;
        $body = $bodyData !== null ? json_encode($bodyData) : null;

        $isLegacy = !str_contains($baseUrl, 'mekari.com') && !str_contains($baseUrl, 'mekari.io');

        if ($isLegacy) {
            // Legacy Qontak endpoints only support Bearer Token
            if (!empty($accessToken)) {
                $headers = [
                    'Authorization' => 'Bearer ' . $accessToken,
                    'Content-Type' => 'application/json',
                ];
                \Illuminate\Support\Facades\Log::info('[Qontak Debug] Using Bearer auth (Legacy)', ['headers' => $headers, 'url' => $url]);
            } else {
                $headers = $this->buildHmacHeaders($clientId ?? '', $clientSecret ?? '', $method, $path, $body);
                \Illuminate\Support\Facades\Log::info('[Qontak Debug] Fallback HMAC auth (Legacy)', ['headers' => $headers, 'url' => $url]);
            }
        } else {
            // Modern Mekari endpoints: Prioritize HMAC if credentials are provided, otherwise use Bearer
            if (!empty($clientId) && !empty($clientSecret)) {
                $headers = $this->buildHmacHeaders($clientId, $clientSecret, $method, $path, $body);
                \Illuminate\Support\Facades\Log::info('[Qontak Debug] Using HMAC auth (Modern)', ['headers' => $headers, 'url' => $url]);
            } elseif (!empty($accessToken)) {
                $headers = [
                    'Authorization' => 'Bearer ' . $accessToken,
                    'Content-Type' => 'application/json',
                ];
                \Illuminate\Support\Facades\Log::info('[Qontak Debug] Using Bearer auth (Modern)', ['headers' => $headers, 'url' => $url]);
            } else {
                $headers = $this->buildHmacHeaders($clientId ?? '', $clientSecret ?? '', $method, $path, $body);
                \Illuminate\Support\Facades\Log::info('[Qontak Debug] Fallback HMAC auth (Modern)', ['headers' => $headers, 'url' => $url]);
            }
        }

        $request = Http::timeout($timeout)->withHeaders($headers);

        if (strtoupper($method) === 'GET') {
            return $request->get($url);
        }

        // For POST/PUT/PATCH, send the raw JSON body
        return $request->withBody($body ?? '{}', 'application/json')->send($method, $url);
    }

    /**
     * Resolve the correct API path based on the configured base URL.
     *
     * - mekari.com / mekari.io → /qontak/chat/v1/...
     * - Legacy service-chat.qontak.com → /api/open/v1/...
     */
    private function resolveApiPath(string $baseUrl, string $relativePath): string
    {
        if (str_contains($baseUrl, 'mekari.com') || str_contains($baseUrl, 'mekari.io')) {
            return '/qontak/chat/v1/' . ltrim($relativePath, '/');
        }

        return '/api/open/v1/' . ltrim($relativePath, '/');
    }

    /**
     * Live test connection against Mekari Qontak API using HMAC auth.
     */
    public function testConnection(array $values): array
    {
        $hasHmac = !empty($values['client_id']) && !empty($values['client_secret']);
        $hasBearer = !empty($values['access_token']);

        if (!$hasHmac && !$hasBearer) {
            return [
                'status' => 'error',
                'message' => 'Either (Client ID and Client Secret) or (Access Token Bearer) are required.',
            ];
        }

        $baseUrl = rtrim($values['base_url'] ?? 'https://api.mekari.com', '/');
        $path = $this->resolveApiPath($baseUrl, 'rooms');

        try {
            $response = $this->makeRequest(
                'GET',
                $baseUrl,
                $path,
                $values['client_id'] ?? null,
                $values['client_secret'] ?? null,
                ['limit' => 1],
                null,
                10,
                $values['access_token'] ?? null
            );

            if ($response->successful()) {
                $json = $response->json();
                if (!is_array($json) || (!isset($json['data']) && !isset($json['message']))) {
                    return [
                        'status' => 'error',
                        'message' => 'Connection test returned a success status but invalid response format (HTML website content was returned). Please make sure your Base URL points to the API Gateway (e.g. https://sandbox-api.mekari.com or https://api.mekari.com) instead of the developer portal website.',
                        'http_status' => $response->status(),
                    ];
                }

                $authType = $hasBearer ? 'Bearer auth' : 'HMAC auth';
                return [
                    'status' => 'connected',
                    'message' => "Mekari Qontak API verified successfully ({$authType}).",
                    'http_status' => $response->status(),
                    'sample' => $json,
                ];
            }

            $errorMsg = $response->json('error.messages.0')
                ?? $response->json('message')
                ?? $response->body();

            return [
                'status' => 'error',
                'message' => "Mekari Qontak API returned HTTP {$response->status()}: {$errorMsg}",
                'http_status' => $response->status(),
            ];
        } catch (\Throwable $e) {
            return [
                'status' => 'error',
                'message' => 'Connection test failed: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Sync chat rooms from Qontak API.
     */
    public function syncRooms(?int $tenantId = null): void
    {
        $creds = $this->getCredentials($tenantId);
        $hasHmac = !empty($creds['client_id']) && !empty($creds['client_secret']);
        $hasBearer = !empty($creds['access_token']);

        if (!$creds['enabled'] || (!$hasHmac && !$hasBearer)) {
            Log::info('[Qontak] Sync skipped: Integration is disabled or missing credentials.');
            return;
        }

        $baseUrl = rtrim($creds['base_url'], '/');
        $path = $this->resolveApiPath($baseUrl, 'rooms');

        $cursor = null;
        $hasMore = true;

        while ($hasMore) {
            try {
                $queryParams = [
                    'limit' => 50,
                ];
                if ($cursor) {
                    $queryParams['cursor'] = $cursor;
                }

                $response = $this->makeRequest(
                    'GET',
                    $baseUrl,
                    $path,
                    $creds['client_id'] ?? null,
                    $creds['client_secret'] ?? null,
                    $queryParams,
                    null,
                    15,
                    $creds['access_token'] ?? null
                );

                if (!$response->successful()) {
                    Log::error("[Qontak] Rooms sync API error: HTTP {$response->status()} - {$response->body()}");
                    break;
                }

                $rooms = $response->json('data') ?? [];
                foreach ($rooms as $room) {
                    $roomId = $room['id'] ?? null;
                    if (!$roomId) {
                        continue;
                    }

                    // Extract phone number / identifier
                    $phone = null;
                    if (!empty($room['last_message']['raw_message']['contacts'])) {
                        $phone = $room['last_message']['raw_message']['contacts'][0]['wa_id'] ?? null;
                    }
                    if (empty($phone) && !empty($room['last_message']['raw_message']['metadata'])) {
                        $phone = $room['last_message']['raw_message']['metadata']['display_phone_number'] ?? null;
                    }
                    if (empty($phone) && !empty($room['name']) && preg_match('/^[+\d\s-]+$/', $room['name'])) {
                        $phone = preg_replace('/[^0-9]/', '', $room['name']);
                    }
                    if (empty($phone)) {
                        $phone = 'qontak_' . $roomId;
                    }

                    $normalizedPhone = preg_replace('/[^0-9]/', '', $phone);

                    // Upsert Contact (safely matching null user_id)
                    $contact = WhatsappContact::updateOrCreate(
                        ['phone_number' => $phone, 'user_id' => null],
                        [
                            'name' => $room['name'] ?? null,
                            'normalized_phone_number' => $normalizedPhone,
                            'is_relevant' => true,
                            'relevance_reason' => 'qontak_sync',
                        ]
                    );

                    $lastMsgAt = !empty($room['last_message_at'])
                        ? Carbon::parse($room['last_message_at'])
                        : (!empty($room['last_message']['created_at'])
                            ? Carbon::parse($room['last_message']['created_at'])
                            : now());

                    // OPTIMIZATION: If the conversation already exists in the database
                    // and its last_message_at matches the API room's activity timestamp,
                    // we can stop pagination since subsequent rooms are older.
                    $existing = WhatsappConversation::where('external_chat_id', $roomId)
                        ->whereNull('user_id')
                        ->first();
                    if ($existing && $existing->last_message_at && $lastMsgAt->timestamp === $existing->last_message_at->timestamp) {
                        Log::info("[Qontak] Sync stopped: reached already synced conversation {$roomId} with last_message_at {$existing->last_message_at->toDateTimeString()}.");
                        $hasMore = false;
                        break;
                    }

                    // Stop synchronization if we reach rooms older than 30 days,
                    // since the list is sorted by latest message descending.
                    if ($lastMsgAt->lt(now()->subDays(30))) {
                        Log::info("[Qontak] Sync stopped early: reached room older than 30 days ({$lastMsgAt->toDateString()}).");
                        $hasMore = false;
                        break;
                    }

                    // Upsert Conversation (safely matching null user_id)
                    $conversation = WhatsappConversation::updateOrCreate(
                        ['external_chat_id' => $roomId, 'user_id' => null],
                        [
                            'contact_id' => $contact->id,
                            'sync_status' => 'active',
                            'relevance_status' => empty($room['last_message']) ? 'pending' : 'high',
                            'approved_for_sync' => true,
                            'last_message_at' => $lastMsgAt,
                            'platform' => 'mekari_qontak',
                        ]
                    );

                    // Save last message if present directly to ensure we have it
                    if (!empty($room['last_message']) && !empty($room['last_message']['text'])) {
                        $lastMsg = $room['last_message'];
                        $direction = 'inbound';
                        
                        if (!empty($lastMsg['sender_type']) && (
                            str_contains($lastMsg['sender_type'], 'SystemAccount') || 
                            str_contains($lastMsg['sender_type'], 'Agent') || 
                            str_contains($lastMsg['sender_type'], 'User')
                        )) {
                            $direction = 'outbound';
                        } elseif (!empty($lastMsg['participant_type']) && in_array($lastMsg['participant_type'], ['bot', 'agent'])) {
                            $direction = 'outbound';
                        }

                        WhatsappMessage::updateOrCreate(
                            ['external_message_id' => $lastMsg['id'] ?? ('qmsg_' . $roomId . '_' . $lastMsgAt->timestamp)],
                            [
                                'conversation_id' => $conversation->id,
                                'direction' => $direction,
                                'message_type' => $lastMsg['type'] ?? 'text',
                                'body' => $lastMsg['text'],
                                'sent_at' => !empty($lastMsg['created_at']) ? Carbon::parse($lastMsg['created_at']) : $lastMsgAt,
                            ]
                        );
                    }

                    // Sync messages for new/updated conversations automatically
                    try {
                        Log::info("[Qontak] Conversation {$roomId} is new or has updates. Syncing messages...");
                        $this->syncRoomMessages($roomId, $tenantId);
                    } catch (\Throwable $e) {
                        Log::warning("[Qontak] Failed to sync intermediate messages for {$roomId}: " . $e->getMessage());
                    }
                }

                $nextCursor = $response->json('meta.pagination.cursor.next');
                if ($nextCursor && $nextCursor !== $cursor) {
                    $cursor = $nextCursor;
                } else {
                    $hasMore = false;
                }
            } catch (\Throwable $e) {
                Log::error('[Qontak] Failed to sync rooms: ' . $e->getMessage());
                $hasMore = false;
            }
        }
    }

    /**
     * Sync chat history messages for a specific room.
     */
    public function syncRoomMessages(string $roomExternalId, ?int $tenantId = null): void
    {
        $creds = $this->getCredentials($tenantId);
        $hasHmac = !empty($creds['client_id']) && !empty($creds['client_secret']);
        $hasBearer = !empty($creds['access_token']);

        if (!$creds['enabled'] || (!$hasHmac && !$hasBearer)) {
            return;
        }

        $conversation = WhatsappConversation::where('external_chat_id', $roomExternalId)->first();
        if (!$conversation) {
            return;
        }

        $baseUrl = rtrim($creds['base_url'], '/');
        $path = $this->resolveApiPath($baseUrl, "rooms/{$roomExternalId}/messages");

        $cursor = null;
        $hasMore = true;

        while ($hasMore) {
            try {
                $queryParams = [
                    'limit' => 50,
                ];
                if ($cursor) {
                    $queryParams['cursor'] = $cursor;
                }

                $response = $this->makeRequest(
                    'GET',
                    $baseUrl,
                    $path,
                    $creds['client_id'] ?? null,
                    $creds['client_secret'] ?? null,
                    $queryParams,
                    null,
                    15,
                    $creds['access_token'] ?? null
                );

                if (!$response->successful()) {
                    Log::error("[Qontak] Messages sync API error: HTTP {$response->status()} - {$response->body()}");
                    break;
                }

                $messages = $response->json('data') ?? [];
                foreach ($messages as $msg) {
                    $msgId = $msg['id'] ?? null;
                    // OPTIMIZATION: If the message already exists in our database,
                    // we can stop pagination since subsequent messages are older.
                    $exists = WhatsappMessage::where('external_message_id', $msgId)->exists();
                    if ($exists) {
                        Log::info("[Qontak] Messages sync stopped early: reached already synced message {$msgId} for room {$roomExternalId}.");
                        $hasMore = false;
                        break;
                    }

                    $direction = 'inbound';
                    if (!empty($msg['sender_type']) && (
                        str_contains($msg['sender_type'], 'SystemAccount') || 
                        str_contains($msg['sender_type'], 'Agent') || 
                        str_contains($msg['sender_type'], 'User')
                    )) {
                        $direction = 'outbound';
                    } elseif (!empty($msg['participant_type']) && in_array($msg['participant_type'], ['bot', 'agent'])) {
                        $direction = 'outbound';
                    }

                    WhatsappMessage::updateOrCreate(
                        ['external_message_id' => $msgId],
                        [
                            'conversation_id' => $conversation->id,
                            'direction' => $direction,
                            'message_type' => $msg['type'] ?? 'text',
                            'body' => $msg['text'] ?? $msg['body'] ?? '',
                            'sent_at' => !empty($msg['created_at']) ? Carbon::parse($msg['created_at']) : now(),
                        ]
                    );
                }

                $nextCursor = $response->json('meta.pagination.cursor.next');
                if ($nextCursor && $nextCursor !== $cursor) {
                    $cursor = $nextCursor;
                } else {
                    $hasMore = false;
                }
            } catch (\Throwable $e) {
                Log::error("[Qontak] Failed to sync messages for room {$roomExternalId}: " . $e->getMessage());
                $hasMore = false;
            }
        }

        // Sync the last message timestamp
        try {
            $latestMsg = $conversation->messages()->orderBy('sent_at', 'desc')->first();
            if ($latestMsg) {
                $conversation->update(['last_message_at' => $latestMsg->sent_at]);
            }
        } catch (\Throwable $e) {
            Log::error("[Qontak] Failed to update last message timestamp for room {$roomExternalId}: " . $e->getMessage());
        }
    }

    /**
     * Send a WhatsApp message/reply to a specific Qontak room.
     */
    public function sendMessage(string $roomExternalId, string $text, ?int $tenantId = null): array
    {
        $creds = $this->getCredentials($tenantId);
        $hasHmac = !empty($creds['client_id']) && !empty($creds['client_secret']);
        $hasBearer = !empty($creds['access_token']);

        if (!$creds['enabled'] || (!$hasHmac && !$hasBearer)) {
            return [
                'status' => 'error',
                'message' => 'Integration is disabled or missing credentials.',
            ];
        }

        $baseUrl = rtrim($creds['base_url'], '/');
        // Legacy: /api/open/v1/messages/whatsapp/bot or modern: /qontak/chat/v1/messages/whatsapp/bot
        $path = $this->resolveApiPath($baseUrl, 'messages/whatsapp/bot');

        $bodyData = [
            'room_id' => $roomExternalId,
            'type' => 'text',
            'text' => $text,
        ];

        try {
            $response = $this->makeRequest(
                'POST',
                $baseUrl,
                $path,
                $creds['client_id'] ?? null,
                $creds['client_secret'] ?? null,
                [],
                $bodyData,
                15,
                $creds['access_token'] ?? null
            );

            if ($response->successful()) {
                return [
                    'status' => 'success',
                    'data' => $response->json(),
                ];
            }

            $errorMsg = $response->json('error.messages.0')
                ?? $response->json('message')
                ?? $response->body();

            return [
                'status' => 'error',
                'message' => "Mekari Qontak API returned HTTP {$response->status()}: {$errorMsg}",
            ];
        } catch (\Throwable $e) {
            return [
                'status' => 'error',
                'message' => 'Failed to send message via Qontak: ' . $e->getMessage(),
            ];
        }
    }
}
