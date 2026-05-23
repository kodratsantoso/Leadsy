<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class WhatsAppMessagingController extends Controller
{
    private string $sidecarUrl;

    public function __construct()
    {
        $this->sidecarUrl = env('WHATSAPP_SIDECAR_URL', 'http://whatsapp-service:3002');
    }

    public function sendDirect(Request $request): JsonResponse
    {
        $data = $request->validate([
            'lead_id' => 'required|exists:leads,id',
            'message' => 'required|string',
        ]);

        $lead = Lead::find($data['lead_id']);
        if (! $lead->phone) {
            return response()->json(['error' => 'Lead has no phone number'], 422);
        }

        $cleanPhone = preg_replace('/[^0-9]/', '', $lead->phone);

        try {
            $response = Http::post("{$this->sidecarUrl}/api/messages/send", [
                'jid' => "{$cleanPhone}@s.whatsapp.net",
                'text' => $data['message'],
            ]);

            if ($response->successful()) {
                // Log outbound message locally if tracking is desired
                return response()->json(['success' => true, 'data' => $response->json()]);
            }

            return response()->json(['error' => 'Provider error', 'details' => $response->json()], 502);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Transmission failed: '.$e->getMessage()], 503);
        }
    }
}
