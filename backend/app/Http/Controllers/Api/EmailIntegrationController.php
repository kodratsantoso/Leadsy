<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\IntegrationConfig;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmailIntegrationController extends Controller
{
    private function currentTenantId(Request $request): ?int
    {
        return $request->user()?->tenant_id ?? auth('sanctum')->user()?->tenant_id;
    }

    public function getConfig(Request $request): JsonResponse
    {
        $tenantId = $this->currentTenantId($request);

        $configs = IntegrationConfig::query()
            ->where('category', 'email')
            ->where(function ($query) use ($tenantId) {
                $query->whereNull('tenant_id');
                if ($tenantId !== null) {
                    $query->orWhere('tenant_id', $tenantId);
                }
            })
            ->get()
            ->keyBy('key');

        $getVal = function ($key, $default = '') use ($configs) {
            return $configs->has($key) ? $configs[$key]->safe_value : $default;
        };

        return response()->json([
            'data' => [
                'mail_provider' => $getVal('mail_provider', 'lark'),
                'smtp_host' => $getVal('smtp_host', config('mail.mailers.smtp.host', 'smtp.larksuite.com')),
                'smtp_port' => (int) $getVal('smtp_port', config('mail.mailers.smtp.port', 465)),
                'smtp_encryption' => $getVal('smtp_encryption', config('mail.mailers.smtp.encryption', 'ssl')),
                'smtp_username' => $getVal('smtp_username', config('mail.mailers.smtp.username', '')),
                'smtp_has_password' => $configs->has('smtp_password') && !empty($configs['smtp_password']->value),
                'mail_from_name' => $getVal('mail_from_name', config('mail.from.name', 'Leadsy Enterprise')),
                'mail_from_address' => $getVal('mail_from_address', config('mail.from.address', '')),
                'imap_enabled' => $getVal('imap_enabled', 'false') === 'true' || $getVal('imap_enabled') === '1',
                'imap_host' => $getVal('imap_host', 'imap.larksuite.com'),
                'imap_port' => (int) $getVal('imap_port', 993),
                'imap_encryption' => $getVal('imap_encryption', 'ssl'),
                'imap_username' => $getVal('imap_username', ''),
                'imap_has_password' => $configs->has('imap_password') && !empty($configs['imap_password']->value),
                'sync_interval' => (int) $getVal('sync_interval', 15),
                'last_sync_at' => $getVal('last_sync_at', null),
                'connection_status' => $getVal('connection_status', 'untested'),
                'connection_message' => $getVal('connection_message', ''),
            ]
        ]);
    }

    public function saveConfig(Request $request): JsonResponse
    {
        $tenantId = $this->currentTenantId($request);

        $data = $request->validate([
            'mail_provider' => 'nullable|string',
            'smtp_host' => 'required|string',
            'smtp_port' => 'required|integer',
            'smtp_encryption' => 'required|string|in:ssl,tls,none',
            'smtp_username' => 'nullable|string',
            'smtp_password' => 'nullable|string',
            'mail_from_name' => 'required|string',
            'mail_from_address' => 'required|string',
            'imap_enabled' => 'nullable|boolean',
            'imap_host' => 'nullable|string',
            'imap_port' => 'nullable|integer',
            'imap_encryption' => 'nullable|string|in:ssl,tls,none',
            'imap_username' => 'nullable|string',
            'imap_password' => 'nullable|string',
            'sync_interval' => 'nullable|integer',
        ]);

        $saveKey = function ($key, $val, $isSecret = false, $valType = 'string') use ($tenantId) {
            IntegrationConfig::updateOrCreate(
                [
                    'tenant_id' => $tenantId,
                    'category' => 'email',
                    'key' => $key,
                ],
                [
                    'value' => (string) $val,
                    'is_secret' => $isSecret,
                    'is_active' => true,
                    'value_type' => $valType,
                ]
            );
        };

        $saveKey('mail_provider', $data['mail_provider'] ?? 'custom');
        $saveKey('smtp_host', $data['smtp_host']);
        $saveKey('smtp_port', $data['smtp_port'], false, 'number');
        $saveKey('smtp_encryption', $data['smtp_encryption']);
        $saveKey('smtp_username', $data['smtp_username'] ?? '');
        if (!empty($data['smtp_password'])) {
            $saveKey('smtp_password', $data['smtp_password'], true);
        }
        $saveKey('mail_from_name', $data['mail_from_name']);
        $saveKey('mail_from_address', $data['mail_from_address']);

        $saveKey('imap_enabled', !empty($data['imap_enabled']) ? 'true' : 'false', false, 'boolean');
        $saveKey('imap_host', $data['imap_host'] ?? '');
        $saveKey('imap_port', $data['imap_port'] ?? 993, false, 'number');
        $saveKey('imap_encryption', $data['imap_encryption'] ?? 'ssl');
        $saveKey('imap_username', $data['imap_username'] ?? '');
        if (!empty($data['imap_password'])) {
            $saveKey('imap_password', $data['imap_password'], true);
        }
        $saveKey('sync_interval', $data['sync_interval'] ?? 15, false, 'number');

        return response()->json([
            'success' => true,
            'message' => 'Konfigurasi integrasi email berhasil disimpan.'
        ]);
    }

    public function testConnection(Request $request): JsonResponse
    {
        $data = $request->validate([
            'type' => 'required|string|in:smtp,imap',
            'host' => 'required|string',
            'port' => 'required|integer',
            'encryption' => 'nullable|string|in:ssl,tls,none',
            'username' => 'nullable|string',
            'password' => 'nullable|string',
        ]);

        $host = trim($data['host']);
        $port = (int) $data['port'];
        $timeout = 8;
        $prefix = ($data['encryption'] === 'ssl') ? 'ssl://' : '';

        // Test socket connection
        $errNo = 0;
        $errStr = '';
        $fp = @stream_socket_client("{$prefix}{$host}:{$port}", $errNo, $errStr, $timeout);

        if (!$fp) {
            return response()->json([
                'success' => false,
                'message' => "Gagal terhubung ke {$host}:{$port} - {$errStr} (Code: {$errNo})"
            ], 422);
        }

        // Read initial server greeting
        stream_set_timeout($fp, 5);
        $greeting = fgets($fp, 512);
        fclose($fp);

        return response()->json([
            'success' => true,
            'message' => "Koneksi ke {$host}:{$port} berhasil! Respons server: " . trim($greeting ?: 'OK 220 Service Ready')
        ]);
    }

    public function syncEmails(Request $request): JsonResponse
    {
        $tenantId = $this->currentTenantId($request);
        $service = new \App\Services\Integrations\EmailSyncService($tenantId);
        $result = $service->sync(25);

        return response()->json($result, $result['success'] ? 200 : 422);
    }
}
