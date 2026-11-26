<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\IncentivePolicy;
use App\Models\IncentivePool;
use App\Models\IncentiveContributor;
use App\Models\Lead;
use App\Models\LeadSalesOrder;
use App\Models\CommercialInvoice;
use App\Models\User;
use App\Services\Incentives\IncentiveCalculationService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

class IncentivePoolController extends Controller
{
    protected IncentiveCalculationService $calculationService;

    public function __construct(IncentiveCalculationService $calculationService)
    {
        $this->calculationService = $calculationService;
    }

    /**
     * List all incentive pools with filters.
     */
    public function index(Request $request): JsonResponse
    {
        $query = IncentivePool::with([
            'lead:id,company_name,contact_name',
            'salesOrder:id,order_number,total_amount,order_status',
            'commercialInvoice:id,invoice_number,total_amount,status',
            'policy:id,policy_name',
        ]);

        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->has('revenue_stream') && $request->revenue_stream !== 'all') {
            $query->where('revenue_stream', $request->revenue_stream);
        }

        if ($request->has('period_key')) {
            $query->where('period_key', $request->period_key);
        }

        $pools = $query->orderBy('created_at', 'desc')->paginate($request->input('per_page', 15));

        return response()->json($pools);
    }

    /**
     * Get pool detail with full contributors breakdown.
     */
    public function show($id): JsonResponse
    {
        $pool = IncentivePool::with([
            'lead',
            'salesOrder.items',
            'commercialInvoice',
            'policy',
            'deptApprover:id,name,email',
            'financeApprover:id,name,email',
            'contributors.user:id,name,email,role_id',
            'contributors.role:id,name,display_name',
        ])->findOrFail($id);

        return response()->json(['data' => $pool]);
    }

    /**
     * Generate or draft an incentive pool from a confirmed Sales Order.
     */
    public function generateFromOrder(Request $request, $orderId): JsonResponse
    {
        $order = LeadSalesOrder::with(['items', 'lead.roleAssignments'])->findOrFail($orderId);

        $policy = IncentivePolicy::getActivePolicy($order->tenant_id);

        // Determine stream: check items for PS estimations
        $hasPs = $order->items->contains(fn($item) => !empty($item->professional_service_estimation_id) || str_contains(strtolower($item->item_name), 'service') || str_contains(strtolower($item->item_name), 'implement'));
        $hasSaas = $order->items->contains(fn($item) => empty($item->professional_service_estimation_id) && !str_contains(strtolower($item->item_name), 'service'));

        $stream = ($hasPs && $hasSaas) ? 'hybrid' : ($hasPs ? 'professional_service' : 'saas');
        $rate = $stream === 'professional_service' ? (float) $policy->ps_pool_rate : (float) $policy->saas_pool_rate;

        // Compute eligible revenue (subtotal excluding PPN)
        $gross = (float) $order->total_amount;
        $eligibleRevenue = $this->calculationService->computeEligibleRevenue($gross, $policy, [
            'discount_amount' => $order->discount_amount ?? 0,
            'includes_vat' => true,
        ]);

        $pool = DB::transaction(function () use ($order, $policy, $stream, $rate, $eligibleRevenue) {
            // Find existing draft or create new
            $pool = IncentivePool::firstOrNew([
                'sales_order_id' => $order->id,
            ]);

            $pool->tenant_id = $order->tenant_id;
            $pool->policy_id = $policy->id;
            $pool->lead_id = $order->lead_id;
            $pool->sales_order_id = $order->id;
            $pool->pool_code = $pool->pool_code ?: ('POOL-' . strtoupper(Str::random(8)));
            $pool->period_type = 'deal';
            $pool->period_key = now()->format('Y-m');
            $pool->revenue_stream = $stream;
            $pool->eligible_revenue = $eligibleRevenue;
            $pool->pool_rate_applied = $rate;
            $pool->status = $pool->status ?: 'draft';
            $pool->save();

            // Populate initial contributors from LeadRoleAssignments if empty
            if ($pool->contributors()->count() === 0 && $order->lead && $order->lead->roleAssignments->isNotEmpty()) {
                $roleWeights = $policy->role_weights_json ?: ['lead' => 1.5, 'core' => 1.2, 'supporting' => 1.0, 'minor' => 0.5];
                $perfMultipliers = $policy->performance_multipliers_json ?: ['below' => 0.8, 'meets' => 1.0, 'exceeds' => 1.1, 'outstanding' => 1.2];

                foreach ($order->lead->roleAssignments as $ra) {
                    $level = $ra->role_type === 'sales' ? 'lead' : 'core';
                    $weight = (float) ($roleWeights[$level] ?? 1.0);
                    $multiplier = (float) ($perfMultipliers['meets'] ?? 1.0);

                    $pool->contributors()->create([
                        'user_id' => $ra->user_id,
                        'role_id' => $ra->user?->role_id,
                        'contribution_type' => 'direct',
                        'contributor_level' => $level,
                        'role_weight' => $weight,
                        'effort_units' => 2.0, // Initial 2 mandays
                        'performance_rating' => 'meets',
                        'performance_multiplier' => $multiplier,
                        'contribution_score' => $weight * 2.0 * $multiplier,
                        'evaluation_notes' => 'Otomatis diimpor dari Role Assignment: ' . $ra->role_type,
                    ]);
                }
            }

            return $pool;
        });

        // Run calculation engine
        $calculatedPool = $this->calculationService->calculatePool($pool);

        return response()->json([
            'message' => 'Incentive pool berhasil digenerate dan dikalkulasi.',
            'data' => $calculatedPool,
        ], 201);
    }

    /**
     * Recalculate an existing pool.
     */
    public function recalculate($id): JsonResponse
    {
        $pool = IncentivePool::findOrFail($id);
        $calculated = $this->calculationService->calculatePool($pool);

        return response()->json([
            'message' => 'Pool berhasil dikalkulasi ulang.',
            'data' => $calculated,
        ]);
    }

    /**
     * Add or update a contributor to the pool.
     */
    public function addContributor(Request $request, $id): JsonResponse
    {
        $pool = IncentivePool::findOrFail($id);

        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'role_id' => 'nullable|exists:roles,id',
            'contribution_type' => 'required|string|in:direct,indirect',
            'contributor_level' => 'required|string|in:lead,core,supporting,minor',
            'effort_units' => 'required|numeric|min:0.1',
            'performance_rating' => 'required|string|in:below,meets,exceeds,outstanding',
            'evaluation_notes' => 'nullable|string',
        ]);

        $policy = $pool->policy ?? IncentivePolicy::getActivePolicy($pool->tenant_id);
        $roleWeights = $policy->role_weights_json ?: ['lead' => 1.5, 'core' => 1.2, 'supporting' => 1.0, 'minor' => 0.5];
        $perfMultipliers = $policy->performance_multipliers_json ?: ['below' => 0.8, 'meets' => 1.0, 'exceeds' => 1.1, 'outstanding' => 1.2];

        $weight = (float) ($roleWeights[$validated['contributor_level']] ?? 1.0);
        $multiplier = (float) ($perfMultipliers[$validated['performance_rating']] ?? 1.0);
        $effort = (float) $validated['effort_units'];
        $score = round($weight * $effort * $multiplier, 4);

        $contributor = $pool->contributors()->updateOrCreate(
            [
                'user_id' => $validated['user_id'],
                'contribution_type' => $validated['contribution_type'],
            ],
            [
                'role_id' => $validated['role_id'] ?? User::find($validated['user_id'])?->role_id,
                'contributor_level' => $validated['contributor_level'],
                'role_weight' => $weight,
                'effort_units' => $effort,
                'performance_rating' => $validated['performance_rating'],
                'performance_multiplier' => $multiplier,
                'contribution_score' => $score,
                'evaluation_notes' => $validated['evaluation_notes'] ?? null,
            ]
        );

        // Recalculate pool automatically
        $this->calculationService->calculatePool($pool);

        return response()->json([
            'message' => 'Kontributor berhasil disimpan dan pool dikalkulasi ulang.',
            'data' => $contributor,
        ]);
    }

    /**
     * Remove a contributor.
     */
    public function removeContributor($id, $contributorId): JsonResponse
    {
        $pool = IncentivePool::findOrFail($id);
        $pool->contributors()->where('id', $contributorId)->delete();

        // Recalculate
        $this->calculationService->calculatePool($pool);

        return response()->json([
            'message' => 'Kontributor berhasil dihapus dan pool dikalkulasi ulang.'
        ]);
    }

    /**
     * Approve pool by Department Head.
     */
    public function approveDept(Request $request, $id): JsonResponse
    {
        $pool = IncentivePool::findOrFail($id);
        $pool->update([
            'status' => 'approved_dept',
            'approved_dept_by' => $request->user()->id,
            'approved_dept_at' => now(),
        ]);

        return response()->json([
            'message' => 'Pool insentif berhasil disetujui oleh Kepala Departemen.',
            'data' => $pool,
        ]);
    }

    /**
     * Approve pool by Finance Director.
     */
    public function approveFinance(Request $request, $id): JsonResponse
    {
        $pool = IncentivePool::findOrFail($id);
        $pool->update([
            'status' => 'approved_finance',
            'approved_finance_by' => $request->user()->id,
            'approved_finance_at' => now(),
        ]);

        return response()->json([
            'message' => 'Pool insentif berhasil disahkan oleh Finance untuk pencairan.',
            'data' => $pool,
        ]);
    }

    /**
     * Personal earnings summary for the authenticated user.
     */
    public function mySummary(Request $request): JsonResponse
    {
        $user = $request->user();

        $contributions = IncentiveContributor::with(['pool.lead', 'pool.salesOrder', 'role'])
            ->where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->get();

        $totalEarned = $contributions->sum('allocated_amount');
        $approvedAmount = $contributions->filter(fn($c) => in_array($c->pool?->status, ['approved_dept', 'approved_finance', 'paid']))->sum('allocated_amount');
        $pendingAmount = $contributions->filter(fn($c) => in_array($c->pool?->status, ['draft', 'in_review']))->sum('allocated_amount');

        return response()->json([
            'data' => [
                'total_earned' => $totalEarned,
                'approved_amount' => $approvedAmount,
                'pending_amount' => $pendingAmount,
                'active_participations_count' => $contributions->count(),
                'contributions' => $contributions,
            ]
        ]);
    }

    /**
     * Department-wide analytics summary.
     */
    public function analytics(Request $request): JsonResponse
    {
        $totalPools = IncentivePool::count();
        $totalPoolAmount = IncentivePool::sum('total_pool_amount');
        $totalDirectAmount = IncentivePool::sum('direct_pool_amount');
        $totalIndirectAmount = IncentivePool::sum('indirect_pool_amount');
        $totalSharedAmount = IncentivePool::sum('shared_pool_amount');

        $byStatus = IncentivePool::selectRaw('status, count(*) as count, sum(total_pool_amount) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $byStream = IncentivePool::selectRaw('revenue_stream, count(*) as count, sum(total_pool_amount) as total')
            ->groupBy('revenue_stream')
            ->pluck('total', 'revenue_stream');

        return response()->json([
            'data' => [
                'total_pools' => $totalPools,
                'total_pool_amount' => $totalPoolAmount,
                'direct_pool_amount' => $totalDirectAmount,
                'indirect_pool_amount' => $totalIndirectAmount,
                'shared_pool_amount' => $totalSharedAmount,
                'by_status' => $byStatus,
                'by_stream' => $byStream,
            ]
        ]);
    }
}
