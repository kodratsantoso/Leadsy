<?php

namespace App\Http\Requests\Lead;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Bulk import of discovered leads.
 *
 * Forty rules, including the per-row and per-contact shapes, which made the
 * controller method's own logic hard to find. Moved verbatim.
 */
class BulkImportLeadsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
        'leads' => 'required|array|min:1|max:500',
        'leads.*.company_name' => 'required|string|max:255',
        'leads.*.brand' => 'nullable|string|max:255',
        'leads.*.address' => 'nullable|string',
        'leads.*.lat' => 'nullable|numeric',
        'leads.*.lng' => 'nullable|numeric',
        'leads.*.phone' => 'nullable|string',
        'leads.*.email' => 'nullable|email',
        'leads.*.website' => 'nullable|url',
        'leads.*.external_place_id' => 'nullable|string',
        'leads.*.business_category' => 'nullable|string',
        'leads.*.industry_id' => 'nullable|exists:industries,id',
        'leads.*.sub_industry_id' => 'nullable|exists:sub_industries,id',
        'leads.*.company_size_estimate' => 'nullable|string|max:100',
        'leads.*.branch_count' => 'nullable|integer|min:0',
        'leads.*.operating_hours' => 'nullable|string|max:255',
        'leads.*.lead_score' => 'nullable|integer|min:0|max:100',
        'leads.*.qualification_status' => 'nullable|in:pending,eligible,potential,not_eligible',
        'leads.*.estimated_closing_amount' => 'nullable|numeric|min:0',
        'leads.*.realized_closing_amount' => 'nullable|numeric|min:0',
        'leads.*.funnel_stage_id' => 'nullable|exists:funnel_stages,id',
        'leads.*.owner_id' => 'nullable|exists:users,id',
        'leads.*.territory_id' => 'nullable|exists:territories,id',
        'leads.*.product_id' => 'nullable|exists:products,id',
        'leads.*.source_type' => 'nullable|exists:lead_source_types,slug',
        'leads.*.channel_type_id' => 'nullable|exists:lead_channel_types,id',
        'leads.*.contacts' => 'nullable|array|max:10',
        'leads.*.contacts.*.name' => 'sometimes|required|string|max:255',
        'leads.*.contacts.*.title' => 'nullable|string|max:255',
        'leads.*.contacts.*.email' => 'nullable|email',
        'leads.*.contacts.*.phone' => 'nullable|string|max:30',
        'leads.*.contacts.*.linkedin_url' => 'nullable|string|max:500',
        'leads.*.contacts.*.confidence' => 'nullable|in:high,medium,low',
        'leads.*.contacts.*.is_primary' => 'nullable|boolean',
        'leads.*.contacts.*.do_not_contact' => 'nullable|boolean',
        'territory_id' => 'nullable|exists:territories,id',
        'product_id' => 'nullable|exists:products,id',
        'source_type' => 'nullable|exists:lead_source_types,slug',
        'channel_type_id' => 'nullable|exists:lead_channel_types,id',
        'ai_mode' => 'nullable|in:full_ai,hybrid,manual',
        ];
    }
}
