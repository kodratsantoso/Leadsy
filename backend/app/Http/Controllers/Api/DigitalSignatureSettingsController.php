<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DigitalSignatureConnection;
use App\Services\AuditService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class DigitalSignatureSettingsController extends Controller
{
    public function index(): JsonResponse
    {
        $connections = DigitalSignatureConnection::all();
        
        // Hide API keys
        $connections->makeHidden(['encrypted_api_key', 'encrypted_webhook_secret']);
        
        return response()->json($connections);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'provider_name' => 'required|string',
            'base_url' => 'required|url',
            'api_key' => 'required|string',
            'is_active' => 'boolean',
        ]);

        // If making active, deactivate others
        if ($validated['is_active'] ?? true) {
            DigitalSignatureConnection::query()->update(['is_active' => false]);
        }

        $connection = new DigitalSignatureConnection();
        $connection->provider_name = $validated['provider_name'];
        $connection->base_url = $validated['base_url'];
        $connection->api_key = $validated['api_key']; // goes through mutator
        $connection->is_active = $validated['is_active'] ?? true;
        $connection->created_by = $request->user()->id;
        $connection->save();

        AuditService::logCreated('digital_signature_settings', $connection);

        return response()->json($connection->makeHidden(['encrypted_api_key', 'encrypted_webhook_secret']));
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $connection = DigitalSignatureConnection::findOrFail($id);
        $original = $connection->toArray();

        $validated = $request->validate([
            'provider_name' => 'string',
            'base_url' => 'url',
            'api_key' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        if (isset($validated['is_active']) && $validated['is_active']) {
            DigitalSignatureConnection::where('id', '!=', $id)->update(['is_active' => false]);
        }

        if (isset($validated['provider_name'])) $connection->provider_name = $validated['provider_name'];
        if (isset($validated['base_url'])) $connection->base_url = $validated['base_url'];
        if (!empty($validated['api_key'])) $connection->api_key = $validated['api_key'];
        if (isset($validated['is_active'])) $connection->is_active = $validated['is_active'];
        
        $connection->updated_by = $request->user()->id;
        $connection->save();

        AuditService::logUpdated('digital_signature_settings', $connection, $original);

        return response()->json($connection->makeHidden(['encrypted_api_key', 'encrypted_webhook_secret']));
    }

    public function destroy(int $id): JsonResponse
    {
        $connection = DigitalSignatureConnection::findOrFail($id);
        $connection->delete();
        AuditService::logDeleted('digital_signature_settings', $connection);
        
        return response()->json(['message' => 'Deleted successfully']);
    }
}
