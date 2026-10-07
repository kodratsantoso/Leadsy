<?php

namespace App\Http\Requests\Lead;

use Illuminate\Validation\Rule;

class UpdateLeadRequest extends LeadFormRequest
{
    public function rules(): array
    {
        return array_merge($this->sharedRules(), [
            'company_name' => 'sometimes|string|max:255',
            'lead_score' => 'nullable|integer|min:0|max:100',
            'qualification_status' => ['nullable', Rule::in(self::QUALIFICATION_STATUSES)],
            'ai_explanation' => 'nullable|string',
            'parent_lead_id' => [
                'nullable',
                'exists:leads,id',
                function ($attribute, $value, $fail) {
                    if ((int) $value === (int) $this->route('lead')->id) {
                        $fail('A lead cannot be a subsidiary of itself.');
                    }
                },
            ],
        ]);
    }
}
