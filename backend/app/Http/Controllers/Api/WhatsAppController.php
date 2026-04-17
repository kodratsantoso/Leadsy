<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use App\Models\WhatsappSession;
use App\Models\WhatsappContact;
use App\Models\WhatsappConversation;
use App\Models\WhatsappMessage;
use App\Models\WhatsappCampaign;
use App\Models\WhatsappCampaignRecipient;
use App\Models\WhatsappSyncRule;
use App\Models\Lead;
use App\Jobs\AnalyzeWhatsAppConversationJob;

class WhatsAppController extends Controller
{
    /**
     * Baileys sidecar URL — Docker service name, NOT localhost.
     */
    private string $engineUrl = 'http://whatsapp-service:3002/api';
    private string $defaultSession = 'leads_platform_session';

    /* ──────────────────────────────────────────────────────────────
     *  SESSION / QR
     * ────────────────────────────────────────────────────────────── */

    public function initSession(): JsonResponse
    {
        $session = WhatsappSession::firstOrCreate(
            ['session_name' => $this->defaultSession],
            ['status' => 'disconnected']
        );

        try {
            $res = Http::timeout(5)->post("{$this->engineUrl}/session/start");
            Log::info('[WhatsApp] Init session', ['sidecar_response' => $res->json()]);
        } catch (\Exception $e) {
            Log::error('[WhatsApp] Engine unreachable on init', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to reach WhatsApp Engine. Ensure the sidecar is running.'], 500);
        }

        // Re-read session to get the latest QR from webhook
        $session->refresh();

        return response()->json([
            'status'     => $session->status,
            'qr_payload' => $session->qr_payload,
        ]);
    }

    public function status(): JsonResponse
    {
        $session = WhatsappSession::where('session_name', $this->defaultSession)->first();
        if (!$session) {
            return response()->json(['status' => 'disconnected', 'number' => null, 'qr_payload' => null]);
        }

        return response()->json([
            'status'     => $session->status,
            'number'     => $session->metadata_json['number'] ?? null,
            'qr_payload' => $session->status === 'qr_ready' ? $session->qr_payload : null,
            'connected_at' => $session->connected_at?->toIso8601String(),
        ]);
    }

    public function refreshQr(): JsonResponse
    {
        try {
            Http::timeout(5)->post("{$this->engineUrl}/session/refresh-qr");
        } catch (\Exception $e) {
            return response()->json(['error' => 'Engine unreachable.'], 500);
        }

        return response()->json(['success' => true, 'message' => 'QR refresh requested']);
    }

    public function disconnect(): JsonResponse
    {
        $session = WhatsappSession::where('session_name', $this->defaultSession)->first();
        if ($session) {
            $session->update([
                'status' => 'disconnected',
                'qr_payload' => null,
                'disconnected_at' => now(),
            ]);
        }

        try {
            Http::timeout(5)->post("{$this->engineUrl}/session/disconnect");
        } catch (\Exception $e) {
            // Ignore — sidecar may already be down
        }

        return response()->json(['success' => true]);
    }

    /* ──────────────────────────────────────────────────────────────
     *  DIRECT MESSAGING
     * ────────────────────────────────────────────────────────────── */

    public function sendMessage(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone'  => 'required|string',
            'text'   => 'required|string',
        ]);

        // Normalize phone → JID
        $phone = preg_replace('/[^0-9]/', '', $data['phone']);
        $jid = "{$phone}@s.whatsapp.net";

        try {
            $res = Http::timeout(10)->post("{$this->engineUrl}/messages/send", [
                'jid'  => $jid,
                'text' => $data['text'],
            ]);

            if (!$res->successful()) {
                return response()->json(['error' => $res->json('error', 'Send failed')], $res->status());
            }

            // Log outbound message to DB using the correct schema
            $contact = WhatsappContact::firstOrCreate(
                ['phone_number' => $jid],
                [
                    'name' => null,
                    'normalized_phone_number' => $phone,
                    'is_relevant' => true,
                    'relevance_reason' => 'outbound_message',
                ]
            );

            $conversation = WhatsappConversation::firstOrCreate(
                ['external_chat_id' => $jid],
                [
                    'contact_id' => $contact->id,
                    'sync_status' => 'active',
                    'relevance_status' => 'high',
                    'approved_for_sync' => true,
                ]
            );

            WhatsappMessage::create([
                'conversation_id'     => $conversation->id,
                'external_message_id' => $res->json('external_id', uniqid('out_')),
                'direction'           => 'outbound',
                'message_type'        => 'text',
                'body'                => $data['text'],
                'sent_at'             => now(),
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
        $campaigns = WhatsappCampaign::with(['recipients' => function ($q) {
            $q->select('id', 'campaign_id', 'phone_number', 'send_status', 'sent_at');
        }])
            ->orderBy('created_at', 'desc')
            ->take(50)
            ->get();

        return response()->json(['data' => $campaigns]);
    }

    public function createCampaign(Request $request): JsonResponse
    {
        $data = $request->validate([
            'campaign_name'    => 'required|string|max:255',
            'message_template' => 'required|string',
            'lead_ids'         => 'required|array|min:1',
            'lead_ids.*'       => 'integer|exists:leads,id',
        ]);

        $leads = Lead::whereIn('id', $data['lead_ids'])
            ->whereNotNull('phone')
            ->where('phone', '!=', '')
            ->get();

        if ($leads->isEmpty()) {
            return response()->json(['error' => 'No leads with valid phone numbers found.'], 422);
        }

        $campaign = WhatsappCampaign::create([
            'campaign_name'    => $data['campaign_name'],
            'message_template' => $data['message_template'],
            'total_targets'    => $leads->count(),
            'status'           => 'draft',
        ]);

        foreach ($leads as $lead) {
            WhatsappCampaignRecipient::create([
                'campaign_id'  => $campaign->id,
                'lead_id'      => $lead->id,
                'phone_number' => preg_replace('/[^0-9]/', '', $lead->phone),
                'send_status'  => 'pending',
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
                $res = Http::timeout(10)->post("{$this->engineUrl}/messages/send", [
                    'jid'  => $jid,
                    'text' => $campaign->message_template,
                ]);

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

    /* ──────────────────────────────────────────────────────────────
     *  CONVERSATIONS
     * ────────────────────────────────────────────────────────────── */

    public function getConversations(): JsonResponse
    {
        $convs = WhatsappConversation::with(['contact', 'aiAnalysis'])
            ->where('approved_for_sync', true)
            ->orderBy('last_message_at', 'desc')
            ->get();

        return response()->json(['data' => $convs]);
    }

    public function getConversationMessages($id): JsonResponse
    {
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
}
