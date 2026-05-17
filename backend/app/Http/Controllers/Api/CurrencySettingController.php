<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Currency;
use App\Models\CurrencySetting;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CurrencySettingController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json([
            'data' => [
                'currencies' => Currency::query()
                    ->where('is_active', true)
                    ->orderBy('code')
                    ->get(),
                'setting' => $this->serializeSetting($this->currentSetting($request)),
            ],
        ]);
    }

    public function format(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->serializeSetting($this->currentSetting($request))]);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'currency_id' => ['required', 'exists:currencies,id'],
            'thousands_separator' => ['required', 'string', 'max:4', Rule::in([',', '.', ' ', "'"])],
            'decimal_separator' => ['required', 'string', 'max:4', Rule::in([',', '.'])],
            'decimal_digits' => ['required', 'integer', 'min:0', 'max:6'],
            'symbol_position' => ['required', Rule::in(['before', 'after'])],
            'space_between_symbol' => ['required', 'boolean'],
        ]);

        if ($data['thousands_separator'] === $data['decimal_separator']) {
            return response()->json([
                'message' => 'Thousands separator and decimal separator must be different.',
                'errors' => [
                    'decimal_separator' => ['Decimal separator must be different from thousands separator.'],
                ],
            ], 422);
        }

        $tenantId = $request->user()?->tenant_id;
        $existing = CurrencySetting::where('tenant_id', $tenantId)->first();
        $original = $existing?->getAttributes() ?? [];

        $setting = CurrencySetting::updateOrCreate(
            ['tenant_id' => $tenantId],
            [
                ...$data,
                'tenant_id' => $tenantId,
            ]
        );

        $existing
            ? AuditService::logUpdated('currency_settings', $setting, $original)
            : AuditService::logCreated('currency_settings', $setting);

        return response()->json(['data' => $this->serializeSetting($setting->fresh('currency'))]);
    }

    private function currentSetting(Request $request): CurrencySetting
    {
        $tenantId = $request->user()?->tenant_id;

        $setting = CurrencySetting::with('currency')
            ->where('tenant_id', $tenantId)
            ->first()
            ?? CurrencySetting::with('currency')->whereNull('tenant_id')->first();

        if ($setting) {
            return $setting;
        }

        $currency = Currency::where('code', 'IDR')->first() ?? Currency::orderBy('code')->firstOrFail();

        return CurrencySetting::create([
            'tenant_id' => null,
            'currency_id' => $currency->id,
            'thousands_separator' => '.',
            'decimal_separator' => ',',
            'decimal_digits' => $currency->minor_unit,
            'symbol_position' => 'before',
            'space_between_symbol' => true,
        ])->load('currency');
    }

    private function serializeSetting(CurrencySetting $setting): array
    {
        $setting->loadMissing('currency');

        return [
            'id' => $setting->id,
            'tenant_id' => $setting->tenant_id,
            'currency_id' => $setting->currency_id,
            'currency_code' => $setting->currency?->code,
            'currency_name' => $setting->currency?->name,
            'currency_symbol' => $setting->currency?->symbol,
            'minor_unit' => $setting->currency?->minor_unit,
            'thousands_separator' => $setting->thousands_separator,
            'decimal_separator' => $setting->decimal_separator,
            'decimal_digits' => $setting->decimal_digits,
            'symbol_position' => $setting->symbol_position,
            'space_between_symbol' => $setting->space_between_symbol,
        ];
    }
}
