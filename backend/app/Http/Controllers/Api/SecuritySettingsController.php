<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SecuritySetting;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SecuritySettingsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $setting = SecuritySetting::resolve($request->user()?->tenant_id);

        return response()->json(['data' => $this->serialize($setting)]);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            // Null = disable session timeout enforcement entirely.
            'session_timeout_minutes' => ['nullable', 'integer', 'min:5', 'max:1440'],
            'password_min_length' => ['required', 'integer', 'min:8', 'max:64'],
            'password_require_uppercase' => ['required', 'boolean'],
            'password_require_special' => ['required', 'boolean'],
        ]);

        $tenantId = $request->user()?->tenant_id;

        $setting = SecuritySetting::updateOrCreate(
            ['tenant_id' => $tenantId],
            $data
        );

        AuditService::logUpdated('security_settings', $setting, []);

        return response()->json([
            'data' => $this->serialize($setting),
            'message' => 'Security settings updated successfully.',
        ]);
    }

    private function serialize(SecuritySetting $setting): array
    {
        return [
            'session_timeout_minutes' => $setting->session_timeout_minutes,
            'password_min_length' => $setting->password_min_length,
            'password_require_uppercase' => $setting->password_require_uppercase,
            'password_require_special' => $setting->password_require_special,
        ];
    }
}
