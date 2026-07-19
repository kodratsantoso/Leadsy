<?php
 
namespace App\Http\Controllers\Api;
 
use App\Http\Controllers\Controller;
use App\Models\TaxCode;
use App\Models\WithholdingTaxCode;
use App\Models\ItemSetting;
use App\Services\AuditService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
 
class O2CSettingsController extends Controller
{
    // === TAX CODES CRUD ===
 
    public function getTaxCodes(): JsonResponse
    {
        return response()->json([
            'data' => TaxCode::orderByDesc('is_default')->orderBy('tax_code')->get()
        ]);
    }
 
    public function storeTaxCode(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'tax_code' => 'required|string|unique:tax_codes,tax_code|max:50',
            'tax_name' => 'required|string|max:100',
            'tax_type' => 'required|string|in:sales_tax,vat,service_tax,non_taxable,other',
            'rate_percentage' => 'required|numeric|min:0',
            'description' => 'nullable|string',
            'country' => 'nullable|string|max:100',
            'is_default' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
            'effective_from' => 'nullable|date',
            'effective_until' => 'nullable|date|after_or_equal:effective_from',
        ]);
 
        return DB::transaction(function () use ($validated) {
            $isDefault = $validated['is_default'] ?? false;
            
            if ($isDefault) {
                TaxCode::query()->update(['is_default' => false]);
            }
 
            $taxCode = TaxCode::create(array_merge($validated, [
                'is_default' => $isDefault,
                'is_active' => $validated['is_active'] ?? true,
                'created_by' => Auth::id(),
            ]));
 
            AuditService::logCreated('tax_codes', $taxCode);
 
            return response()->json(['data' => $taxCode], 201);
        });
    }
 
    public function updateTaxCode(Request $request, $id): JsonResponse
    {
        $taxCode = TaxCode::findOrFail($id);
 
        $validated = $request->validate([
            'tax_code' => 'required|string|max:50|unique:tax_codes,tax_code,' . $taxCode->id,
            'tax_name' => 'required|string|max:100',
            'tax_type' => 'required|string|in:sales_tax,vat,service_tax,non_taxable,other',
            'rate_percentage' => 'required|numeric|min:0',
            'description' => 'nullable|string',
            'country' => 'nullable|string|max:100',
            'is_default' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
            'effective_from' => 'nullable|date',
            'effective_until' => 'nullable|date|after_or_equal:effective_from',
        ]);
 
        $original = $taxCode->toArray();
 
        return DB::transaction(function () use ($taxCode, $validated, $original) {
            $isDefault = $validated['is_default'] ?? false;
            
            if ($isDefault) {
                TaxCode::query()->where('id', '!=', $taxCode->id)->update(['is_default' => false]);
            }
 
            $taxCode->update(array_merge($validated, [
                'is_default' => $isDefault,
                'is_active' => $validated['is_active'] ?? true,
                'updated_by' => Auth::id(),
            ]));
 
            AuditService::logUpdated('tax_codes', $taxCode, $original);
 
            return response()->json(['data' => $taxCode]);
        });
    }
 
    public function destroyTaxCode($id): JsonResponse
    {
        $taxCode = TaxCode::findOrFail($id);
        $original = $taxCode->toArray();
 
        DB::transaction(function () use ($taxCode, $original) {
            $taxCode->delete();
            AuditService::logDeleted('tax_codes', $taxCode, $original);
        });
 
        return response()->json(['message' => 'Tax Code deleted successfully.']);
    }
 
    // === WITHHOLDING TAX CODES CRUD ===
 
    public function getWithholdingTaxCodes(): JsonResponse
    {
        return response()->json([
            'data' => WithholdingTaxCode::orderByDesc('is_default')->orderBy('wht_code')->get()
        ]);
    }
 
    public function storeWithholdingTaxCode(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'wht_code' => 'required|string|unique:withholding_tax_codes,wht_code|max:50',
            'wht_name' => 'required|string|max:100',
            'wht_type' => 'required|string|in:income_tax,service_withholding,professional_service,other',
            'rate_percentage' => 'required|numeric|min:0',
            'description' => 'nullable|string',
            'country' => 'nullable|string|max:100',
            'is_default' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
            'effective_from' => 'nullable|date',
            'effective_until' => 'nullable|date|after_or_equal:effective_from',
        ]);
 
        return DB::transaction(function () use ($validated) {
            $isDefault = $validated['is_default'] ?? false;
            
            if ($isDefault) {
                WithholdingTaxCode::query()->update(['is_default' => false]);
            }
 
            $whtCode = WithholdingTaxCode::create(array_merge($validated, [
                'is_default' => $isDefault,
                'is_active' => $validated['is_active'] ?? true,
                'created_by' => Auth::id(),
            ]));
 
            AuditService::logCreated('withholding_tax_codes', $whtCode);
 
            return response()->json(['data' => $whtCode], 201);
        });
    }
 
    public function updateWithholdingTaxCode(Request $request, $id): JsonResponse
    {
        $whtCode = WithholdingTaxCode::findOrFail($id);
 
        $validated = $request->validate([
            'wht_code' => 'required|string|max:50|unique:withholding_tax_codes,wht_code,' . $whtCode->id,
            'wht_name' => 'required|string|max:100',
            'wht_type' => 'required|string|in:income_tax,service_withholding,professional_service,other',
            'rate_percentage' => 'required|numeric|min:0',
            'description' => 'nullable|string',
            'country' => 'nullable|string|max:100',
            'is_default' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
            'effective_from' => 'nullable|date',
            'effective_until' => 'nullable|date|after_or_equal:effective_from',
        ]);
 
        $original = $whtCode->toArray();
 
        return DB::transaction(function () use ($whtCode, $validated, $original) {
            $isDefault = $validated['is_default'] ?? false;
            
            if ($isDefault) {
                WithholdingTaxCode::query()->where('id', '!=', $whtCode->id)->update(['is_default' => false]);
            }
 
            $whtCode->update(array_merge($validated, [
                'is_default' => $isDefault,
                'is_active' => $validated['is_active'] ?? true,
                'updated_by' => Auth::id(),
            ]));
 
            AuditService::logUpdated('withholding_tax_codes', $whtCode, $original);
 
            return response()->json(['data' => $whtCode]);
        });
    }
 
    public function destroyWithholdingTaxCode($id): JsonResponse
    {
        $whtCode = WithholdingTaxCode::findOrFail($id);
        $original = $whtCode->toArray();
 
        DB::transaction(function () use ($whtCode, $original) {
            $whtCode->delete();
            AuditService::logDeleted('withholding_tax_codes', $whtCode, $original);
        });
 
        return response()->json(['message' => 'Withholding Tax Code deleted successfully.']);
    }
 
    // === ITEM SETTINGS ===
 
    public function getItemSettings(): JsonResponse
    {
        $settings = ItemSetting::where('is_active', true)->get();
        return response()->json(['data' => $settings]);
    }
 
    public function updateItemSettings(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'settings' => 'required|array',
            'settings.*.setting_key' => 'required|string',
            'settings.*.setting_value_json' => 'nullable',
        ]);
 
        return DB::transaction(function () use ($validated) {
            $saved = [];
            foreach ($validated['settings'] as $item) {
                $setting = ItemSetting::updateOrCreate(
                    ['setting_key' => $item['setting_key']],
                    [
                        'setting_value_json' => $item['setting_value_json'],
                        'is_active' => true,
                        'updated_by' => Auth::id()
                    ]
                );
                $saved[] = $setting;
            }
 
            AuditService::log('update_item_settings', 'item_settings', null, null, $validated);
 
            return response()->json(['data' => $saved]);
        });
    }
}
