<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WhatsappSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class WhatsAppSessionController extends Controller
{
    private string $sidecarUrl;

    public function __construct()
    {
        $this->sidecarUrl = env('WHATSAPP_SIDECAR_URL', 'http://whatsapp-service:3002');
    }

    public function start(Request $request): JsonResponse
    {
        try {
            $response = Http::post("{$this->sidecarUrl}/api/session/start");

            if ($response->successful() || $response->json('status') === 'connected') {
                return response()->json(['message' => 'Initialization command sent to sidecar']);
            }

            return response()->json(['error' => 'Failed to initialize session'], 500);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Sidecar unreachable: '.$e->getMessage()], 503);
        }
    }

    public function status(Request $request): JsonResponse
    {
        try {
            $response = Http::get("{$this->sidecarUrl}/api/session/status");
            $data = $response->json();

            // Sync with local DB status for local tracking if needed
            if ($data && isset($data['status'])) {
                WhatsappSession::updateOrCreate(
                    ['session_name' => 'leads_platform_session'],
                    [
                        'status' => $data['status'],
                        'qr_payload' => $data['qr'] ?? null,
                    ]
                );
            }

            return response()->json($data);
        } catch (\Exception $e) {
            return response()->json(['status' => 'disconnected', 'error' => 'Sidecar unreachable'], 503);
        }
    }

    public function disconnect(Request $request): JsonResponse
    {
        try {
            Http::post("{$this->sidecarUrl}/api/session/disconnect");
            WhatsappSession::where('session_name', 'leads_platform_session')->update(['status' => 'disconnected', 'qr_payload' => null]);

            return response()->json(['message' => 'Disconnected']);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Sidecar unreachable'], 503);
        }
    }
}
