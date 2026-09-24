<?php

namespace App\Http\Requests\LeadActivity;

class StoreLeadActivityRequest extends LeadActivityFormRequest
{
    public function rules(): array
    {
        return array_merge($this->sharedRules(), [
            'activity_type' => 'required|string|max:100',
            // Logging an activity may advance the lead's stage; editing one may not.
            'funnel_stage_id' => 'nullable|exists:funnel_stages,id',
        ]);
    }
}
