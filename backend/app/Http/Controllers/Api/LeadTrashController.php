<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Services\AuditService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Soft-delete, restore and permanent removal of leads.
 *
 * Split out of LeadController. These methods use none of that controller's
 * private helpers and neither of its injected services.
 */
class LeadTrashController extends Controller
{
    /** POST /api/leads/batch-delete */
    public function batchDelete(Request $request): JsonResponse
    {
        abort_unless($request->user()->isSuperAdmin(), 403, 'Hanya super_admin yang dapat melakukan batch delete.');

        $data = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'integer|exists:leads,id',
        ]);

        Lead::whereIn('id', $data['ids'])->delete();

        return response()->json(['message' => 'Leads deleted successfully']);
    }

    /** GET /api/leads/trash */
    public function trash(Request $request): JsonResponse
    {
        $retentionDays = max(1, (int) $request->input('retention_days', 90));
        $now = Carbon::now();
        $cutoff = $now->copy()->subDays($retentionDays);

        $query = Lead::onlyTrashed()
            ->with(['industry', 'sources.channelType', 'owner']);

        if (! $request->user()->isSuperAdmin()) {
            $query->where('tenant_id', $request->user()->tenant_id);
        }

        // Search
        if ($request->filled('search')) {
            $search = '%' . trim($request->search) . '%';
            $query->where(function ($q) use ($search) {
                $q->where('company_name', 'ilike', $search)
                    ->orWhere('brand', 'ilike', $search)
                    ->orWhere('email', 'ilike', $search)
                    ->orWhere('phone', 'ilike', $search);
            });
        }

        // Filter by source
        if ($request->filled('source_type')) {
            $query->whereHas('sources', fn ($sq) => $sq->where('source_type', $request->source_type));
        }

        // Filter by retention status
        if ($request->filled('retention_status')) {
            $status = $request->retention_status;
            if ($status === 'expired') {
                $query->where('deleted_at', '<', $cutoff);
            } elseif ($status === 'expiring_soon') {
                $expiringThreshold = $cutoff->copy()->addDays(14);
                $query->where('deleted_at', '>=', $cutoff)
                      ->where('deleted_at', '<=', $expiringThreshold);
            } elseif ($status === 'active') {
                $expiringThreshold = $cutoff->copy()->addDays(14);
                $query->where('deleted_at', '>', $expiringThreshold);
            }
        }

        // Summary calculations
        $summaryBaseQuery = Lead::onlyTrashed();
        if (! $request->user()->isSuperAdmin()) {
            $summaryBaseQuery->where('tenant_id', $request->user()->tenant_id);
        }
        if ($request->filled('search')) {
            $search = '%' . trim($request->search) . '%';
            $summaryBaseQuery->where(function ($q) use ($search) {
                $q->where('company_name', 'ilike', $search)
                    ->orWhere('brand', 'ilike', $search)
                    ->orWhere('email', 'ilike', $search)
                    ->orWhere('phone', 'ilike', $search);
            });
        }
        if ($request->filled('source_type')) {
            $summaryBaseQuery->whereHas('sources', fn ($sq) => $sq->where('source_type', $request->source_type));
        }

        $totalDeleted = (clone $summaryBaseQuery)->count();
        $expiredCount = (clone $summaryBaseQuery)->where('deleted_at', '<', $cutoff)->count();
        $expiringThreshold = $cutoff->copy()->addDays(14);
        $expiringSoonCount = (clone $summaryBaseQuery)
            ->where('deleted_at', '>=', $cutoff)
            ->where('deleted_at', '<=', $expiringThreshold)
            ->count();
        $withinRetentionCount = $totalDeleted - $expiredCount;

        $perPage = min(100, max(10, (int) $request->input('per_page', 25)));
        $leads = $query->orderBy('deleted_at', 'desc')->paginate($perPage);

        // Transform collection to add retention properties
        $leads->getCollection()->transform(function ($lead) use ($retentionDays, $now) {
            $deletedAt = Carbon::parse($lead->deleted_at);
            $purgeAt = $deletedAt->copy()->addDays($retentionDays);
            $secondsRemaining = $now->diffInSeconds($purgeAt, false);
            $isExpired = $secondsRemaining <= 0;
            $daysRemaining = $isExpired ? 0 : (int) ceil($secondsRemaining / 86400);
            $hoursRemaining = $isExpired ? 0 : (int) ceil($secondsRemaining / 3600);

            $lead->retention_days = $retentionDays;
            $lead->purge_at = $purgeAt->toIso8601String();
            $lead->days_remaining = $daysRemaining;
            $lead->hours_remaining = $hoursRemaining;
            $lead->is_expired = $isExpired;
            $lead->retention_status = $isExpired ? 'expired' : ($daysRemaining <= 14 ? 'expiring_soon' : 'active');

            return $lead;
        });

        return response()->json([
            'data' => $leads->items(),
            'meta' => [
                'current_page' => $leads->currentPage(),
                'last_page' => $leads->lastPage(),
                'per_page' => $leads->perPage(),
                'total' => $leads->total(),
            ],
            'summary' => [
                'total_deleted' => $totalDeleted,
                'within_retention' => $withinRetentionCount,
                'expiring_soon' => $expiringSoonCount,
                'expired' => $expiredCount,
                'retention_days' => $retentionDays,
            ],
        ]);
    }

    /** POST /api/leads/{id}/restore */
    public function restore(Request $request, $id): JsonResponse
    {
        $lead = Lead::onlyTrashed()->findOrFail($id);

        if (! $request->user()->isSuperAdmin() && $lead->tenant_id !== $request->user()->tenant_id) {
            abort(403, 'Akses ditolak.');
        }

        $lead->restore();

        AuditService::log('restored', 'leads', $lead);

        return response()->json([
            'message' => 'Lead berhasil dipulihkan.',
            'data' => $lead->fresh(),
        ]);
    }

    /** POST /api/leads/batch-restore */
    public function batchRestore(Request $request): JsonResponse
    {
        abort_unless($request->user()->isSuperAdmin(), 403, 'Hanya super_admin yang dapat melakukan batch restore.');

        $data = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'integer',
        ]);

        $restored = Lead::onlyTrashed()->whereIn('id', $data['ids'])->restore();

        AuditService::log('batch_restore', 'leads', null, null, [
            'ids' => $data['ids'],
            'restored_count' => $restored,
        ]);

        return response()->json([
            'message' => "{$restored} leads berhasil dipulihkan.",
            'restored_count' => $restored,
        ]);
    }

    /** DELETE /api/leads/{id}/force-delete */
    public function forceDelete(Request $request, $id): JsonResponse
    {
        abort_unless($request->user()->isSuperAdmin(), 403, 'Hanya super_admin yang dapat menghapus lead secara permanen.');

        $lead = Lead::onlyTrashed()->findOrFail($id);

        AuditService::log('force_deleted', 'leads', $lead);

        $lead->forceDelete();

        return response()->json([
            'message' => 'Lead berhasil dihapus secara permanen.',
        ]);
    }

    /** POST /api/leads/batch-force-delete */
    public function batchForceDelete(Request $request): JsonResponse
    {
        abort_unless($request->user()->isSuperAdmin(), 403, 'Hanya super_admin yang dapat menghapus lead secara permanen.');

        $data = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'integer',
        ]);

        $leads = Lead::onlyTrashed()->whereIn('id', $data['ids'])->get();
        $count = $leads->count();

        foreach ($leads as $lead) {
            $lead->forceDelete();
        }

        AuditService::log('batch_force_delete', 'leads', null, null, [
            'ids' => $data['ids'],
            'count' => $count,
        ]);

        return response()->json([
            'message' => "{$count} leads berhasil dihapus secara permanen.",
            'deleted_count' => $count,
        ]);
    }

    /** POST /api/leads/purge-expired */
    public function purgeExpired(Request $request): JsonResponse
    {
        abort_unless($request->user()->isSuperAdmin(), 403, 'Hanya super_admin yang dapat membersihkan lead kedaluwarsa.');

        $retentionDays = max(1, (int) $request->input('retention_days', 90));
        $cutoff = Carbon::now()->subDays($retentionDays);

        $leads = Lead::onlyTrashed()->where('deleted_at', '<', $cutoff)->get();
        $count = $leads->count();

        foreach ($leads as $lead) {
            $lead->forceDelete();
        }

        AuditService::log('purge_expired', 'leads', null, null, [
            'retention_days' => $retentionDays,
            'purged_count' => $count,
        ]);

        return response()->json([
            'message' => "{$count} lead kedaluwarsa berhasil dibersihkan secara permanen.",
            'purged_count' => $count,
        ]);
    }

    /** DELETE /api/leads/{lead} */
    public function destroy(Lead $lead): JsonResponse
    {
        AuditService::logDeleted('leads', $lead);

        $lead->delete();

        return response()->json(null, 204);
    }
}
