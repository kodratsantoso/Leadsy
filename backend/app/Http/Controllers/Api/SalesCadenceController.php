<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Models\LeadCadenceEnrollment;
use App\Models\SalesCadence;
use App\Models\SalesCadenceStep;
use App\Services\Sales\SalesCadenceExecutionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SalesCadenceController extends Controller
{
    public function __construct(
        private SalesCadenceExecutionService $executionService
    ) {}

    /**
     * List all sales cadences.
     */
    public function index(Request $request): JsonResponse
    {
        $query = SalesCadence::with(['steps', 'creator'])
            ->withCount('enrollments')
            ->orderBy('id', 'desc');

        if ($request->boolean('active_only', true)) {
            $query->where('is_active', true);
        }

        $cadences = $query->get();

        return response()->json([
            'success' => true,
            'data' => $cadences,
        ]);
    }

    /**
     * Store new cadence with its sequential steps.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'target_audience' => 'nullable|string|max:100',
            'trigger_type' => 'nullable|string|in:manual,lead_created,stage_change',
            'steps' => 'required|array|min:1',
            'steps.*.channel' => 'required|string|in:whatsapp,email,call_reminder,internal_task',
            'steps.*.delay_days' => 'required|integer|min:0',
            'steps.*.template_body' => 'required|string',
            'steps.*.template_subject' => 'nullable|string',
            'steps.*.is_automated' => 'nullable|boolean',
        ]);

        $cadence = DB::transaction(function () use ($validated) {
            $cadence = SalesCadence::create([
                'name' => $validated['name'],
                'description' => $validated['description'] ?? null,
                'target_audience' => $validated['target_audience'] ?? 'General B2B',
                'trigger_type' => $validated['trigger_type'] ?? 'manual',
                'created_by' => auth()->id(),
                'is_active' => true,
            ]);

            foreach ($validated['steps'] as $idx => $stepData) {
                SalesCadenceStep::create([
                    'sales_cadence_id' => $cadence->id,
                    'step_number' => $idx + 1,
                    'channel' => $stepData['channel'],
                    'delay_days' => $stepData['delay_days'],
                    'template_subject' => $stepData['template_subject'] ?? null,
                    'template_body' => $stepData['template_body'],
                    'ai_personalization' => true,
                    'is_automated' => $stepData['is_automated'] ?? false,
                ]);
            }

            return $cadence->load('steps');
        });

        return response()->json([
            'success' => true,
            'message' => "Sales Cadence '{$cadence->name}' created successfully with " . count($cadence->steps) . " steps.",
            'data' => $cadence,
        ], 201);
    }

    /**
     * Show single cadence details.
     */
    public function show(int $id): JsonResponse
    {
        $cadence = SalesCadence::with(['steps', 'creator', 'enrollments.lead'])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $cadence,
        ]);
    }

    /**
     * Update an existing cadence.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $cadence = SalesCadence::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'target_audience' => 'nullable|string|max:100',
            'trigger_type' => 'nullable|string|in:manual,lead_created,stage_change',
            'is_active' => 'sometimes|boolean',
            'steps' => 'nullable|array|min:1',
            'steps.*.channel' => 'required_with:steps|string|in:whatsapp,email,call_reminder,internal_task',
            'steps.*.delay_days' => 'required_with:steps|integer|min:0',
            'steps.*.template_body' => 'required_with:steps|string',
            'steps.*.template_subject' => 'nullable|string',
            'steps.*.is_automated' => 'nullable|boolean',
        ]);

        DB::transaction(function () use ($cadence, $validated) {
            $cadence->update(array_filter([
                'name' => $validated['name'] ?? $cadence->name,
                'description' => array_key_exists('description', $validated) ? $validated['description'] : $cadence->description,
                'target_audience' => $validated['target_audience'] ?? $cadence->target_audience,
                'trigger_type' => $validated['trigger_type'] ?? $cadence->trigger_type,
                'is_active' => array_key_exists('is_active', $validated) ? $validated['is_active'] : $cadence->is_active,
            ], fn($v) => !is_null($v)));

            if (isset($validated['steps'])) {
                $cadence->steps()->delete();
                foreach ($validated['steps'] as $idx => $stepData) {
                    SalesCadenceStep::create([
                        'sales_cadence_id' => $cadence->id,
                        'step_number' => $idx + 1,
                        'channel' => $stepData['channel'],
                        'delay_days' => $stepData['delay_days'],
                        'template_subject' => $stepData['template_subject'] ?? null,
                        'template_body' => $stepData['template_body'],
                        'ai_personalization' => true,
                        'is_automated' => $stepData['is_automated'] ?? false,
                    ]);
                }
            }
        });

        return response()->json([
            'success' => true,
            'message' => "Sales Cadence '{$cadence->name}' berhasil diperbarui.",
            'data' => $cadence->fresh(['steps', 'creator']),
        ]);
    }

    /**
     * Delete a cadence.
     */
    public function destroy(int $id): JsonResponse
    {
        $cadence = SalesCadence::findOrFail($id);
        $cadence->steps()->delete();
        $cadence->delete();

        return response()->json([
            'success' => true,
            'message' => 'Sales Cadence berhasil dihapus.',
        ]);
    }

    /**
     * Enroll lead into cadence.
     */
    public function enrollLead(Request $request, Lead $lead): JsonResponse
    {
        $validated = $request->validate([
            'cadence_id' => 'required_without:sales_cadence_id|nullable|exists:sales_cadences,id',
            'sales_cadence_id' => 'required_without:cadence_id|nullable|exists:sales_cadences,id',
        ]);

        $cadenceId = $validated['cadence_id'] ?? $validated['sales_cadence_id'];
        $enrollment = $this->executionService->enrollLead($lead, (int) $cadenceId, auth()->id());

        return response()->json([
            'success' => true,
            'message' => "Lead '{$lead->company_name}' successfully enrolled in cadence.",
            'data' => $enrollment->load(['cadence', 'currentStep']),
        ]);
    }

    /**
     * Get active enrollments for a lead.
     */
    public function leadEnrollments(Lead $lead): JsonResponse
    {
        $enrollments = LeadCadenceEnrollment::with(['cadence.steps', 'currentStep', 'stepLogs'])
            ->where('lead_id', $lead->id)
            ->latest('id')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $enrollments,
        ]);
    }
}

