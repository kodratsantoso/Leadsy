<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FunnelStage;
use App\Models\Lead;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FunnelController extends Controller
{
    /** GET /api/funnel/stages */
    public function stages(Request $request): JsonResponse
    {
        $query = FunnelStage::query()->orderBy('sequence')->orderBy('id');

        if (! $request->boolean('include_inactive')) {
            $query->where('is_active', true);
        }

        return response()->json([
            'data' => $query->get(),
        ]);
    }

    /** POST /api/funnel/stages */
    public function storeStage(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'        => 'required|string|max:255',
            'sequence'    => 'required|integer|min:0',
            'color'       => 'nullable|string|max:7',
            'probability' => 'nullable|integer|min:0|max:100',
            'is_active'   => 'nullable|boolean',
        ]);

        $stage = FunnelStage::create($data);
        AuditService::logCreated('funnel_stages', $stage);

        return response()->json(['data' => $stage], 201);
    }

    /** PUT /api/funnel/stages/{stage} */
    public function updateStage(Request $request, FunnelStage $stage): JsonResponse
    {
        $original = $stage->getAttributes();
        $data = $request->validate([
            'name'        => 'sometimes|string|max:255',
            'sequence'    => 'nullable|integer|min:0',
            'color'       => 'nullable|string|max:7',
            'probability' => 'nullable|integer|min:0|max:100',
            'is_active'   => 'nullable|boolean',
        ]);

        $stage->update($data);
        AuditService::logUpdated('funnel_stages', $stage, $original);

        return response()->json(['data' => $stage]);
    }

    /** DELETE /api/funnel/stages/{stage} */
    public function destroyStage(FunnelStage $stage): JsonResponse
    {
        if (Lead::where('funnel_stage_id', $stage->id)->exists()) {
            return response()->json(['message' => 'Cannot delete stage: leads are assigned to it.'], 422);
        }

        AuditService::logDeleted('funnel_stages', $stage);
        $stage->delete();

        return response()->json(null, 204);
    }

    /** GET /api/funnel/dashboard – conversion metrics */
    public function dashboard(): JsonResponse
    {
        $stages = FunnelStage::where('is_active', true)->orderBy('sequence')->get();

        $counts = Lead::visibleTo(request()->user())
            ->select('funnel_stage_id', DB::raw('count(*) as total'))
            ->whereNotNull('funnel_stage_id')
            ->groupBy('funnel_stage_id')
            ->pluck('total', 'funnel_stage_id');

        $result = $stages->map(fn ($s) => [
            'id'          => $s->id,
            'name'        => $s->name,
            'color'       => $s->color,
            'sequence'    => $s->sequence,
            'probability' => $s->probability,
            'count'       => $counts[$s->id] ?? 0,
        ]);

        return response()->json(['data' => $result]);
    }
}
