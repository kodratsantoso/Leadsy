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
            'access_token' => $configs->get('MEKARI_QONTAK_ACCESS_TOKEN'),
            'channel_id' => $configs->get('MEKARI_QONTAK_CHANNEL_ID'),
        ];
    }

    /**
     * Live test connection against Mekari Qontak API.
     */
    public function testConnection(array $values): array
    {
        if (empty($values['access_token']) || empty($values['base_url'])) {
            return [
                'status' => 'error',
                'message' => 'Base URL and Bearer Access Token are required.',
            ];
        }

        $baseUrl = rtrim($values['base_url'], '/');
        $url = str_contains($baseUrl, 'api.mekari.com')
            ? "{$baseUrl}/qontak/chat/v1/rooms"
            : "{$baseUrl}/api/open/v1/rooms";

        try {
            $response = Http::timeout(10)
                ->withToken($values['access_token'])
                ->get($url, ['limit' => 1]);

            if ($response->successful()) {
                return [
                    'status' => 'connected',
                    'message' => 'Mekari Qontak API verified successfully.',
                    'http_status' => $response->status(),
                    'sample' => $response->json(),
                ];
            }

            return [
                'status' => 'error',
                'message' => "Mekari Qontak API returned HTTP {$response->status()}: " . ($response->json('message') ?? $response->body()),
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
        if (!$creds['enabled'] || empty($creds['access_token'])) {
            Log::info('[Qontak] Sync skipped: Integration is disabled or missing credentials.');
            return;
        }

        $baseUrl = rtrim($creds['base_url'], '/');
        $url = str_contains($baseUrl, 'api.mekari.com')
            ? "{$baseUrl}/qontak/chat/v1/rooms"
            : "{$baseUrl}/api/open/v1/rooms";

        try {
            $response = Http::timeout(15)
                ->withToken($creds['access_token'])
                ->get($url);

            if (!$response->successful()) {
                Log::error("[Qontak] Rooms sync API error: HTTP {$response->status()} - {$response->body()}");
                return;
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

                // Upsert Contact
                $contact = WhatsappContact::updateOrCreate(
                    ['phone_number' => $phone],
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

                // Upsert Conversation
                $conversation = WhatsappConversation::updateOrCreate(
                    ['external_chat_id' => $roomId],
                    [
                        'contact_id' => $contact->id,
                        'sync_status' => 'active',
                        'relevance_status' => empty($room['last_message']) ? 'pending' : 'high',
                        'approved_for_sync' => true,
                        'last_message_at' => $lastMsgAt,
                        'platform' => 'mekari_qontak',
                    ]
                );

                // Save last message if present
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
            }
        } catch (\Throwable $e) {
            Log::error('[Qontak] Failed to sync rooms: ' . $e->getMessage());
        }
    }

    /**
     * Sync chat history messages for a specific room.
     */
    public function syncRoomMessages(string $roomExternalId, ?int $tenantId = null): void
    {
        $creds = $this->getCredentials($tenantId);
        if (!$creds['enabled'] || empty($creds['access_token'])) {
            return;
        }

        $conversation = WhatsappConversation::where('external_chat_id', $roomExternalId)->first();
        if (!$conversation) {
            return;
        }

        $baseUrl = rtrim($creds['base_url'], '/');
        $url = str_contains($baseUrl, 'api.mekari.com')
            ? "{$baseUrl}/qontak/chat/v1/rooms/{$roomExternalId}/messages"
            : "{$baseUrl}/api/open/v1/rooms/{$roomExternalId}/messages";

        try {
            $response = Http::timeout(15)
                ->withToken($creds['access_token'])
                ->get($url);

            if (!$response->successful()) {
                Log::error("[Qontak] Messages sync API error: HTTP {$response->status()} - {$response->body()}");
                return;
            }

            $messages = $response->json('data') ?? [];
            foreach ($messages as $msg) {
                $msgId = $msg['id'] ?? null;
                if (!$msgId) {
                    continue;
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

            // Sync the last message timestamp
            $latestMsg = $conversation->messages()->orderBy('sent_at', 'desc')->first();
            if ($latestMsg) {
                $conversation->update(['last_message_at' => $latestMsg->sent_at]);
            }
        } catch (\Throwable $e) {
            Log::error("[Qontak] Failed to sync messages for room {$roomExternalId}: " . $e->getMessage());
        }
    }
}
