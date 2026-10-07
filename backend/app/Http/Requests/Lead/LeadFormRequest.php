<?php

namespace App\Http\Requests\Lead;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Shared rules for creating and updating a lead.
 *
 * Store and update previously validated inline and repeated twenty-odd
 * identical lines between them, which is how they drifted: only one of the two
 * accepted a lead_score, and their qualification_status lists disagreed with
 * the rest of the application.
 *
 * Authorization stays with the route middleware (permission:leads.create /
 * leads.edit), so authorize() passes here rather than duplicating that check.
 */
abstract class LeadFormRequest extends FormRequest
{
    /**
     * Every qualification_status the application actually produces.
     *
     * 'disqualified' is included deliberately: LeadQualification writes it,
     * the dashboard counts it, and the badge helpers render it — but the old
     * inline update rule left it out, so saving a lead the rule engine had
     * disqualified was rejected as invalid.
     */
    public const QUALIFICATION_STATUSES = ['pending', 'eligible', 'potential', 'not_eligible', 'disqualified'];

    public function authorize(): bool
    {
        return true;
    }

    /** Fields accepted by both create and update, with identical rules. */
    protected function sharedRules(): array
    {
        return [
            'brand' => 'nullable|string|max:255',
            'address' => 'nullable|string',
            'lat' => 'nullable|numeric',
            'lng' => 'nullable|numeric',
            'website' => 'nullable|url|max:500',
            'phone' => 'nullable|string|max:30',
            'email' => 'nullable|email',
            'industry_id' => 'nullable|exists:industries,id',
            'sub_industry_id' => 'nullable|exists:sub_industries,id',
            'business_category' => 'nullable|string|max:255',
            'business_category_id' => 'nullable|exists:business_categories,id',
            'company_size_estimate' => 'nullable|string|max:100',
            'estimated_closing_amount' => 'nullable|numeric|min:0',
            'realized_closing_amount' => 'nullable|numeric|min:0',
            'funnel_stage_id' => 'nullable|exists:funnel_stages,id',
            'owner_id' => 'nullable|exists:users,id',
            'presales_owner_id' => 'nullable|exists:users,id',
            'am_owner_id' => 'nullable|exists:users,id',
            'csm_owner_id' => 'nullable|exists:users,id',
            'product_id' => 'nullable|exists:products,id',
            'source_type' => 'nullable|exists:lead_source_types,slug',
            'channel_type_id' => 'nullable|exists:lead_channel_types,id',
        ];
    }
}
