<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LeadSourceType;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class LeadSourceTypeController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => LeadSourceType::with(['channels' => fn ($query) => $query->orderBy('sort_order')->orderBy('name')])
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:120',
            'slug' => 'nullable|string|max:120|unique:lead_source_types,slug',
            'description' => 'nullable|string|max:500',
            'sort_order' => 'nullable|integer|min:0|max:65535',
            'is_active' => 'nullable|boolean',
        ]);

        $data['slug'] = $this->normalizeSlug($data['slug'] ?? $data['name']);
        $data['sort_order'] = $data['sort_order'] ?? 0;
        $data['is_active'] = $data['is_active'] ?? true;

        $sourceType = LeadSourceType::create($data);

        AuditService::logCreated('lead_source_types', $sourceType);

        return response()->json(['data' => $sourceType], 201);
    }

    public function update(Request $request, LeadSourceType $leadSource): JsonResponse
    {
        $original = $leadSource->getAttributes();

        $data = $request->validate([
            'name' => 'sometimes|required|string|max:120',
            'description' => 'nullable|string|max:500',
            'sort_order' => 'nullable|integer|min:0|max:65535',
            'is_active' => 'nullable|boolean',
        ]);

        $leadSource->update($data);

        AuditService::logUpdated('lead_source_types', $leadSource, $original);

        return response()->json(['data' => $leadSource]);
    }

    public function destroy(LeadSourceType $leadSource): JsonResponse
    {
        if ($leadSource->slug === 'other') {
            return response()->json(['message' => 'The fallback source cannot be deleted.'], 422);
        }

        if ($leadSource->is_active) {
            $leadSource->update(['is_active' => false]);
            AuditService::logUpdated('lead_source_types', $leadSource, ['is_active' => true]);
        }

        return response()->json(null, 204);
    }

    private function normalizeSlug(string $value): string
    {
        return Str::of($value)
            ->lower()
            ->replace([' ', '-'], '_')
            ->replaceMatches('/[^a-z0-9_]/', '')
            ->replaceMatches('/_+/', '_')
            ->trim('_')
            ->value() ?: 'other';
    }
}
