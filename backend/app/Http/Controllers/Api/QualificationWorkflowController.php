<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\QualificationWorkflow;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class QualificationWorkflowController extends Controller
{
    public function index(): JsonResponse
    {
        $workflows = QualificationWorkflow::with(['stages', 'creator'])
            ->orderByDesc('id')
            ->get();

        return response()->json(['data' => $workflows]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validatePayload($request, false);

        $workflow = DB::transaction(function () use ($data, $request) {
            $workflow = QualificationWorkflow::create([
                'tenant_id' => $request->user()?->tenant_id,
                'name' => $data['name'],
                'slug' => $data['slug'] ?? Str::slug($data['name']),
                'trigger_status' => $data['trigger_status'] ?? 'need_review',
                'requires_approval' => $data['requires_approval'] ?? true,
                'override_enabled' => $data['override_enabled'] ?? true,
                'sla_hours' => $data['sla_hours'] ?? null,
                'is_active' => $data['is_active'] ?? true,
                'created_by' => $request->user()?->id,
                'updated_by' => $request->user()?->id,
            ]);

            $this->syncStages($workflow, $data['stages'] ?? []);

            return $workflow->load(['stages', 'creator']);
        });

        AuditService::logCreated('qualification_workflows', $workflow);

        return response()->json(['data' => $workflow], 201);
    }

    public function show(QualificationWorkflow $qualificationWorkflow): JsonResponse
    {
        return response()->json(['data' => $qualificationWorkflow->load(['stages', 'reviews'])]);
    }

    public function update(Request $request, QualificationWorkflow $qualificationWorkflow): JsonResponse
    {
        $data = $this->validatePayload($request, true);
        $original = $qualificationWorkflow->toArray();

        DB::transaction(function () use ($qualificationWorkflow, $data, $request) {
            $qualificationWorkflow->update([
                'name' => $data['name'] ?? $qualificationWorkflow->name,
                'slug' => $data['slug'] ?? $qualificationWorkflow->slug,
                'trigger_status' => $data['trigger_status'] ?? $qualificationWorkflow->trigger_status,
                'requires_approval' => $data['requires_approval'] ?? $qualificationWorkflow->requires_approval,
                'override_enabled' => $data['override_enabled'] ?? $qualificationWorkflow->override_enabled,
                'sla_hours' => $data['sla_hours'] ?? $qualificationWorkflow->sla_hours,
                'is_active' => $data['is_active'] ?? $qualificationWorkflow->is_active,
                'updated_by' => $request->user()?->id,
            ]);

            if (array_key_exists('stages', $data)) {
                $this->syncStages($qualificationWorkflow, $data['stages']);
            }
        });

        $qualificationWorkflow->refresh()->load(['stages', 'creator']);
        AuditService::logUpdated('qualification_workflows', $qualificationWorkflow, $original);

        return response()->json(['data' => $qualificationWorkflow]);
    }

    public function destroy(QualificationWorkflow $qualificationWorkflow): JsonResponse
    {
        $qualificationWorkflow->delete();
        AuditService::logDeleted('qualification_workflows', $qualificationWorkflow);

        return response()->json(['message' => 'Qualification workflow deleted']);
    }

    private function validatePayload(Request $request, bool $isUpdate): array
    {
        $rule = $isUpdate ? 'sometimes' : 'required';

        return $request->validate([
            'name' => "{$rule}|string|max:255",
            'slug' => 'nullable|string|max:255',
            'trigger_status' => 'nullable|string|max:50',
            'requires_approval' => 'nullable|boolean',
            'override_enabled' => 'nullable|boolean',
            'sla_hours' => 'nullable|integer|min:1|max:720',
            'is_active' => 'nullable|boolean',
            'stages' => 'nullable|array',
            'stages.*.code' => 'required_with:stages|string|max:100',
            'stages.*.label' => 'required_with:stages|string|max:255',
            'stages.*.sequence' => 'nullable|integer|min:1|max:100',
            'stages.*.assigned_role' => 'nullable|string|max:100',
            'stages.*.decision_type' => 'nullable|string|max:50',
            'stages.*.is_required' => 'nullable|boolean',
        ]);
    }

    private function syncStages(QualificationWorkflow $workflow, array $stages): void
    {
        $workflow->stages()->delete();

        foreach ($stages as $index => $stageData) {
            $workflow->stages()->create([
                'code' => $stageData['code'],
                'label' => $stageData['label'],
                'sequence' => $stageData['sequence'] ?? ($index + 1),
                'assigned_role' => $stageData['assigned_role'] ?? null,
                'decision_type' => $stageData['decision_type'] ?? 'review',
                'is_required' => $stageData['is_required'] ?? true,
            ]);
        }
    }
}
