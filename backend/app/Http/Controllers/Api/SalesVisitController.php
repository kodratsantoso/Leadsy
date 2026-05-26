<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Models\SalesVisit;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class SalesVisitController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $visits = SalesVisit::query()
            ->with(['lead:id,company_name,address,lat,lng,phone,email', 'user:id,name,email', 'media'])
            ->whereHas('lead', fn ($query) => $query->whereIn('id', Lead::visibleTo($request->user())->select('id')))
            ->when($request->filled('lead_id'), fn ($query) => $query->where('lead_id', $request->integer('lead_id')))
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')->toString()))
            ->latest('clock_in_at')
            ->paginate($request->integer('per_page', 20));

        return response()->json($visits);
    }

    public function clockIn(Request $request, Lead $lead): JsonResponse
    {
        $this->authorizeLeadAccess($request, $lead);

        $data = $request->validate([
            'lat' => ['required', 'numeric', 'between:-90,90'],
            'lng' => ['required', 'numeric', 'between:-180,180'],
            'accuracy_m' => ['nullable', 'integer', 'min:0', 'max:100000'],
            'device_metadata' => ['nullable', 'array'],
            'risk_signals' => ['nullable', 'array'],
            'notes' => ['nullable', 'string', 'max:5000'],
        ]);

        $distance = $this->distanceFromLead($lead, (float) $data['lat'], (float) $data['lng']);
        [$riskStatus, $riskSignals] = $this->evaluateRisk($data['risk_signals'] ?? [], $data['accuracy_m'] ?? null, $distance);

        $visit = SalesVisit::create([
            'lead_id' => $lead->id,
            'user_id' => $request->user()->id,
            'status' => 'in_progress',
            'clock_in_at' => now(),
            'clock_in_lat' => $data['lat'],
            'clock_in_lng' => $data['lng'],
            'clock_in_accuracy_m' => $data['accuracy_m'] ?? null,
            'clock_in_distance_m' => $distance,
            'risk_status' => $riskStatus,
            'risk_signals' => $riskSignals,
            'device_metadata' => $data['device_metadata'] ?? null,
            'notes' => $data['notes'] ?? null,
        ]);

        AuditService::logCreated('sales_visits', $visit);

        return response()->json(['data' => $visit->load(['lead', 'media'])], 201);
    }

    public function clockOut(Request $request, SalesVisit $visit): JsonResponse
    {
        $this->authorizeVisitAccess($request, $visit);

        $data = $request->validate([
            'lat' => ['required', 'numeric', 'between:-90,90'],
            'lng' => ['required', 'numeric', 'between:-180,180'],
            'accuracy_m' => ['nullable', 'integer', 'min:0', 'max:100000'],
            'visit_result' => ['required', 'string', 'max:80'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'client_name' => ['nullable', 'string', 'max:255'],
            'client_title' => ['nullable', 'string', 'max:255'],
            'risk_signals' => ['nullable', 'array'],
        ]);

        $distance = $this->distanceFromLead($visit->lead, (float) $data['lat'], (float) $data['lng']);
        [$riskStatus, $riskSignals] = $this->evaluateRisk($data['risk_signals'] ?? [], $data['accuracy_m'] ?? null, $distance);

        $before = $visit->getOriginal();
        $visit->update([
            'status' => 'completed',
            'clock_out_at' => now(),
            'clock_out_lat' => $data['lat'],
            'clock_out_lng' => $data['lng'],
            'clock_out_accuracy_m' => $data['accuracy_m'] ?? null,
            'clock_out_distance_m' => $distance,
            'risk_status' => $this->mostSevereRisk($visit->risk_status, $riskStatus),
            'risk_signals' => array_merge($visit->risk_signals ?? [], $riskSignals),
            'visit_result' => $data['visit_result'],
            'notes' => $data['notes'] ?? $visit->notes,
            'client_name' => $data['client_name'] ?? $visit->client_name,
            'client_title' => $data['client_title'] ?? $visit->client_title,
        ]);

        AuditService::logUpdated('sales_visits', $visit, $before);

        return response()->json(['data' => $visit->fresh(['lead', 'media'])]);
    }

    public function uploadMedia(Request $request, SalesVisit $visit): JsonResponse
    {
        $this->authorizeVisitAccess($request, $visit);

        $data = $request->validate([
            'media_type' => ['required', Rule::in(['photo', 'signature'])],
            'file' => ['required', 'file', 'max:10240'],
            'lat' => ['nullable', 'numeric', 'between:-90,90'],
            'lng' => ['nullable', 'numeric', 'between:-180,180'],
            'accuracy_m' => ['nullable', 'integer', 'min:0', 'max:100000'],
            'captured_at' => ['nullable', 'date'],
            'metadata' => ['nullable', 'array'],
        ]);

        $path = $request->file('file')->store("sales-visits/{$visit->id}", 'public');
        $media = $visit->media()->create([
            'uploaded_by' => $request->user()->id,
            'media_type' => $data['media_type'],
            'disk' => 'public',
            'path' => $path,
            'mime_type' => $request->file('file')->getMimeType(),
            'size_bytes' => $request->file('file')->getSize(),
            'lat' => $data['lat'] ?? null,
            'lng' => $data['lng'] ?? null,
            'accuracy_m' => $data['accuracy_m'] ?? null,
            'captured_at' => $data['captured_at'] ?? now(),
            'metadata' => $data['metadata'] ?? null,
        ]);

        if ($data['media_type'] === 'signature') {
            $visit->update(['signature_captured_at' => now()]);
        }

        AuditService::logCreated('sales_visit_media', $media);

        return response()->json([
            'data' => array_merge($media->toArray(), [
                'url' => Storage::disk($media->disk)->url($media->path),
            ]),
        ], 201);
    }

    private function authorizeLeadAccess(Request $request, Lead $lead): void
    {
        if (! Lead::visibleTo($request->user())->whereKey($lead->id)->exists()) {
            abort(403);
        }
    }

    private function authorizeVisitAccess(Request $request, SalesVisit $visit): void
    {
        if (! Lead::visibleTo($request->user())->whereKey($visit->lead_id)->exists()) {
            abort(403);
        }
    }

    private function distanceFromLead(Lead $lead, float $lat, float $lng): ?int
    {
        if ($lead->lat === null || $lead->lng === null) {
            return null;
        }

        $earthRadius = 6371000;
        $leadLat = deg2rad((float) $lead->lat);
        $leadLng = deg2rad((float) $lead->lng);
        $visitLat = deg2rad($lat);
        $visitLng = deg2rad($lng);
        $deltaLat = $visitLat - $leadLat;
        $deltaLng = $visitLng - $leadLng;

        $a = sin($deltaLat / 2) ** 2 + cos($leadLat) * cos($visitLat) * sin($deltaLng / 2) ** 2;

        return (int) round($earthRadius * 2 * atan2(sqrt($a), sqrt(1 - $a)));
    }

    private function evaluateRisk(array $signals, ?int $accuracy, ?int $distance): array
    {
        $normalizedSignals = $signals;
        $risk = 'verified';

        if ($accuracy !== null && $accuracy > 100) {
            $normalizedSignals[] = ['type' => 'low_gps_accuracy', 'value' => $accuracy];
            $risk = 'warning';
        }

        if ($distance !== null && $distance > 300) {
            $normalizedSignals[] = ['type' => 'outside_visit_radius', 'value' => $distance];
            $risk = 'warning';
        }

        foreach ($normalizedSignals as $signal) {
            $type = is_array($signal) ? ($signal['type'] ?? null) : $signal;
            if (in_array($type, ['mock_location', 'rooted_device', 'jailbroken_device'], true)) {
                $risk = 'blocked';
            }
        }

        return [$risk, $normalizedSignals];
    }

    private function mostSevereRisk(string $first, string $second): string
    {
        $rank = ['verified' => 0, 'warning' => 1, 'manual_review' => 2, 'blocked' => 3];

        return ($rank[$second] ?? 0) > ($rank[$first] ?? 0) ? $second : $first;
    }
}
