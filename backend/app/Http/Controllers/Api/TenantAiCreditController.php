<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AiRequest;
use App\Models\Tenant;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TenantAiCreditController extends Controller
{
    /**
     * Get the AI Credit overview, balance, and breakdown for the authenticated tenant.
     */
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        $tenantId = $user?->tenant_id;
        $tenant = $tenantId ? Tenant::find($tenantId) : Tenant::first();

        if (!$tenant) {
            return response()->json(['message' => 'Tenant not found.'], 404);
        }

        $balance = (int) ($tenant->ai_credits_balance ?? 25000);
        $allocated = (int) ($tenant->ai_credits_allocated ?? 25000);
        $used = max(0, $allocated - $balance);
        $usagePercentage = $allocated > 0 ? round(($used / $allocated) * 100, 1) : 0;

        // Calculate actual usage breakdown from ai_requests if available
        $profilingTokens = 0;
        $screeningTokens = 0;
        $copilotTokens = 0;
        $otherTokens = 0;

        if (class_exists(AiRequest::class)) {
            $recentRequests = AiRequest::where('tenant_id', $tenant->id)
                ->where('created_at', '>=', now()->startOfMonth())
                ->get(['feature_name', 'tokens_total']);

            foreach ($recentRequests as $req) {
                $tokens = (int) ($req->tokens_total ?? 100);
                if (str_contains($req->feature_name ?? '', 'profiling')) {
                    $profilingTokens += $tokens;
                } elseif (str_contains($req->feature_name ?? '', 'screening')) {
                    $screeningTokens += $tokens;
                } elseif (str_contains($req->feature_name ?? '', 'copilot') || str_contains($req->feature_name ?? '', 'chat')) {
                    $copilotTokens += $tokens;
                } else {
                    $otherTokens += $tokens;
                }
            }
        }

        // Fallback proportional visual breakdown if fresh tenant
        if ($profilingTokens === 0 && $screeningTokens === 0) {
            $profilingTokens = (int) ($used * 0.45);
            $screeningTokens = (int) ($used * 0.30);
            $copilotTokens = (int) ($used * 0.15);
            $otherTokens = max(0, $used - ($profilingTokens + $screeningTokens + $copilotTokens));
        }

        return response()->json([
            'success' => true,
            'data' => [
                'tenant_name' => $tenant->name ?? 'Workspace',
                'plan_name' => $tenant->metadata['plan_name'] ?? 'Enterprise AI Growth',
                'credit_balance' => $balance,
                'credit_allocated' => $allocated,
                'credit_used' => $used,
                'usage_percentage' => $usagePercentage,
                'billing_period' => now()->format('F Y'),
                'renewal_date' => now()->endOfMonth()->toDateString(),
                'breakdown' => [
                    'lead_profiling' => $profilingTokens,
                    'screening_monitor' => $screeningTokens,
                    'sales_copilot' => $copilotTokens,
                    'other_intelligence' => $otherTokens,
                ],
                'pricing_packages' => [
                    [
                        'id' => 'pack-5k',
                        'name' => 'Starter AI Boost',
                        'credits' => 5000,
                        'price_idr' => 750000,
                        'description' => 'Cocok untuk ~50 profiling mendalam dan screening cepat.',
                    ],
                    [
                        'id' => 'pack-20k',
                        'name' => 'Growth Enterprise Pack',
                        'credits' => 20000,
                        'price_idr' => 2500000,
                        'popular' => true,
                        'description' => 'Paling populer untuk tim sales 5-15 personil.',
                    ],
                    [
                        'id' => 'pack-50k',
                        'name' => 'Scale Pro Volume',
                        'credits' => 50000,
                        'price_idr' => 5500000,
                        'description' => 'Kapasitas penuh untuk kampanye prospek masif dan transkrip rapat.',
                    ],
                ],
            ],
        ]);
    }

    /**
     * Submit an AI credit top-up request to SaaS Platform Admin.
     */
    public function requestTopUp(Request $request): JsonResponse
    {
        $user = $request->user();
        $tenantId = $user?->tenant_id;
        $tenant = $tenantId ? Tenant::find($tenantId) : Tenant::first();

        if (!$tenant) {
            return response()->json(['message' => 'Tenant not found.'], 404);
        }

        $validated = $request->validate([
            'package_id' => 'required|string',
            'package_name' => 'required|string|max:100',
            'credits_requested' => 'required|integer|min:1000',
            'notes' => 'nullable|string|max:500',
        ]);

        AuditService::log('ai_credit_top_up_request', 'tenants', $tenant->id, null, [
            'user_id' => $user->id,
            'user_name' => $user->name,
            'package_id' => $validated['package_id'],
            'credits_requested' => $validated['credits_requested'],
            'notes' => $validated['notes'] ?? null,
            'requested_at' => now()->toIso8601String(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Permintaan penambahan kuota AI berhasil diajukan ke admin pusat.',
            'data' => [
                'reference_id' => 'AIC-REQ-' . strtoupper(substr(md5(uniqid()), 0, 8)),
                'status' => 'pending_approval',
                'requested_credits' => $validated['credits_requested'],
            ],
        ]);
    }
}
