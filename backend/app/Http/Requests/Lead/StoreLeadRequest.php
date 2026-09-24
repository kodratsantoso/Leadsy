<?php

namespace App\Http\Requests\Lead;

class StoreLeadRequest extends LeadFormRequest
{
    public function rules(): array
    {
        return array_merge($this->sharedRules(), [
            'company_name' => 'required|string|max:255',
            'external_place_id' => 'nullable|string|max:255',
            'territory_id' => 'nullable|exists:territories,id',
            'ai_mode' => 'nullable|in:full_ai,hybrid,manual',
            'use_ai_reference' => 'nullable|boolean',
            'parent_lead_id' => 'nullable|exists:leads,id',
        ]);
    }
}
