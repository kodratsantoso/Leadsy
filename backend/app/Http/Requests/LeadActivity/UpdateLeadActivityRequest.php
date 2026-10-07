<?php

namespace App\Http\Requests\LeadActivity;

class UpdateLeadActivityRequest extends LeadActivityFormRequest
{
    public function rules(): array
    {
        return array_merge($this->sharedRules(), [
            'activity_type' => 'sometimes|string|max:100',
        ]);
    }
}
