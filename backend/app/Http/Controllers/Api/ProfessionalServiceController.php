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
use App\Services\ProfessionalServices\PsTaskBreakdownAiService;
use App\Services\ProfessionalServices\PsApprovalService;
use App\Services\ProfessionalServices\PsBlockerValidationService;
use App\Services\ProfessionalServices\PsVersioningService;
use App\Services\AuditService;
use App\Models\LeadActivity;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use App\Traits\CalculatesOrderTotals;

class ProfessionalServiceController extends Controller
{
    use CalculatesOrderTotals;

    private EstimationCalculationService $calculationService;
    private PsApprovalService $approvalService;
    private PsBlockerValidationService $blockerService;
    private PsVersioningService $versioningService;

    public function __construct(
        EstimationCalculationService $calculationService,
        PsApprovalService $approvalService,
        PsBlockerValidationService $blockerService,
        PsVersioningService $versioningService
    ) {
        $this->calculationService = $calculationService;
        $this->approvalService = $approvalService;
        $this->blockerService = $blockerService;
        $this->versioningService = $versioningService;
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

        if (in_array($estimation->status, ['pending_approval', 'approved', 'converted_to_quotation', 'archived', 'document_generated', 'sent_for_signature', 'signed'])) {
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

    public function submitApproval(Request $request, $id)
    {
        $estimation = PsEstimation::findOrFail($id);
        $comment = $request->input('comment');

        $this->approvalService->submitForApproval($estimation, $request->user()->id, $comment);

        return response()->json([
            'success' => true,
            'data' => $estimation->fresh(),
            'message' => 'Estimation submitted for approval',
        ]);
    }

    public function approveEstimation(Request $request, $id)
    {
        $estimation = PsEstimation::findOrFail($id);
        $comment = $request->input('comment');

        $this->approvalService->approve($estimation, $request->user()->id, $comment);

        return response()->json([
            'success' => true,
            'data' => $estimation->fresh(),
            'message' => 'Estimation approved',
        ]);
    }

    public function rejectEstimation(Request $request, $id)
    {
        $estimation = PsEstimation::findOrFail($id);
        
        $request->validate(['reason' => 'required|string']);
        $reason = $request->input('reason');

        $this->approvalService->reject($estimation, $request->user()->id, $reason);

        return response()->json([
            'success' => true,
            'data' => $estimation->fresh(),
            'message' => 'Estimation rejected',
        ]);
    }

    public function requestRevision(Request $request, $id)
    {
        $estimation = PsEstimation::findOrFail($id);
        
        $request->validate(['reason' => 'required|string']);
        $reason = $request->input('reason');

        $this->approvalService->requestRevision($estimation, $request->user()->id, $reason);

        return response()->json([
            'success' => true,
            'data' => $estimation->fresh(),
            'message' => 'Revision requested',
        ]);
    }

    public function createRevision(Request $request, $id)
    {
        $estimation = PsEstimation::findOrFail($id);
        
        $request->validate(['reason' => 'required|string']);
        $reason = $request->input('reason');

        $newEstimation = $this->versioningService->createRevision($estimation, $reason, $request->user()->id);

        return response()->json([
            'success' => true,
            'data' => $newEstimation,
            'message' => 'Revision created',
        ]);
    }

    public function blockers($id)
    {
        $estimation = PsEstimation::findOrFail($id);
        $blockers = $this->blockerService->getBlockers($estimation);

        return response()->json([
            'success' => true,
            'data' => $blockers,
            'message' => 'Blockers retrieved',
        ]);
    }

    public function versions($id)
    {
        $estimation = PsEstimation::findOrFail($id);
        
        $versions = $estimation->versions()->orderBy('version_number', 'desc')->get();
        $logs = $estimation->approvalLogs()->with('actor:id,name')->orderBy('created_at', 'desc')->get();
        $revisions = $estimation->revisionsAsOriginal()->with('revisedEstimation')->get();

        return response()->json([
            'success' => true,
            'data' => [
                'versions' => $versions,
                'logs' => $logs,
                'revisions' => $revisions,
            ],
            'message' => 'Version history retrieved',
        ]);
    }

    public function quotationPreview(Request $request, $id)
    {
        $estimation = PsEstimation::with(['lines', 'category', 'template'])->findOrFail($id);
        
        $lineDetailLevel = $request->input('line_detail_level', 'summary'); // summary, by_task, by_role
        $commercialRateMethod = $request->input('commercial_rate_method', 'estimation_fee');
        $taxCodeId = $request->input('tax_code_id');
        $whtCodeId = $request->input('withholding_tax_code_id');

        $taxCode = $taxCodeId ? \App\Models\TaxCode::find($taxCodeId) : null;
        $whtCode = $whtCodeId ? \App\Models\WithholdingTaxCode::find($whtCodeId) : null;

        $items = $this->generateQuotationLines($estimation, $lineDetailLevel, $commercialRateMethod, $taxCode, $whtCode);

        // Preview totals
        $totals = $this->calculateTotals($items);

        return response()->json([
            'success' => true,
            'data' => [
                'totals' => $totals,
            ]
        ]);
    }

    public function convertToQuotation(Request $request, $id)
    {
        $estimation = PsEstimation::with(['lines', 'category', 'template'])->findOrFail($id);
        
        $validated = $request->validate([
            'conversion_type' => 'required|in:new_quotation,existing_draft_quotation',
            'quotation_id' => 'required_if:conversion_type,existing_draft_quotation|exists:lead_quotations,id',
            'lead_id' => 'nullable|exists:leads,id',
            'line_detail_level' => 'required|in:summary,by_task,by_role',
            'commercial_rate_method' => 'required|in:estimation_fee,selected_rate,blended_role_rate,manual_override',
            'manual_unit_price' => 'nullable|numeric|min:0',
            'manual_total_fee' => 'nullable|numeric|min:0',
            'manual_override_reason' => 'required_if:commercial_rate_method,manual_override',
            'tax_code_id' => 'nullable|exists:tax_codes,id',
            'withholding_tax_code_id' => 'nullable|exists:withholding_tax_codes,id',
            'quotation_type' => 'required_if:conversion_type,new_quotation|string',
            'quotation_date' => 'required_if:conversion_type,new_quotation|date',
            'valid_until' => 'nullable|date',
            'payment_terms' => 'nullable|string',
            'billing_frequency' => 'nullable|string',
            'customer_notes' => 'nullable|string',
            'internal_notes' => 'nullable|string'
        ]);

        // Validation Checks
        if (!in_array($estimation->status, ['approved', 'signed'])) {
            throw ValidationException::withMessages(['estimation' => 'Only approved or signed estimations can be converted to quotations.']);
        }

        if ($estimation->converted_quotation_id) {
            throw ValidationException::withMessages(['estimation' => 'Estimation is already converted to a quotation.']);
        }

        if ($estimation->total_final_mandays <= 0) {
            throw ValidationException::withMessages(['estimation' => 'Estimation with 0 ManDays cannot be converted.']);
        }

        $leadId = $estimation->lead_id ?? $validated['lead_id'];
        if (!$leadId) {
            throw ValidationException::withMessages(['lead_id' => 'A Lead must be selected to convert this estimation.']);
        }

        $currency = $this->getCurrencyOrError();

        return DB::transaction(function () use ($estimation, $validated, $leadId, $currency, $request) {
            $taxCode = $validated['tax_code_id'] ? \App\Models\TaxCode::find($validated['tax_code_id']) : null;
            $whtCode = $validated['withholding_tax_code_id'] ? \App\Models\WithholdingTaxCode::find($validated['withholding_tax_code_id']) : null;

            $itemsData = $this->generateQuotationLines(
                $estimation, 
                $validated['line_detail_level'], 
                $validated['commercial_rate_method'], 
                $taxCode, 
                $whtCode,
                $validated['manual_unit_price'] ?? null
            );

            if ($validated['conversion_type'] === 'new_quotation') {
                $totals = $this->calculateTotals($itemsData);

                $quotation = LeadQuotation::create([
                    'lead_id' => $leadId,
                    'quotation_number' => 'QT-' . date('Ym') . '-' . sprintf('%04d', mt_rand(1, 9999)),
                    'quotation_type' => $validated['quotation_type'],
                    'quotation_status' => 'draft',
                    'quotation_date' => $validated['quotation_date'],
                    'valid_until' => $validated['valid_until'] ?? null,
                    'currency' => $currency->code,
                    'subtotal_amount' => $totals['subtotal'],
                    'discount_amount' => 0,
                    'tax_amount' => $totals['tax_amount'],
                    'total_withholding_tax' => $totals['total_withholding_tax'],
                    'grand_total_before_wht' => $totals['grand_total_before_wht'],
                    'total_amount' => $totals['total'],
                    'created_by' => $request->user()->id,
                    'payment_terms' => $validated['payment_terms'] ?? null,
                    'billing_frequency' => $validated['billing_frequency'] ?? null,
                    'customer_notes' => $validated['customer_notes'] ?? null,
                    'internal_notes' => $validated['internal_notes'] ?? null,
                    'source_type' => 'professional_service_estimation',
                    'source_reference_id' => $estimation->id,
                ]);

                foreach ($totals['items'] as $itemData) {
                    LeadQuotationItem::create(array_merge($itemData, [
                        'quotation_id' => $quotation->id
                    ]));
                }

                $quotationId = $quotation->id;
                $quotationNumber = $quotation->quotation_number;
                
                LeadActivity::create([
                    'lead_id' => $leadId,
                    'user_id' => $request->user()->id,
                    'type' => 'status',
                    'title' => 'Professional Services Estimation converted to Quotation',
                    'description' => "Estimation {$estimation->estimation_number} converted to Quotation {$quotationNumber} with total fee " . number_format($totals['total'], 2),
                    'related_entity_type' => LeadQuotation::class,
                    'related_entity_id' => $quotation->id,
                ]);

            } else {
                $quotation = LeadQuotation::findOrFail($validated['quotation_id']);
                
                if ($quotation->quotation_status !== 'draft') {
                    throw ValidationException::withMessages(['quotation' => 'Can only add to Draft quotations.']);
                }
                
                if ($quotation->currency !== $currency->code) {
                    throw ValidationException::withMessages(['currency' => "Currency mismatch. Quotation uses {$quotation->currency} but default is {$currency->code}."]);
                }

                $startSortOrder = $quotation->items()->max('sort_order') + 1;

                foreach ($itemsData as $idx => $itemData) {
                    $itemData['sort_order'] = $startSortOrder + $idx;
                    $quotation->items()->create($itemData);
                }

                // Recalculate quotation
                $allItemData = $quotation->items->map(function ($item) {
                    return $item->toArray();
                })->toArray();
                
                $totals = $this->calculateTotals($allItemData, $quotation->header_discount_type, $quotation->header_discount_value, $quotation->other_cost);

                $quotation->update([
                    'subtotal_amount' => $totals['subtotal'],
                    'discount_amount' => $totals['header_discount_amount'],
                    'tax_amount' => $totals['tax_amount'],
                    'total_withholding_tax' => $totals['total_withholding_tax'],
                    'grand_total_before_wht' => $totals['grand_total_before_wht'],
                    'total_amount' => $totals['total'],
                ]);

                $quotationId = $quotation->id;
                $quotationNumber = $quotation->quotation_number;

                LeadActivity::create([
                    'lead_id' => $leadId,
                    'user_id' => $request->user()->id,
                    'type' => 'status',
                    'title' => 'Professional Services Estimation added to Quotation',
                    'description' => "Estimation {$estimation->estimation_number} added to existing Draft Quotation {$quotationNumber}",
                    'related_entity_type' => LeadQuotation::class,
                    'related_entity_id' => $quotation->id,
                ]);
            }

            $oldEstimation = $estimation->toArray();
            $estimation->update([
                'status' => 'converted_to_quotation',
                'converted_quotation_id' => $quotationId,
                'converted_at' => now(),
                'converted_by' => $request->user()->id,
                'lead_id' => $leadId // Update lead id if it was missing
            ]);

            AuditService::logUpdated('professional_services', $estimation->id, $oldEstimation, $estimation->toArray());

            return response()->json([
                'success' => true,
                'data' => [
                    'quotation_id' => $quotationId,
                    'quotation_number' => $quotationNumber,
                    'estimation_id' => $estimation->id,
                    'conversion_status' => 'success',
                ],
                'message' => 'Estimation converted to quotation successfully',
            ]);
        });
    }

    private function generateQuotationLines(PsEstimation $estimation, $level, $rateMethod, $taxCode, $whtCode, $manualUnitPrice = null)
    {
        $lines = [];
        $categoryName = $estimation->category ? $estimation->category->name : 'Custom Service';
        $templateName = $estimation->template ? $estimation->template->name : '';

        // Shared item defaults
        $baseItem = [
            'quantity' => 0, // Will override
            'unit' => 'ManDay',
            'unit_price' => 0, // Will override
            'tax_code_id' => $taxCode ? $taxCode->id : null,
            'tax_code' => $taxCode ? $taxCode->code : null,
            'tax_rate' => $taxCode ? $taxCode->rate : 0,
            'withholding_tax_code_id' => $whtCode ? $whtCode->id : null,
            'withholding_tax_rate' => $whtCode ? $whtCode->rate : 0,
            'source_type' => 'professional_service_estimation',
            'source_reference_id' => $estimation->id,
            'professional_service_estimation_id' => $estimation->id,
        ];

        $calculatePrice = function ($qty) use ($estimation, $rateMethod, $manualUnitPrice) {
            if ($qty == 0) return 0;
            if ($rateMethod === 'estimation_fee') {
                return $estimation->total_estimated_fee / $estimation->total_final_mandays;
            }
            if ($rateMethod === 'manual_override') {
                return $manualUnitPrice ?? 0;
            }
            // For blended role rate and selected rate, it would require rate card lookup, but for simplicity here we fallback to estimation_fee
            return $estimation->total_estimated_fee / $estimation->total_final_mandays;
        };

        if ($level === 'summary') {
            $desc = "Professional Service - {$categoryName}\n";
            if ($templateName) $desc .= "Template: {$templateName}\n";
            $desc .= "Estimation: {$estimation->estimation_number}\n";
            if ($estimation->assumptions) $desc .= "Assumptions:\n{$estimation->assumptions}\n";

            $qty = (float) $estimation->total_final_mandays;
            $price = $calculatePrice($qty);

            $lines[] = array_merge($baseItem, [
                'item_name' => "Professional Service - {$categoryName}",
                'description' => $desc,
                'quantity' => $qty,
                'unit_price' => $price,
            ]);
        } elseif ($level === 'by_task') {
            // Group by top-level tasks
            $topTasks = $estimation->lines->whereNull('parent_task_id');
            foreach ($topTasks as $task) {
                // Get all descendants to sum up mandays
                $descendants = $estimation->lines->filter(function($line) use ($task) {
                    return str_starts_with($line->sort_order, $task->sort_order . '.');
                });
                
                $qty = (float) $task->final_mandays + $descendants->sum('final_mandays');
                
                if ($qty > 0) {
                    $price = $calculatePrice($qty);
                    $lines[] = array_merge($baseItem, [
                        'item_name' => "{$task->task_name}",
                        'description' => $task->description ?? "Task Group from {$estimation->estimation_number}",
                        'quantity' => $qty,
                        'unit_price' => $price,
                        'professional_service_estimation_line_id' => $task->id,
                    ]);
                }
            }
        } elseif ($level === 'by_role') {
            // Group by roles
            $groupedByRole = $estimation->lines->groupBy('role_id');
            foreach ($groupedByRole as $roleId => $taskLines) {
                if (!$roleId) continue;
                $role = \App\Models\PsRole::find($roleId);
                $qty = $taskLines->sum('final_mandays');
                
                if ($qty > 0) {
                    $price = $calculatePrice($qty);
                    $lines[] = array_merge($baseItem, [
                        'item_name' => $role ? "{$role->name} Services" : "Consulting Services",
                        'description' => "Role-based grouping from {$estimation->estimation_number}",
                        'quantity' => $qty,
                        'unit_price' => $price,
                    ]);
                }
            }
        }

        return $lines;
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

    /* ── Task Breakdown CRUD ── */

    public function getTasks($id)
    {
        $estimation = PsEstimation::findOrFail($id);
        
        $tasks = $estimation->lines()
            ->whereNull('parent_task_id')
            ->with(['subtasks', 'role:id,name', 'complexityLevel:id,name,multiplier', 'subtasks.role:id,name', 'subtasks.complexityLevel:id,name,multiplier'])
            ->orderBy('sort_order')
            ->get();
            
        return response()->json([
            'success' => true,
            'data' => $tasks,
            'meta' => [],
            'message' => 'Tasks retrieved successfully.',
        ]);
    }

    public function storeTask(Request $request, $id)
    {
        $estimation = PsEstimation::findOrFail($id);
        $data = $request->validate([
            'parent_task_id' => 'nullable|exists:ps_estimation_lines,id',
            'task_type' => 'nullable|string|in:task,subtask',
            'task_name' => 'required|string',
            'subtask_name' => 'nullable|string',
            'description' => 'nullable|string',
            'deliverable' => 'nullable|string',
            'acceptance_criteria' => 'nullable|array',
            'role_id' => 'nullable|exists:ps_roles,id',
            'complexity_level_id' => 'nullable|exists:ps_complexity_levels,id',
            'base_mandays' => 'nullable|numeric|min:0',
            'manual_adjustment' => 'nullable|numeric',
            'manual_adjustment_reason' => 'nullable|string',
            'dependency_notes' => 'nullable|array',
            'risk_notes' => 'nullable|array',
            'sort_order' => 'nullable|integer',
        ]);

        $data['estimation_id'] = $estimation->id;
        $data['sort_order'] = $data['sort_order'] ?? ($estimation->lines()->max('sort_order') + 1);

        $line = PsEstimationLine::create($data);

        $this->calculationService->recalculate($estimation);

        return response()->json([
            'success' => true,
            'data' => $line->fresh(['role', 'complexityLevel']),
            'meta' => [],
            'message' => 'Task created successfully.',
        ]);
    }

    public function updateTask(Request $request, $id, $taskId)
    {
        $estimation = PsEstimation::findOrFail($id);
        $line = $estimation->lines()->findOrFail($taskId);
        
        $data = $request->validate([
            'task_name' => 'sometimes|required|string',
            'subtask_name' => 'nullable|string',
            'description' => 'nullable|string',
            'deliverable' => 'nullable|string',
            'acceptance_criteria' => 'nullable|array',
            'role_id' => 'nullable|exists:ps_roles,id',
            'complexity_level_id' => 'nullable|exists:ps_complexity_levels,id',
            'base_mandays' => 'nullable|numeric|min:0',
            'manual_adjustment' => 'nullable|numeric',
            'manual_adjustment_reason' => 'nullable|string',
            'dependency_notes' => 'nullable|array',
            'risk_notes' => 'nullable|array',
        ]);

        $line->update($data);
        
        $this->calculationService->recalculate($estimation);

        return response()->json([
            'success' => true,
            'data' => $line->fresh(['role', 'complexityLevel']),
            'meta' => [],
            'message' => 'Task updated successfully.',
        ]);
    }

    public function deleteTask($id, $taskId)
    {
        $estimation = PsEstimation::findOrFail($id);
        $line = $estimation->lines()->findOrFail($taskId);
        
        // Also delete subtasks if it's a parent
        $estimation->lines()->where('parent_task_id', $line->id)->delete();
        $line->delete();
        
        $this->calculationService->recalculate($estimation);

        return response()->json([
            'success' => true,
            'data' => null,
            'meta' => [],
            'message' => 'Task deleted successfully.',
        ]);
    }

    public function reorderTasks(Request $request, $id)
    {
        $estimation = PsEstimation::findOrFail($id);
        $data = $request->validate([
            'tasks' => 'required|array',
            'tasks.*.id' => 'required|exists:ps_estimation_lines,id',
            'tasks.*.sort_order' => 'required|integer',
            'tasks.*.parent_task_id' => 'nullable|exists:ps_estimation_lines,id',
        ]);

        DB::transaction(function () use ($data, $estimation) {
            foreach ($data['tasks'] as $taskData) {
                $estimation->lines()->where('id', $taskData['id'])->update([
                    'sort_order' => $taskData['sort_order'],
                    'parent_task_id' => $taskData['parent_task_id'] ?? null,
                ]);
            }
            $this->calculationService->recalculate($estimation);
        });

        return response()->json([
            'success' => true,
            'data' => null,
            'meta' => [],
            'message' => 'Tasks reordered successfully.',
        ]);
    }

    public function recalculateTasks(Request $request, $id)
    {
        $estimation = PsEstimation::findOrFail($id);
        $this->calculationService->recalculate($estimation);
        
        return response()->json([
            'success' => true,
            'data' => $estimation->fresh(['lines.role', 'lines.complexityLevel']),
            'meta' => [],
            'message' => 'Tasks recalculated.',
        ]);
    }

    public function generateTaskBreakdown(Request $request, $id, PsTaskBreakdownAiService $aiService)
    {
        $estimation = PsEstimation::findOrFail($id);
        
        // Ensure user has permission (handled by middleware but we log activity)
        try {
            $breakdown = $aiService->generateBreakdown($estimation);
            
            // Log activity
            if ($estimation->lead_id) {
                LeadActivity::create([
                    'lead_id' => $estimation->lead_id,
                    'user_id' => auth()->id(),
                    'activity_type' => 'ai_analysis',
                    'title' => 'AI Task Breakdown Generated',
                    'description' => "Generated AI Task Breakdown for estimation {$estimation->estimation_number}",
                ]);
            }

            return response()->json([
                'success' => true,
                'data' => $breakdown,
                'meta' => [],
                'message' => 'Task breakdown generated successfully.',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'data' => null,
                'meta' => [],
                'message' => 'Failed to generate breakdown: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function applyTaskBreakdown(Request $request, $id)
    {
        $estimation = PsEstimation::findOrFail($id);
        $data = $request->validate([
            'task_breakdown' => 'required|array',
        ]);

        DB::transaction(function () use ($data, $estimation) {
            // Depending on requirements, maybe delete existing lines or append. We will append.
            $sortOrder = $estimation->lines()->max('sort_order') + 1;

            foreach ($data['task_breakdown'] as $taskItem) {
                $task = PsEstimationLine::create([
                    'estimation_id' => $estimation->id,
                    'task_type' => 'task',
                    'task_name' => $taskItem['task_name'] ?? 'Untitled Task',
                    'description' => $taskItem['description'] ?? null,
                    'deliverable' => $taskItem['deliverable'] ?? null,
                    'acceptance_criteria' => $taskItem['acceptance_criteria'] ?? null,
                    'role_id' => $taskItem['suggested_role']['role_id'] ?? null,
                    'complexity_level_id' => $taskItem['complexity']['complexity_id'] ?? null,
                    'base_mandays' => $taskItem['base_mandays'] ?? 0,
                    'dependency_notes' => $taskItem['dependency_notes'] ?? null,
                    'risk_notes' => $taskItem['risk_notes'] ?? null,
                    'is_ai_generated' => true,
                    'ai_confidence' => $taskItem['ai_confidence'] ?? 'medium',
                    'source_type' => 'ai_scope_analysis',
                    'sort_order' => $sortOrder++,
                ]);

                if (isset($taskItem['subtasks']) && is_array($taskItem['subtasks'])) {
                    $subSort = 1;
                    foreach ($taskItem['subtasks'] as $subtaskItem) {
                        PsEstimationLine::create([
                            'estimation_id' => $estimation->id,
                            'parent_task_id' => $task->id,
                            'task_type' => 'subtask',
                            'task_name' => $task->task_name,
                            'subtask_name' => $subtaskItem['subtask_name'] ?? 'Untitled Subtask',
                            'description' => $subtaskItem['description'] ?? null,
                            'deliverable' => $subtaskItem['deliverable'] ?? null,
                            'acceptance_criteria' => $subtaskItem['acceptance_criteria'] ?? null,
                            'role_id' => $subtaskItem['suggested_role']['role_id'] ?? null,
                            'base_mandays' => $subtaskItem['base_mandays'] ?? 0,
                            'dependency_notes' => $subtaskItem['dependency_notes'] ?? null,
                            'risk_notes' => $subtaskItem['risk_notes'] ?? null,
                            'is_ai_generated' => true,
                            'ai_confidence' => $subtaskItem['ai_confidence'] ?? 'medium',
                            'source_type' => 'ai_scope_analysis',
                            'sort_order' => $subSort++,
                        ]);
                    }
                }
            }
            
            $this->calculationService->recalculate($estimation);
        });

        return response()->json([
            'success' => true,
            'data' => $estimation->fresh(['lines.role', 'lines.complexityLevel']),
            'meta' => [],
            'message' => 'Task breakdown applied successfully.',
        ]);
    }
}
