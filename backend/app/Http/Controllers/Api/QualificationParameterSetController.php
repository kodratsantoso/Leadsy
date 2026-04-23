<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\QualificationParameterSet;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class QualificationParameterSetController extends Controller
{
    public function index(): JsonResponse
    {
        $sets = QualificationParameterSet::with(['parameters.options', 'creator', 'updater'])
            ->orderByDesc('id')
            ->get();

        return response()->json(['data' => $sets]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validatePayload($request, isUpdate: false);

        $set = DB::transaction(function () use ($data, $request) {
            $set = QualificationParameterSet::create([
                'tenant_id' => $request->user()?->tenant_id,
                'name' => $data['name'],
                'slug' => $data['slug'] ?? Str::slug($data['name']),
                'version' => $data['version'],
                'status' => $data['status'] ?? 'draft',
                'description' => $data['description'] ?? null,
                'created_by' => $request->user()?->id,
                'updated_by' => $request->user()?->id,
            ]);

            $this->syncParameters($set, $data['parameters'] ?? []);

            return $set->load(['parameters.options', 'creator', 'updater']);
        });

        AuditService::logCreated('qualification_parameter_sets', $set);

        return response()->json(['data' => $set], 201);
    }

    public function show(QualificationParameterSet $qualificationParameterSet): JsonResponse
    {
        return response()->json([
            'data' => $qualificationParameterSet->load(['parameters.options', 'creator', 'updater']),
        ]);
    }

    public function update(Request $request, QualificationParameterSet $qualificationParameterSet): JsonResponse
    {
        $data = $this->validatePayload($request, isUpdate: true);
        $original = $qualificationParameterSet->toArray();

        DB::transaction(function () use ($qualificationParameterSet, $data, $request) {
            $qualificationParameterSet->update([
                'name' => $data['name'] ?? $qualificationParameterSet->name,
                'slug' => $data['slug'] ?? $qualificationParameterSet->slug,
                'version' => $data['version'] ?? $qualificationParameterSet->version,
                'status' => $data['status'] ?? $qualificationParameterSet->status,
                'description' => $data['description'] ?? $qualificationParameterSet->description,
                'updated_by' => $request->user()?->id,
            ]);

            if (array_key_exists('parameters', $data)) {
                $this->syncParameters($qualificationParameterSet, $data['parameters']);
            }
        });

        $qualificationParameterSet->refresh()->load(['parameters.options', 'creator', 'updater']);
        AuditService::logUpdated('qualification_parameter_sets', $qualificationParameterSet, $original);

        return response()->json(['data' => $qualificationParameterSet]);
    }

    public function destroy(QualificationParameterSet $qualificationParameterSet): JsonResponse
    {
        $qualificationParameterSet->delete();
        AuditService::logDeleted('qualification_parameter_sets', $qualificationParameterSet);

        return response()->json(['message' => 'Qualification parameter set deleted']);
    }

    public function activate(int $qualificationParameterSet): JsonResponse
    {
        $set = QualificationParameterSet::findOrFail($qualificationParameterSet);

        DB::transaction(function () use ($qualificationParameterSet) {
            QualificationParameterSet::where('status', 'active')->update(['status' => 'archived']);
            $set = QualificationParameterSet::findOrFail($qualificationParameterSet);
            $set->update(['status' => 'active']);
        });
        $set->refresh();

        return response()->json([
            'data' => $set->load(['parameters.options']),
        ]);
    }

    private function validatePayload(Request $request, bool $isUpdate): array
    {
        $rule = $isUpdate ? 'sometimes' : 'required';

        return $request->validate([
            'name' => "{$rule}|string|max:255",
            'slug' => 'nullable|string|max:255',
            'version' => "{$rule}|string|max:100",
            'status' => 'nullable|in:draft,active,archived',
            'description' => 'nullable|string',
            'parameters' => 'nullable|array',
            'parameters.*.dimension' => 'required_with:parameters|string|max:100',
            'parameters.*.parameter_key' => 'required_with:parameters|string|max:100',
            'parameters.*.label' => 'required_with:parameters|string|max:255',
            'parameters.*.input_type' => 'required_with:parameters|in:enum,boolean,integer,text',
            'parameters.*.max_points' => 'required_with:parameters|integer|min:0|max:100',
            'parameters.*.sort_order' => 'nullable|integer|min:1|max:100',
            'parameters.*.is_required' => 'nullable|boolean',
            'parameters.*.hard_stop_operator' => 'nullable|in:equals',
            'parameters.*.hard_stop_value' => 'nullable|array',
            'parameters.*.options' => 'nullable|array',
            'parameters.*.options.*.option_value' => 'required_with:parameters.*.options|string|max:100',
            'parameters.*.options.*.label' => 'required_with:parameters.*.options|string|max:255',
            'parameters.*.options.*.score' => 'required_with:parameters.*.options|integer|min:-100|max:100',
            'parameters.*.options.*.sort_order' => 'nullable|integer|min:1|max:100',
            'parameters.*.options.*.is_active' => 'nullable|boolean',
        ]);
    }

    private function syncParameters(QualificationParameterSet $set, array $parameters): void
    {
        $set->parameters()->delete();

        foreach ($parameters as $index => $parameterData) {
            $parameter = $set->parameters()->create([
                'dimension' => $parameterData['dimension'],
                'parameter_key' => $parameterData['parameter_key'],
                'label' => $parameterData['label'],
                'input_type' => $parameterData['input_type'],
                'max_points' => $parameterData['max_points'],
                'sort_order' => $parameterData['sort_order'] ?? ($index + 1),
                'is_required' => $parameterData['is_required'] ?? false,
                'hard_stop_operator' => $parameterData['hard_stop_operator'] ?? null,
                'hard_stop_value' => $parameterData['hard_stop_value'] ?? null,
            ]);

            foreach (($parameterData['options'] ?? []) as $optionIndex => $optionData) {
                $parameter->options()->create([
                    'option_value' => $optionData['option_value'],
                    'label' => $optionData['label'],
                    'score' => $optionData['score'],
                    'sort_order' => $optionData['sort_order'] ?? ($optionIndex + 1),
                    'is_active' => $optionData['is_active'] ?? true,
                ]);
            }
        }
    }
}
