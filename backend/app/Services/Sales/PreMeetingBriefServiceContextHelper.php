<?php

namespace App\Services\Sales;

class PreMeetingBriefServiceContextHelper
{
    // Helper to format WhatsApp messages for context
    public static function formatWhatsappConversations($conversations)
    {
        if ($conversations->isEmpty()) return [];
        return $conversations->map(function($conv) {
            return [
                'platform' => $conv->platform,
                'last_message_at' => $conv->last_message_at?->toIso8601String(),
                'messages' => $conv->messages->map(function($msg) {
                    return [
                        'direction' => $msg->direction,
                        'message_type' => $msg->message_type,
                        'body' => $msg->body,
                        'sent_at' => $msg->sent_at?->toIso8601String(),
                    ];
                })->toArray(),
            ];
        })->toArray();
    }
}
