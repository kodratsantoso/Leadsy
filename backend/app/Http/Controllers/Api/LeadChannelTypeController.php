<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LeadChannelType;
use App\Models\LeadSourceType;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class LeadChannelTypeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = LeadChannelType::query()
            ->select('lead_channel_types.*')
            ->with('sourceType')
            ->join('lead_source_types', 'lead_source_types.id', '=', 'lead_channel_types.lead_source_type_id')
            ->orderBy('lead_source_types.sort_order')
            ->orderBy('lead_channel_types.sort_order')
            ->orderBy('lead_channel_types.name');

        if ($request->filled('source_type')) {
            $query->whereHas('sourceType', fn ($sourceQuery) => $sourceQuery->where('slug', $request->source_type));
        }

        return response()->json(['data' => $query->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'lead_source_type_id' => 'required|exists:lead_source_types,id',
            'name' => 'required|string|max:120',
            'slug' => 'nullable|string|max:120|unique:lead_channel_types,slug',
            'description' => 'nullable|string|max:500',
            'sort_order' => 'nullable|integer|min:0|max:65535',
            'is_active' => 'nullable|boolean',
        ]);

        $data['slug'] = $this->normalizeSlug($data['slug'] ?? $data['name']);
        $data['sort_order'] = $data['sort_order'] ?? 0;
        $data['is_active'] = $data['is_active'] ?? true;

        $channel = LeadChannelType::create($data);

        AuditService::logCreated('lead_channel_types', $channel);

        return response()->json(['data' => $channel->load('sourceType')], 201);
    }

    public function update(Request $request, LeadChannelType $leadChannel): JsonResponse
    {
        $original = $leadChannel->getAttributes();

        $data = $request->validate([
            'lead_source_type_id' => 'sometimes|required|exists:lead_source_types,id',
            'name' => 'sometimes|required|string|max:120',
            'description' => 'nullable|string|max:500',
            'sort_order' => 'nullable|integer|min:0|max:65535',
            'is_active' => 'nullable|boolean',
        ]);

        $leadChannel->update($data);

        AuditService::logUpdated('lead_channel_types', $leadChannel, $original);

        return response()->json(['data' => $leadChannel->load('sourceType')]);
    }

    public function destroy(LeadChannelType $leadChannel): JsonResponse
    {
        if ($leadChannel->slug === 'unclassified') {
            return response()->json(['message' => 'The fallback channel cannot be deleted.'], 422);
        }

        if ($leadChannel->is_active) {
            $leadChannel->update(['is_active' => false]);
            AuditService::logUpdated('lead_channel_types', $leadChannel, ['is_active' => true]);
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
            ->value() ?: 'unclassified';
    }
}
