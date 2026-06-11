<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\AnalyzeWhatsAppConversationJob;
use App\Models\Lead;
use App\Models\WhatsappCampaign;
use App\Models\WhatsappCampaignRecipient;
use App\Models\WhatsappContact;
use App\Models\WhatsappConversation;
use App\Models\WhatsappMessage;
use App\Models\WhatsappSession;
use App\Models\WhatsappSyncRule;
use Illuminate\Http\Client\Response;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WhatsAppController extends Controller
{
    /**
     * Baileys sidecar URL.
     * Uses env override first, then prefers Docker hostname in containers
     * and localhost for host-based local development.
     */
    private string $defaultSession;

    public function __construct()
    {
        $this->defaultSession = (string) env('WHATSAPP_SESSION_NAME', 'leads_platform_session');
    }

    private function getSessionName(?int $userId = null): string
    {
        $id = $userId ?? auth()->id() ?? auth('sanctum')->id() ?? request()->user()?->id;
        return $id ? "user_session_{$id}" : 'default_session';
    }

    /* ──────────────────────────────────────────────────────────────
     *  SESSION / QR
     * ────────────────────────────────────────────────────────────── */

    public function initSession(Request $request): JsonResponse
    {
        $userId = $request->user()?->id ?? auth('sanctum')->id();
        $sessionName = $this->getSessionName($userId);

        $session = WhatsappSession::firstOrCreate(
            ['session_name' => $sessionName],
            ['status' => 'disconnected']
        );

        try {
            [$res, $engineUrl] = $this->requestEngine('post', 'session/start', [], 5, $sessionName);
            Log::info('[WhatsApp] Init session', [
                'engine_url' => $engineUrl,
                'sidecar_response' => $res->json(),
            ]);
        } catch (\Exception $e) {
            Log::error('[WhatsApp] Engine unreachable on init', ['error' => $e->getMessage()]);

            return response()->json(['error' => 'Failed to reach WhatsApp Engine. Ensure the sidecar is running.'], 500);
        }

        // Try a live status pull immediately so the UI does not depend solely on webhook timing.
        usleep(750000);
        $snapshot = $this->pullSidecarStatus($session);

        // If the sidecar is disconnected but still has saved auth, it is usually stale/expired
        // and Baileys will not emit a fresh QR until we reset the auth store.
        if (($snapshot['status'] ?? $session->status) === 'disconnected' && ($snapshot['has_auth'] ?? false)) {
            try {
                $this->requestEngine('post', 'session/refresh-qr', [], 5, $sessionName);
                usleep(1250000);
                $snapshot = $this->pullSidecarStatus($session) ?? $snapshot;
            } catch (\Throwable $e) {
                Log::warning('[WhatsApp] Failed to auto-refresh stale auth on init', [
                    'error' => $e->getMessage(),
                ]);
            }
        }

        $session->refresh();

        return response()->json([
            'status' => $snapshot['status'] ?? $session->status,
            'qr_payload' => $snapshot['qr_payload'] ?? $session->qr_payload,
        ]);
    }

    public function status(Request $request): JsonResponse
    {
        $userId = $request->user()?->id ?? auth('sanctum')->id();
        $sessionName = $this->getSessionName($userId);

        $session = WhatsappSession::where('session_name', $sessionName)->first();
        if (!$session) {
            $session = WhatsappSession::create([
                'session_name' => $sessionName,
                'status' => 'disconnected',
            ]);
        }

        $snapshot = $this->pullSidecarStatus($session);

        return response()->json([
            'status' => $snapshot['status'] ?? $session->status,
            'number' => $snapshot['number'] ?? ($session->metadata_json['number'] ?? null),
            'qr_payload' => $snapshot['qr_payload'] ?? ($session->status === 'qr_ready' ? $session->qr_payload : null),
            'connected_at' => ($snapshot['connected_at'] ?? $session->connected_at)?->toIso8601String(),
        ]);
    }

    public function refreshQr(Request $request): JsonResponse
    {
        $userId = $request->user()?->id ?? auth('sanctum')->id();
        $sessionName = $this->getSessionName($userId);

        try {
            $this->requestEngine('post', 'session/refresh-qr', [], 5, $sessionName);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Engine unreachable.'], 500);
        }

        return response()->json(['success' => true, 'message' => 'QR refresh requested']);
    }

    public function disconnect(Request $request): JsonResponse
    {
        $userId = $request->user()?->id ?? auth('sanctum')->id();
        $sessionName = $this->getSessionName($userId);

        $session = WhatsappSession::where('session_name', $sessionName)->first();
        if ($session) {
            $session->update([
                'status' => 'disconnected',
                'qr_payload' => null,
                'disconnected_at' => now(),
            ]);
        }

        try {
            $this->requestEngine('post', 'session/disconnect', [], 5, $sessionName);
        } catch (\Exception $e) {
            // Ignore
        }

        return response()->json(['success' => true]);
    }

    private function pullSidecarStatus(WhatsappSession $session): ?array
    {
        try {
            [$res, $engineUrl] = $this->requestEngine('get', 'session/status');

            $data = $res->json();
            $status = $data['status'] ?? $session->status ?? 'disconnected';
            $qrPayload = $status === 'qr_ready' ? ($data['qr'] ?? null) : null;
            $number = $status === 'connected' ? ($data['number'] ?? ($session->metadata_json['number'] ?? null)) : null;

            $metadata = $session->metadata_json ?? [];
            if ($number) {
                $metadata['number'] = $number;
            }

            $updates = [
                'status' => $status,
                'qr_payload' => $qrPayload,
                'metadata_json' => $metadata,
            ];

            if ($status === 'qr_ready') {
                $updates['last_qr_generated_at'] = now();
                $updates['disconnected_at'] = null;
            }
            if ($status === 'connected') {
                $updates['connected_at'] = $session->connected_at ?? now();
                $updates['disconnected_at'] = null;
            }
            if ($status === 'disconnected') {
                $updates['disconnected_at'] = now();
            }

            $session->update($updates);
            $session->refresh();

            return [
                'status' => $session->status,
                'number' => $session->metadata_json['number'] ?? null,
                'qr_payload' => $session->status === 'qr_ready' ? $session->qr_payload : null,
                'connected_at' => $session->connected_at,
                'has_auth' => (bool) ($data['has_auth'] ?? false),
            ];
        } catch (\Throwable $e) {
            Log::warning('[WhatsApp] Sidecar status pull failed', [
                'engine_urls' => $this->engineUrls(),
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /* ──────────────────────────────────────────────────────────────
     *  DIRECT MESSAGING
     * ────────────────────────────────────────────────────────────── */

    public function sendMessage(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone' => 'required|string',
            'text' => 'required|string',
            'platform' => 'nullable|string',
        ]);

        $userId = $request->user()?->id ?? auth('sanctum')->id();

        // Check platform of conversation
        $conversation = WhatsappConversation::where('external_chat_id', $data['phone'])
            ->orWhereHas('contact', function ($query) use ($data) {
                $query->where('phone_number', $data['phone']);
            })
            ->first();

        $platform = $data['platform'] ?? ($conversation ? $conversation->platform : 'whatsapp');

        if ($platform === 'mekari_qontak') {
            $tenantId = $request->user()?->tenant_id ?? auth('sanctum')->user()?->tenant_id ?? auth()->user()?->tenant_id;
            $roomId = $conversation ? $conversation->external_chat_id : $data['phone'];

            $service = resolve(\App\Services\MekariQontakService::class);
            $res = $service->sendMessage($roomId, $data['text'], $tenantId);

            if ($res['status'] !== 'success') {
                return response()->json(['error' => $res['message']], 500);
            }

            // Save outbound message to local database
            if ($conversation) {
                WhatsappMessage::create([
                    'conversation_id' => $conversation->id,
                    'external_message_id' => $res['data']['data']['id'] ?? $res['data']['id'] ?? uniqid('qmsg_out_'),
                    'direction' => 'outbound',
                    'message_type' => 'text',
                    'body' => $data['text'],
                    'sent_at' => now(),
                ]);

                $conversation->update(['last_message_at' => now()]);
            }

            return response()->json([
                'success' => true,
                'external_id' => $res['data']['data']['id'] ?? $res['data']['id'] ?? null,
            ]);
        }

        // Default Local WhatsApp (Baileys)
        $sessionName = $this->getSessionName($userId);

        // Normalize phone → JID
        $phone = preg_replace('/[^0-9]/', '', $data['phone']);
        $jid = "{$phone}@s.whatsapp.net";

        try {
            [$res, $engineUrl] = $this->requestEngine('post', 'messages/send', [
                'jid' => $jid,
                'text' => $data['text'],
            ], 10, $sessionName);

            if (!$res->successful()) {
                return response()->json(['error' => $res->json('error', 'Send failed')], $res->status());
            }

            // Log outbound message to DB using the correct schema
            $contact = WhatsappContact::firstOrCreate(
                [
                    'phone_number' => $jid,
                    'user_id' => $userId,
                ],
                [
                    'name' => null,
                    'normalized_phone_number' => $phone,
                    'is_relevant' => true,
                    'relevance_reason' => 'outbound_message',
                ]
            );

            $conversation = WhatsappConversation::firstOrCreate(
                [
                    'external_chat_id' => $jid,
                    'user_id' => $userId,
                ],
                [
                    'contact_id' => $contact->id,
                    'sync_status' => 'active',
                    'relevance_status' => 'high',
                    'approved_for_sync' => true,
                    'platform' => 'whatsapp',
                ]
            );

            WhatsappMessage::create([
                'conversation_id' => $conversation->id,
                'external_message_id' => $res->json('external_id', uniqid('out_')),
                'direction' => 'outbound',
                'message_type' => 'text',
                'body' => $data['text'],
                'sent_at' => now(),
            ]);

            $conversation->update(['last_message_at' => now()]);

            return response()->json([
                'success' => true,
                'external_id' => $res->json('external_id'),
            ]);
        } catch (\Exception $e) {
            Log::error('[WhatsApp] Send message failed', ['error' => $e->getMessage()]);

            return response()->json(['error' => 'Engine unreachable.'], 500);
        }
    }

    /* ──────────────────────────────────────────────────────────────
     *  BROADCAST CAMPAIGNS
     * ────────────────────────────────────────────────────────────── */

    public function listCampaigns(): JsonResponse
    {
        $campaigns = WhatsappCampaign::with([
            'recipients' => function ($q) {
                $q->select('id', 'campaign_id', 'phone_number', 'send_status', 'sent_at');
            }
        ])
            ->orderBy('created_at', 'desc')
            ->take(50)
            ->get();

        return response()->json(['data' => $campaigns]);
    }

    public function createCampaign(Request $request): JsonResponse
    {
        $data = $request->validate([
            'campaign_name' => 'required|string|max:255',
            'message_template' => 'required|string',
            'lead_ids' => 'required|array|min:1',
            'lead_ids.*' => 'integer|exists:leads,id',
        ]);

        $leads = Lead::whereIn('id', $data['lead_ids'])
            ->whereNotNull('phone')
            ->where('phone', '!=', '')
            ->get();

        if ($leads->isEmpty()) {
            return response()->json(['error' => 'No leads with valid phone numbers found.'], 422);
        }

        $campaign = WhatsappCampaign::create([
            'campaign_name' => $data['campaign_name'],
            'message_template' => $data['message_template'],
            'total_targets' => $leads->count(),
            'status' => 'draft',
        ]);

        foreach ($leads as $lead) {
            WhatsappCampaignRecipient::create([
                'campaign_id' => $campaign->id,
                'lead_id' => $lead->id,
                'phone_number' => preg_replace('/[^0-9]/', '', $lead->phone),
                'send_status' => 'pending',
            ]);
        }

        return response()->json([
            'data' => $campaign->load('recipients'),
            'message' => "Campaign created with {$leads->count()} recipients.",
        ], 201);
    }

    public function executeCampaign(Request $request, WhatsappCampaign $campaign): JsonResponse
    {
        if ($campaign->status === 'sent') {
            return response()->json(['error' => 'Campaign already executed.'], 422);
        }

        $campaign->update(['status' => 'sending', 'executed_at' => now()]);

        $recipients = $campaign->recipients()->where('send_status', 'pending')->get();
        $successCount = 0;
        $failCount = 0;

        foreach ($recipients as $recipient) {
            $jid = "{$recipient->phone_number}@s.whatsapp.net";
            try {
                [$res, $engineUrl] = $this->requestEngine('post', 'messages/send', [
                    'jid' => $jid,
                    'text' => $campaign->message_template,
                ], 10);

                if ($res->successful()) {
                    $recipient->update([
                        'send_status' => 'sent',
                        'sent_at' => now(),
                        'provider_response_json' => $res->json(),
                    ]);

                    // Also log to conversation history
                    $contact = WhatsappContact::firstOrCreate(
                        ['phone_number' => $jid],
                        ['normalized_phone_number' => $recipient->phone_number, 'is_relevant' => true, 'relevance_reason' => 'broadcast']
                    );
                    $conv = WhatsappConversation::firstOrCreate(
                        ['external_chat_id' => $jid],
                        ['contact_id' => $contact->id, 'approved_for_sync' => true]
                    );
                    WhatsappMessage::create([
                        'conversation_id' => $conv->id,
                        'external_message_id' => $res->json('external_id', uniqid('bc_')),
                        'direction' => 'outbound',
                        'message_type' => 'text',
                        'body' => $campaign->message_template,
                        'sent_at' => now(),
                    ]);
                    $conv->update(['last_message_at' => now()]);

                    $successCount++;
                } else {
                    $recipient->update([
                        'send_status' => 'failed',
                        'provider_response_json' => $res->json(),
                    ]);
                    $failCount++;
                }
            } catch (\Exception $e) {
                $recipient->update([
                    'send_status' => 'failed',
                    'provider_response_json' => ['error' => $e->getMessage()],
                ]);
                $failCount++;
            }

            // Throttle: 1 second between messages to avoid rate limiting
            usleep(1_000_000);
        }

        $campaign->update(['status' => 'sent']);

        return response()->json([
            'success' => true,
            'sent' => $successCount,
            'failed' => $failCount,
            'total' => $recipients->count(),
        ]);
    }

    public function updateCampaign(Request $request, WhatsappCampaign $campaign): JsonResponse
    {
        if ($campaign->status === 'sent') {
            return response()->json(['message' => 'Cannot edit a campaign that has already been sent.'], 422);
        }

        $data = $request->validate([
            'campaign_name' => 'sometimes|string|max:255',
            'message_template' => 'sometimes|string',
        ]);

        $campaign->update($data);

        return response()->json(['data' => $campaign->load('recipients')]);
    }

    public function destroyCampaign(WhatsappCampaign $campaign): JsonResponse
    {
        if (in_array($campaign->status, ['running', 'scheduled'])) {
            return response()->json(['message' => 'Cannot delete a running or scheduled campaign.'], 422);
        }

        $campaign->recipients()->delete();
        $campaign->delete();

        return response()->json(null, 204);
    }

    /* ──────────────────────────────────────────────────────────────
     *  CONVERSATIONS
     * ────────────────────────────────────────────────────────────── */

    public function getConversations(Request $request): JsonResponse
    {
        $platform = $request->query('platform', 'whatsapp');

        if ($platform === 'mekari_qontak') {
            $tenantId = $request->user()?->tenant_id ?? auth('sanctum')->user()?->tenant_id ?? auth()->user()?->tenant_id;
            $forceSync = $request->query('force_sync') === 'true';
            
            $cacheKey = 'qontak_sync_limit_' . ($tenantId ?? 'global');
            if ($forceSync || !\Illuminate\Support\Facades\Cache::has($cacheKey)) {
                \Illuminate\Support\Facades\Cache::put($cacheKey, true, 30);
                resolve(\App\Services\MekariQontakService::class)->syncRooms($tenantId);
            }
        }

        $userId = $request->user()?->id ?? auth('sanctum')->id() ?? auth()->id();

        $convs = WhatsappConversation::with(['contact', 'aiAnalysis'])
            ->where('platform', $platform)
            ->where('approved_for_sync', true)
            ->when($platform === 'whatsapp', function ($query) use ($userId) {
                return $query->where('user_id', $userId);
            })
            ->orderBy('last_message_at', 'desc')
            ->get();

        return response()->json(['data' => $convs]);
    }

    public function getConversationMessages(Request $request, $id): JsonResponse
    {
        $userId = $request->user()?->id ?? auth('sanctum')->id() ?? auth()->id();
        $conversation = WhatsappConversation::where('id', $id)
            ->where(function ($query) use ($userId) {
                $query->where('platform', '!=', 'whatsapp')
                    ->orWhere('user_id', $userId);
            })
            ->first();

        if (!$conversation) {
            return response()->json(['error' => 'Conversation not found'], 404);
        }

        if ($conversation->platform === 'mekari_qontak') {
            $tenantId = $request->user()?->tenant_id ?? auth('sanctum')->user()?->tenant_id ?? auth()->user()?->tenant_id;
            resolve(\App\Services\MekariQontakService::class)->syncRoomMessages($conversation->external_chat_id, $tenantId);
        }

        $messages = WhatsappMessage::where('conversation_id', $id)
            ->orderBy('sent_at', 'asc')
            ->get();

        return response()->json(['data' => $messages]);
    }

    public function analyzeConversation($id): JsonResponse
    {
        $conversation = WhatsappConversation::find($id);
        if (!$conversation) {
            return response()->json(['error' => 'Conversation not found'], 404);
        }

        AnalyzeWhatsAppConversationJob::dispatch($conversation->id);

        return response()->json(['success' => true, 'message' => 'AI analysis queued.']);
    }

    /* ──────────────────────────────────────────────────────────────
     *  SYNC RULES
     * ────────────────────────────────────────────────────────────── */

    public function getSyncRules(): JsonResponse
    {
        $rules = WhatsappSyncRule::orderBy('rule_type')->get();

        return response()->json(['data' => $rules]);
    }

    public function updateSyncRules(Request $request): JsonResponse
    {
        $data = $request->validate([
            'rules' => 'required|array',
            'rules.*.rule_type' => 'required|string',
            'rules.*.rule_key' => 'nullable|string',
            'rules.*.rule_value' => 'nullable|string',
            'rules.*.enabled' => 'required|boolean',
        ]);

        // Clear existing and re-create for simplicity
        WhatsappSyncRule::truncate();

        foreach ($data['rules'] as $rule) {
            WhatsappSyncRule::create($rule);
        }

        return response()->json(['success' => true, 'message' => 'Sync rules updated.']);
    }

    private function engineUrls(): array
    {
        $configured = (string) env('WHATSAPP_SIDECAR_URL', '');
        $candidates = [
            $configured,
            'http://whatsapp-service:3002',
            'http://127.0.0.1:3002',
        ];

        $urls = [];
        foreach ($candidates as $candidate) {
            $candidate = rtrim($candidate, '/');
            if ($candidate === '') {
                continue;
            }
            $urls[] = str_ends_with($candidate, '/api') ? $candidate : "{$candidate}/api";
        }

        return array_values(array_unique($urls));
    }

    /**
     * Returns the first HTTP response from a reachable engine URL.
     * If an engine responds with a 4xx/5xx, that still counts as reachable and is returned.
     *
     * @return array{0:Response,1:string}
     */
    private function requestEngine(string $method, string $path, array $payload = [], int $timeout = 5, ?string $sessionName = null): array
    {
        $sessionName = $sessionName ?? $this->getSessionName();
        $lastError = null;

        foreach ($this->engineUrls() as $engineUrl) {
            try {
                $client = Http::timeout($timeout)->withHeaders([
                    'X-Session-Id' => $sessionName,
                ]);
                $url = "{$engineUrl}/{$path}";
                $response = strtolower($method) === 'get'
                    ? $client->get($url, $payload)
                    : $client->post($url, $payload);

                return [$response, $engineUrl];
            } catch (\Throwable $e) {
                $lastError = $e;
                Log::warning('[WhatsApp] Sidecar request failed', [
                    'engine_url' => $engineUrl,
                    'path' => $path,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        throw new \RuntimeException($lastError?->getMessage() ?? 'No reachable WhatsApp engine URL');
    }

    public function convertToLead(Request $request, $id): JsonResponse
    {
        $conversation = WhatsappConversation::find($id);
        if (!$conversation) {
            return response()->json(['error' => 'Conversation not found'], 404);
        }

        $contact = $conversation->contact;
        if (!$contact) {
            return response()->json(['error' => 'Contact not found for this conversation'], 404);
        }

        if ($contact->linked_lead_id) {
            return response()->json([
                'error' => 'This contact is already linked to a lead.',
                'lead_id' => $contact->linked_lead_id,
            ], 422);
        }

        $validated = $request->validate([
            'company_name' => 'required|string|max:255',
            'owner_id' => 'nullable|integer|exists:users,id',
            'funnel_stage_id' => 'nullable|integer|exists:funnel_stages,id',
        ]);

        $ownerId = $validated['owner_id'] ?? $request->user()?->id ?? auth('sanctum')->id();
        $stageId = $validated['funnel_stage_id'] ?? \App\Models\FunnelStage::orderBy('sequence')->value('id');

        $lead = Lead::create([
            'company_name' => $validated['company_name'],
            'phone' => preg_replace('/[^0-9]/', '', $contact->phone_number),
            'owner_id' => $ownerId,
            'funnel_stage_id' => $stageId,
            'tenant_id' => $request->user()?->tenant_id ?? auth('sanctum')->user()?->tenant_id,
            'created_by' => $request->user()?->id ?? auth('sanctum')->id(),
            'ai_mode' => 'manual',
            'duplicate_status' => 'new',
        ]);

        $lead->contacts()->create([
            'name' => $contact->name ?? 'Contact from ' . ucfirst($conversation->platform),
            'phone' => $contact->phone_number,
            'is_primary' => true,
            'source' => 'whatsapp',
        ]);

        $contact->update(['linked_lead_id' => $lead->id]);

        return response()->json([
            'success' => true,
            'message' => 'Conversation contact successfully converted to Lead.',
            'data' => [
                'lead_id' => $lead->id,
                'company_name' => $lead->company_name,
            ],
        ], 201);
    }

    public function activeUsers(Request $request): JsonResponse
    {
        try {
            [$res, $engineUrl] = $this->requestEngine('get', 'sessions/active', [], 5, 'default_session');
            $activeSessions = $res->json('data') ?? [];

            $userIds = [];
            foreach ($activeSessions as $s) {
                if (preg_match('/^user_session_(\d+)$/', $s['session'], $matches)) {
                    $userIds[] = (int) $matches[1];
                }
            }

            $users = \App\Models\User::whereIn('id', $userIds)->get()->keyBy('id');

            $data = [];
            foreach ($activeSessions as $s) {
                if (preg_match('/^user_session_(\d+)$/', $s['session'], $matches)) {
                    $uId = (int) $matches[1];
                    $user = $users->get($uId);
                    if ($user) {
                        $data[] = [
                            'user_id' => $user->id,
                            'user_name' => $user->name,
                            'user_email' => $user->email,
                            'status' => $s['status'],
                            'number' => $s['number'],
                            'name' => $s['name'],
                            'has_auth' => $s['has_auth']
                        ];
                    }
                }
            }

            return response()->json(['data' => $data]);
        } catch (\Throwable $e) {
            Log::error('[WhatsApp] Failed to fetch active sessions', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to reach WhatsApp Engine.'], 500);
        }
    }

    public function disconnectUser(Request $request, $userId): JsonResponse
    {
        $sessionName = "user_session_{$userId}";
        
        $session = WhatsappSession::where('session_name', $sessionName)->first();
        if ($session) {
            $session->update([
                'status' => 'disconnected',
                'qr_payload' => null,
                'disconnected_at' => now(),
            ]);
        }

        try {
            $this->requestEngine('post', 'session/disconnect', [], 5, $sessionName);
        } catch (\Exception $e) {
            // Ignore
        }

        return response()->json(['success' => true]);
    }
}
