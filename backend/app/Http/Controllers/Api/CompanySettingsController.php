<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class CompanySettingsController extends Controller
{
    public function show(): JsonResponse
    {
        $tenant = Tenant::first();
        if (!$tenant) {
            return response()->json(['message' => 'Tenant settings not found.'], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $tenant
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $tenant = Tenant::first();
        if (!$tenant) {
            return response()->json(['message' => 'Tenant settings not found.'], 404);
        }

        $validated = $request->validate([
            'legal_name' => 'nullable|string|max:255',
            'brand_name' => 'nullable|string|max:255',
            'address' => 'nullable|string',
            'tax_number' => 'nullable|string|max:100',
            'signatory_name' => 'nullable|string|max:255',
            'signatory_position' => 'nullable|string|max:255',
        ]);

        $original = $tenant->toArray();
        $tenant->update($validated);

        AuditService::logUpdated('tenant_settings', $tenant, $original);

        return response()->json([
            'success' => true,
            'data' => $tenant,
            'message' => 'Company settings updated successfully.'
        ]);
    }

    public function uploadLogo(Request $request): JsonResponse
    {
        $tenant = Tenant::first();
        if (!$tenant) {
            return response()->json(['message' => 'Tenant settings not found.'], 404);
        }

        $request->validate([
            'logo' => 'required|image|mimes:png,jpg,jpeg,webp|max:2048'
        ]);

        if ($tenant->logo_path) {
            Storage::disk('public')->delete($tenant->logo_path);
        }

        $path = $request->file('logo')->store('branding/logos', 'public');
        
        $original = $tenant->toArray();
        $tenant->update(['logo_path' => $path]);

        AuditService::logUpdated('tenant_settings', $tenant, $original);

        return response()->json([
            'success' => true,
            'logo_url' => Storage::disk('public')->url($path),
            'data' => $tenant,
            'message' => 'Logo uploaded successfully.'
        ]);
    }

    public function deleteLogo(): JsonResponse
    {
        $tenant = Tenant::first();
        if (!$tenant) {
            return response()->json(['message' => 'Tenant settings not found.'], 404);
        }

        if ($tenant->logo_path) {
            Storage::disk('public')->delete($tenant->logo_path);
            $original = $tenant->toArray();
            $tenant->update(['logo_path' => null]);
            AuditService::logUpdated('tenant_settings', $tenant, $original);
        }

        return response()->json([
            'success' => true,
            'data' => $tenant,
            'message' => 'Logo removed successfully.'
        ]);
    }

    public function uploadSignatoryImage(Request $request): JsonResponse
    {
        $tenant = Tenant::first();
        if (!$tenant) {
            return response()->json(['message' => 'Tenant settings not found.'], 404);
        }

        $request->validate([
            'signatory_image' => 'required|image|mimes:png,jpg,jpeg|max:1048'
        ]);

        if ($tenant->signatory_image_path) {
            Storage::disk('public')->delete($tenant->signatory_image_path);
        }

        $path = $request->file('signatory_image')->store('branding/signatures', 'public');
        
        $original = $tenant->toArray();
        $tenant->update(['signatory_image_path' => $path]);

        AuditService::logUpdated('tenant_settings', $tenant, $original);

        return response()->json([
            'success' => true,
            'signatory_image_url' => Storage::disk('public')->url($path),
            'data' => $tenant,
            'message' => 'Signatory signature image uploaded successfully.'
        ]);
    }
}
