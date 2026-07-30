<?php

namespace App\Services\ProfessionalServices;

use App\Models\PsChangeRequest;
use App\Models\PsProjectPlan;
use Exception;
use Illuminate\Support\Facades\DB;

class PsChangeRequestService
{
    public function createChangeRequest(array $data, int $userId): PsChangeRequest
    {
        $plan = PsProjectPlan::findOrFail($data['project_plan_id']);
        
        $data['requested_by'] = $userId;
        $data['status'] = 'Submitted';
        $data['change_request_number'] = 'CR-' . $plan->id . '-' . strtoupper(uniqid());
        
        if ($plan->estimation_id) {
            $data['estimation_id'] = $plan->estimation_id;
        }

        return PsChangeRequest::create($data);
    }

    public function approveChangeRequest(int $changeRequestId, int $approverId): PsChangeRequest
    {
        return DB::transaction(function () use ($changeRequestId, $approverId) {
            $cr = PsChangeRequest::findOrFail($changeRequestId);
            
            if ($cr->status !== 'Submitted') {
                throw new Exception("Change Request is not in Submitted status.");
            }

            $cr->update([
                'status' => 'Approved',
                'approved_by' => $approverId,
                'approved_at' => now(),
            ]);

            // If it has commercial impact, we would ideally generate a quotation 
            // or trigger an alert for sales. For PSA Lite, we just approve it.
            // Further integration with Order to Cash can happen here.
            
            return $cr;
        });
    }

    public function rejectChangeRequest(int $changeRequestId, int $approverId, string $reason): PsChangeRequest
    {
        $cr = PsChangeRequest::findOrFail($changeRequestId);
        $cr->update([
            'status' => 'Rejected',
            'rejection_reason' => $reason,
        ]);
        return $cr;
    }
}
