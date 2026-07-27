<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PsEstimation;
use App\Models\PsEstimationLine;
use App\Models\PsEstimationTemplate;
use App\Models\PsServiceCategory;
use App\Models\PsComplexityLevel;
use App\Models\PsRole;
use App\Models\PsRateCard;
use App\Models\LeadQuotation;
use App\Models\LeadQuotationItem;
use App\Services\ProfessionalServices\EstimationCalculationService;
use App\Services\AuditService;
use App\Models\LeadActivity;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProfessionalServiceController extends Controller
{
    private EstimationCalculationService $calculationService;

    public function __construct(EstimationCalculationService $calculationService)
    {
        $this->calculationService = $calculationService;
    }

    /* ── Config & Master Data ── */

    public function config(Request $request)
    {
        $categories = PsServiceCategory::where('is_active', true)->get();
        $levels = PsComplexityLevel::where('is_active', true)->get();
        $roles = PsRole::where('is_active', true)->with('rateCards')->get();
        
        return response()->json([
            'success' => true,
            'data' => [
                'categories' => $categories,
                'complexity_levels' => $levels,
                'roles' => $roles,
            ],
            'meta' => [],
            'message' => 'Config loaded successfully',
        ]);
    }

    /* ── Estimations CRUD ── */

    public function indexEstimations(Request $request)
    {
        $query = PsEstimation::with(['lead:id,company_name', 'category:id,name', 'template:id,name', 'complexityLevel:id,name', 'creator:id,name'])
            ->orderBy('id', 'desc');

        if ($request->has('lead_id')) {
            $query->where('lead_id', $request->input('lead_id'));
        }

        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }

        $estimations = $query->paginate($request->input('per_page', 15));

        return response()->json([
            'success' => true,
            'data' => $estimations->items(),
            'meta' => [
                'current_page' => $estimations->currentPage(),
                'last_page' => $estimations->lastPage(),
                'total' => $estimations->total(),
            ],
            'message' => 'Estimations retrieved',
        ]);
    }

    public function showEstimation($id)
    {
        $estimation = PsEstimation::with([
            'lead:id,company_name',
            'category:id,name',
            'template:id,name',
            'complexityLevel:id,name',
            'creator:id,name',
            'lines.role:id,name',
            'lines.templateComponent:id,task_name'
        ])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $estimation,
            'meta' => [],
            'message' => 'Estimation retrieved',
        ]);
    }

    public function storeEstimation(Request $request)
    {
        $validated = $request->validate([
            'lead_id' => 'nullable|exists:leads,id',
            'service_category_id' => 'required|exists:ps_service_categories,id',
            'template_id' => 'nullable|exists:ps_estimation_templates,id',
            'complexity_level_id' => 'nullable|exists:ps_complexity_levels,id',
            'title' => 'required|string|max:255',
            'complexity_multiplier' => 'numeric',
            'buffer_percentage' => 'numeric',
            'currency_code' => 'string',
            'assumptions' => 'nullable|string',
            'out_of_scope' => 'nullable|string',
            'dependencies' => 'nullable|string',
            'risks' => 'nullable|string',
            'internal_notes' => 'nullable|string',
            'lines' => 'array',
            'lines.*.role_id' => 'required|exists:ps_roles,id',
            'lines.*.template_component_id' => 'nullable|exists:ps_template_components,id',
            'lines.*.task_name' => 'required|string|max:255',
            'lines.*.base_mandays' => 'numeric',
            'lines.*.manual_adjustment' => 'numeric',
            'lines.*.sort_order' => 'integer',
        ]);

        return DB::transaction(function () use ($validated, $request) {
            $estimation = new PsEstimation();
            $estimation->estimation_number = $this->calculationService->generateEstimationNumber();
            $estimation->fill($validated);
            $estimation->created_by = $request->user()->id;
            
            // Set complexity multiplier automatically if level is provided and multiplier isn't
            if (isset($validated['complexity_level_id']) && !isset($validated['complexity_multiplier'])) {
                $level = PsComplexityLevel::find($validated['complexity_level_id']);
                if ($level) {
                    $estimation->complexity_multiplier = $level->multiplier;
                }
            }
            
            $estimation->save();

            if (!empty($validated['lines'])) {
                foreach ($validated['lines'] as $lineData) {
                    $line = new PsEstimationLine();
                    $line->estimation_id = $estimation->id;
                    $line->fill($lineData);
                    $line->save();
                }
            }

            $this->calculationService->recalculate($estimation);

            AuditService::logCreated('professional_services', $estimation->id, $estimation->toArray());

            if ($estimation->lead_id) {
                LeadActivity::create([
                    'lead_id' => $estimation->lead_id,
                    'user_id' => $request->user()->id,
                    'type' => 'document',
                    'title' => 'Created PS Estimation',
                    'description' => "Created estimation {$estimation->estimation_number}: {$estimation->title}",
                    'related_entity_type' => PsEstimation::class,
                    'related_entity_id' => $estimation->id,
                ]);
            }

            return response()->json([
                'success' => true,
                'data' => $estimation->load('lines.role'),
                'meta' => [],
                'message' => 'Estimation created successfully',
            ], 201);
        });
    }

    public function updateEstimation(Request $request, $id)
    {
        $estimation = PsEstimation::findOrFail($id);

        if (in_array($estimation->status, ['approved', 'converted_to_quotation', 'archived'])) {
            return response()->json([
                'success' => false,
                'data' => null,
                'meta' => [],
                'error' => [
                    'code' => 'INVALID_STATE',
                    'message' => 'Cannot update estimation in current status',
                ],
                'message' => 'Cannot update estimation in current status',
            ], 422);
        }

        $validated = $request->validate([
            'lead_id' => 'nullable|exists:leads,id',
            'service_category_id' => 'exists:ps_service_categories,id',
            'template_id' => 'nullable|exists:ps_estimation_templates,id',
            'complexity_level_id' => 'nullable|exists:ps_complexity_levels,id',
            'title' => 'string|max:255',
            'complexity_multiplier' => 'numeric',
            'buffer_percentage' => 'numeric',
            'currency_code' => 'string',
            'assumptions' => 'nullable|string',
            'out_of_scope' => 'nullable|string',
            'dependencies' => 'nullable|string',
            'risks' => 'nullable|string',
            'internal_notes' => 'nullable|string',
            'lines' => 'array',
        ]);

        return DB::transaction(function () use ($validated, $estimation, $request) {
            $oldData = $estimation->toArray();
            
            $estimation->fill($validated);
            
            if (isset($validated['complexity_level_id']) && !isset($validated['complexity_multiplier'])) {
                $level = PsComplexityLevel::find($validated['complexity_level_id']);
                if ($level) {
                    $estimation->complexity_multiplier = $level->multiplier;
                }
            }

            $estimation->save();

            if (isset($validated['lines'])) {
                // Delete existing lines
                PsEstimationLine::where('estimation_id', $estimation->id)->delete();
                
                // Add new lines
                foreach ($validated['lines'] as $lineData) {
                    $line = new PsEstimationLine();
                    $line->estimation_id = $estimation->id;
                    $line->fill($lineData);
                    $line->save();
                }
            }

            $this->calculationService->recalculate($estimation);

            AuditService::logUpdated('professional_services', $estimation->id, $oldData, $estimation->toArray());

            return response()->json([
                'success' => true,
                'data' => $estimation->load('lines.role'),
                'meta' => [],
                'message' => 'Estimation updated successfully',
            ]);
        });
    }

    /* ── Workflow Actions ── */

    public function duplicateEstimation(Request $request, $id)
    {
        $original = PsEstimation::findOrFail($id);
        
        $newEstimation = DB::transaction(function () use ($original, $request) {
            $clone = $this->calculationService->duplicateEstimation($original, $request->user()->id);
            AuditService::logCreated('professional_services', $clone->id, $clone->toArray());
            
            if ($clone->lead_id) {
                LeadActivity::create([
                    'lead_id' => $clone->lead_id,
                    'user_id' => $request->user()->id,
                    'type' => 'document',
                    'title' => 'Duplicated PS Estimation',
                    'description' => "Created estimation {$clone->estimation_number} from {$original->estimation_number}",
                    'related_entity_type' => PsEstimation::class,
                    'related_entity_id' => $clone->id,
                ]);
            }
            
            return $clone;
        });

        return response()->json([
            'success' => true,
            'data' => $newEstimation,
            'meta' => [],
            'message' => 'Estimation duplicated',
        ]);
    }

    public function reviewEstimation(Request $request, $id)
    {
        $estimation = PsEstimation::findOrFail($id);
        $oldData = $estimation->toArray();
        
        $estimation->status = 'pm_reviewed';
        $estimation->reviewed_by = $request->user()->id;
        $estimation->reviewed_at = now();
        $estimation->save();

        AuditService::logUpdated('professional_services', $estimation->id, $oldData, $estimation->toArray());

        return response()->json([
            'success' => true,
            'data' => $estimation,
            'meta' => [],
            'message' => 'Estimation marked as PM Reviewed',
        ]);
    }

    public function approveEstimation(Request $request, $id)
    {
        $estimation = PsEstimation::findOrFail($id);
        $oldData = $estimation->toArray();
        
        $estimation->status = 'approved';
        $estimation->approved_by = $request->user()->id;
        $estimation->approved_at = now();
        $estimation->save();

        AuditService::logUpdated('professional_services', $estimation->id, $oldData, $estimation->toArray());
        
        if ($estimation->lead_id) {
            LeadActivity::create([
                'lead_id' => $estimation->lead_id,
                'user_id' => $request->user()->id,
                'type' => 'status',
                'title' => 'Approved PS Estimation',
                'description' => "Estimation {$estimation->estimation_number} was approved",
                'related_entity_type' => PsEstimation::class,
                'related_entity_id' => $estimation->id,
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => $estimation,
            'meta' => [],
            'message' => 'Estimation approved',
        ]);
    }

    public function convertToQuotationLine(Request $request, $id)
    {
        $estimation = PsEstimation::findOrFail($id);
        
        if ($estimation->status !== 'approved') {
            return response()->json([
                'success' => false,
                'data' => null,
                'meta' => [],
                'error' => [
                    'code' => 'INVALID_STATE',
                    'message' => 'Only approved estimations can be converted',
                ],
                'message' => 'Only approved estimations can be converted',
            ], 422);
        }
        
        if (!$estimation->lead_id) {
             return response()->json([
                'success' => false,
                'data' => null,
                'meta' => [],
                'error' => [
                    'code' => 'NO_LEAD',
                    'message' => 'Estimation must be linked to a lead to generate a quotation line',
                ],
                'message' => 'Estimation must be linked to a lead',
            ], 422);
        }

        // Check if there is an active draft quotation for this lead
        $draftQuotation = LeadQuotation::where('lead_id', $estimation->lead_id)
            ->where('status', 'draft')
            ->orderBy('id', 'desc')
            ->first();

        return DB::transaction(function () use ($estimation, $draftQuotation) {
            if ($draftQuotation) {
                // Add to existing draft
                $sortOrder = LeadQuotationItem::where('quotation_id', $draftQuotation->id)->max('sort_order') + 1;
                
                $item = new LeadQuotationItem();
                $item->quotation_id = $draftQuotation->id;
                $item->product_id = null; // Custom service item
                $item->description = "Professional Services: {$estimation->title} ({$estimation->estimation_number})";
                $item->quantity = 1;
                $item->unit = 'Lot';
                $item->unit_price = $estimation->total_estimated_fee;
                $item->discount_type = 'amount';
                $item->discount_value = 0;
                $item->tax_code = 'VAT'; // Default
                $item->sort_order = $sortOrder;
                $item->save();
                
                // Recalculate quotation
                app(\App\Http\Controllers\Api\LeadOrderToCashController::class)->recalculateQuotationTotals($draftQuotation);
                
                $message = 'Line item added to existing draft quotation';
            } else {
                // Return data for the frontend to create a new quotation
                $message = 'Quotation line payload generated for new quotation';
            }

            $oldData = $estimation->toArray();
            $estimation->status = 'converted_to_quotation';
            $estimation->save();
            
            AuditService::logUpdated('professional_services', $estimation->id, $oldData, $estimation->toArray());
            
            return response()->json([
                'success' => true,
                'data' => [
                    'added_to_existing' => !!$draftQuotation,
                    'quotation_id' => $draftQuotation ? $draftQuotation->id : null,
                    'suggested_item' => [
                        'description' => "Professional Services: {$estimation->title} ({$estimation->estimation_number})",
                        'quantity' => 1,
                        'unit' => 'Lot',
                        'unit_price' => $estimation->total_estimated_fee,
                    ]
                ],
                'meta' => [],
                'message' => $message,
            ]);
        });
    }

    /* ── Templates CRUD ── */

    public function indexTemplates(Request $request)
    {
        $templates = PsEstimationTemplate::with('serviceCategory:id,name')->get();
        
        return response()->json([
            'success' => true,
            'data' => $templates,
            'meta' => [],
            'message' => 'Templates retrieved',
        ]);
    }
    
    public function showTemplate($id)
    {
        $template = PsEstimationTemplate::with(['serviceCategory:id,name', 'components.role:id,name,description'])->findOrFail($id);
        
        return response()->json([
            'success' => true,
            'data' => $template,
            'meta' => [],
            'message' => 'Template retrieved',
        ]);
    }
}
