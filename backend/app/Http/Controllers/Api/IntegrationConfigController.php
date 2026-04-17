<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\IntegrationConfig;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IntegrationConfigController extends Controller
{
    /**
     * Return all active settings securely (masked if secret).
     * Grouped by category for easier frontend ingestion.
     */
    public function index(): JsonResponse
    {
        $configs = IntegrationConfig::all()->map(function ($config) {
            return [
                'id'         => $config->id,
                'category'   => $config->category,
                'key'        => $config->key,
                'value'      => $config->safe_value,
                'is_secret'  => $config->is_secret,
                'is_active'  => $config->is_active,
                'value_type' => $config->value_type,
            ];
        });

        $grouped = $configs->groupBy('category');

        return response()->json(['data' => $grouped]);
    }

    /**
     * Public endpoint to grab safe/browser-facing keys (e.g., Google Maps Browser Key).
     * Also returns APP_NAME and APP_ENV for the environment page.
     */
    public function publicSettings(): JsonResponse
    {
        $publicKeys = [
            'GOOGLE_MAPS_BROWSER_API_KEY',
            'GOOGLE_MAPS_DEFAULT_CENTER_LAT',
            'GOOGLE_MAPS_DEFAULT_CENTER_LNG',
        ];

        $configs = IntegrationConfig::whereIn('key', $publicKeys)
            ->where('is_active', true)
            ->get()
            ->pluck('value', 'key');

        // Augment with runtime environment values (not stored in DB)
        $configs['APP_NAME'] = config('app.name', 'Prasetia Leads');
        $configs['APP_ENV']  = config('app.env', 'production');

        return response()->json(['data' => $configs]);
    }

    /**
     * Upsert a single integration config entry.
     * Accepts either a single object OR bulk { category, configs[] } format.
     */
    public function store(Request $request): JsonResponse
    {
        // Detect single-item format (key + value + category at root level)
        if ($request->has('key') && ! $request->has('configs')) {
            $data = $request->validate([
                'key'        => 'required|string',
                'value'      => 'nullable',
                'category'   => 'required|string',
                'is_secret'  => 'nullable|boolean',
                'value_type' => 'nullable|string',
                'is_active'  => 'nullable|boolean',
            ]);

            $existing = IntegrationConfig::where('key', $data['key'])->first();

            // Skip secret if masked value passed back
            if ($existing && $existing->is_secret) {
                if (empty($data['value']) || str_starts_with((string) $data['value'], '••••')) {
                    if (isset($data['is_active'])) {
                        $existing->update(['is_active' => $data['is_active']]);
                    }
                    return response()->json(['message' => 'Secret unchanged', 'data' => $existing]);
                }
            }

            $originalValues = $existing ? $existing->getAttributes() : [];

            $model = IntegrationConfig::updateOrCreate(
                ['key' => $data['key']],
                [
                    'category'   => $data['category'],
                    'value'      => $data['value'],
                    'is_secret'  => $data['is_secret'] ?? ($existing->is_secret ?? false),
                    'value_type' => $data['value_type'] ?? ($existing->value_type ?? 'string'),
                    'is_active'  => $data['is_active'] ?? true,
                ]
            );

            $existing
                ? AuditService::logUpdated('integration_configs', $model, $originalValues)
                : AuditService::logCreated('integration_configs', $model);

            return response()->json(['message' => 'Setting saved', 'data' => $model], 201);
        }

        // Bulk format: { category, configs: [{key, value, ...}] }
        $data = $request->validate([
            'category'             => 'required|string',
            'configs'              => 'required|array',
            'configs.*.key'        => 'required|string',
            'configs.*.value'      => 'nullable',
            'configs.*.is_secret'  => 'nullable|boolean',
            'configs.*.value_type' => 'nullable|string',
            'configs.*.is_active'  => 'nullable|boolean',
        ]);

        $category = $data['category'];
        $updated  = [];

        foreach ($data['configs'] as $conf) {
            $existing = IntegrationConfig::where('key', $conf['key'])->first();

            if ($existing && $existing->is_secret) {
                if (empty($conf['value']) || str_starts_with((string) $conf['value'], '••••')) {
                    if (isset($conf['is_active'])) {
                        $existing->update(['is_active' => $conf['is_active']]);
                        $updated[] = $existing;
                    }
                    continue;
                }
            }

            $originalValues = $existing ? $existing->getAttributes() : [];

            $model = IntegrationConfig::updateOrCreate(
                ['key' => $conf['key']],
                [
                    'category'   => $category,
                    'value'      => $conf['value'],
                    'is_secret'  => $conf['is_secret'] ?? ($existing->is_secret ?? false),
                    'value_type' => $conf['value_type'] ?? ($existing->value_type ?? 'string'),
                    'is_active'  => $conf['is_active'] ?? true,
                ]
            );

            $existing
                ? AuditService::logUpdated('integration_configs', $model, $originalValues)
                : AuditService::logCreated('integration_configs', $model);

            $updated[] = $model;
        }

        return response()->json(['message' => 'Settings updated successfully', 'data' => $updated]);
    }

    /**
     * Delete a single integration config entry.
     */
    public function destroy(IntegrationConfig $integrationConfig): JsonResponse
    {
        AuditService::logDeleted('integration_configs', $integrationConfig);
        $integrationConfig->delete();

        return response()->json(null, 204);
    }
}
