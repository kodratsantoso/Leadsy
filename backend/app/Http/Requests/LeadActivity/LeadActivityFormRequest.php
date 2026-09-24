<?php

namespace App\Http\Requests\LeadActivity;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Shared rules for logging and editing a lead activity.
 *
 * The two endpoints previously repeated nine identical lines, differing only
 * in whether activity_type is required and whether a funnel stage may be set.
 */
abstract class LeadActivityFormRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function sharedRules(): array
    {
        return [
            'description' => 'nullable|string',
            'outcome' => 'nullable|string|max:1000',
            'budget' => 'nullable|string',
            'authority' => 'nullable|string',
            'needs' => 'nullable|string',
            'timeline' => 'nullable|string',
            'competitor' => 'nullable|string',
            'activity_date' => 'nullable|date',
            'next_follow_up_date' => 'nullable|date',
        ];
    }
}
