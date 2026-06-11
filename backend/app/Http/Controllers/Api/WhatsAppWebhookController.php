<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\AnalyzeWhatsAppConversationJob;
use App\Models\WhatsappContact;
use App\Models\WhatsappConversation;
use App\Models\WhatsappMessage;
use App\Models\WhatsappSession;
use App\Services\WhatsApp\WhatsAppSyncEngine;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WhatsAppWebhookController extends Controller
{
    private WhatsAppSyncEngine $syncEngine;

    public function __construct(WhatsAppSyncEngine $syncEngine)
    {
        $this->syncEngine = $syncEngine;
    }

    public function handle(Request $request): JsonResponse
    {
        $payload = $request->all();
        $action = $payload['action'] ?? null;
        $sessionName = $payload['session'] ?? 'default_session';

        $session = WhatsappSession::firstOrCreate(
            ['session_name' => $sessionName],
            ['status' => 'disconnected']
        );

        $userId = null;
        if (preg_match('/^user_session_(\d+)$/', $sessionName, $matches)) {
            $userId = (int) $matches[1];
        }

        if ($action === 'qr') {
            $session->update([
                'qr_payload' => $payload['payload'],
                'status' => 'qr_ready',
                'last_qr_generated_at' => now(),
            ]);
        } elseif ($action === 'status') {
            $session->update([
                'status' => $payload['status'],
                'connected_at' => $payload['status'] === 'connected' ? now() : $session->connected_at,
                'disconnected_at' => $payload['status'] === 'disconnected' ? now() : null,
            ]);
        } elseif ($action === 'inbound_message') {
            $remoteJid = $payload['remote_jid'];
            $body = $payload['body'];
            $senderName = $payload['sender_name'] ?? 'Unknown';

            // 1. Evaluate Privacy Flow FIRST
            $eval = $this->syncEngine->evaluateMessage($senderName, $remoteJid, $body, $userId);

            // If disallowed, drop it silently (DO NOT SYNC TO DB)
            if (! $eval['allow']) {
                \Log::info("WhatsApp Chat Dropped (Privacy Filter) - JID: {$remoteJid}, Reason: {$eval['reason']}");

                return response()->json(['success' => true, 'ignored' => true]);
            }

            // Allowed to ingest
            $contact = WhatsappContact::firstOrCreate(
                [
                    'phone_number' => $remoteJid,
                    'user_id' => $userId,
                ],
                [
                    'name' => $senderName,
                    'is_relevant' => true,
                    'relevance_reason' => $eval['reason'],
                    'linked_lead_id' => $eval['lead_id'],
                ]
            );

            $conversation = WhatsappConversation::firstOrCreate(
                [
                    'external_chat_id' => $remoteJid,
                    'user_id' => $userId,
                ],
                [
                    'contact_id' => $contact->id,
                    'relevance_status' => 'pending',
                    'approved_for_sync' => true,
                    'platform' => 'whatsapp',
                ]
            );

            // Ingest Message
            WhatsappMessage::firstOrCreate(
                ['external_message_id' => $payload['external_id']],
                [
                    'conversation_id' => $conversation->id,
                    'direction' => 'inbound',
                    'body' => $body,
                    'sent_at' => now(), // from unix timestamp if passed
                    'received_at' => now(),
                    'provider_payload_json' => $payload,
                ]
            );

            $conversation->update(['last_message_at' => now()]);

            // Dispatch AI Analysis job in background since it passed the filter
            AnalyzeWhatsAppConversationJob::dispatch($conversation->id);
        } elseif ($action === 'history_sync') {
            $messages = $payload['messages'] ?? [];
            \Log::info("WhatsApp History Sync webhook called with " . count($messages) . " messages");

            foreach ($messages as $msgData) {
                $remoteJid = $msgData['remote_jid'];
                $body = $msgData['body'] ?? '';
                $senderName = $msgData['sender_name'] ?? 'Unknown';
                $direction = $msgData['direction'] ?? 'inbound';
                $externalId = $msgData['external_id'];
                $timestamp = $msgData['timestamp'] ?? null;
                $sentAt = $timestamp ? \Carbon\Carbon::createFromTimestamp($timestamp) : now();

                // Evaluate Privacy Flow FIRST for inbound messages
                $allowed = true;
                $leadId = null;
                $reason = 'history_sync';

                if ($direction === 'inbound') {
                    $eval = $this->syncEngine->evaluateMessage($senderName, $remoteJid, $body, $userId);
                    $allowed = $eval['allow'];
                    $leadId = $eval['lead_id'];
                    $reason = $eval['reason'];
                }

                if (!$allowed) {
                    continue; // Skip restricted messages
                }

                // Allowed to ingest
                $phone = preg_replace('/[^0-9]/', '', $remoteJid);
                $contact = WhatsappContact::firstOrCreate(
                    [
                        'phone_number' => $remoteJid,
                        'user_id' => $userId,
                    ],
                    [
                        'name' => $senderName,
                        'normalized_phone_number' => $phone,
                        'is_relevant' => true,
                        'relevance_reason' => $reason,
                        'linked_lead_id' => $leadId,
                    ]
                );

                $conversation = WhatsappConversation::firstOrCreate(
                    [
                        'external_chat_id' => $remoteJid,
                        'user_id' => $userId,
                    ],
                    [
                        'contact_id' => $contact->id,
                        'relevance_status' => 'pending',
                        'approved_for_sync' => true,
                        'platform' => 'whatsapp',
                    ]
                );

                // Ingest Message
                WhatsappMessage::firstOrCreate(
                    ['external_message_id' => $externalId],
                    [
                        'conversation_id' => $conversation->id,
                        'direction' => $direction,
                        'body' => $body,
                        'sent_at' => $sentAt,
                        'received_at' => $sentAt,
                        'provider_payload_json' => $msgData,
                    ]
                );

                // Update last_message_at if this message is newer
                if (!$conversation->last_message_at || $sentAt->gt($conversation->last_message_at)) {
                    $conversation->update(['last_message_at' => $sentAt]);
                }
            }
        }

        return response()->json(['success' => true]);
    }
}
