<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class IcpProfile extends Model
{
    protected $fillable = [
        'name', 'description',
        'target_industries', 'target_company_sizes', 'target_territories',
        'min_lead_score', 'required_fields',
        'weight_lead_score', 'weight_industry', 'weight_company_size',
        'weight_territory', 'weight_contact_info',
        'is_active', 'created_by',
    ];

    protected $casts = [
        'target_industries'    => 'array',
        'target_company_sizes' => 'array',
        'target_territories'   => 'array',
        'required_fields'      => 'array',
        'weight_lead_score'    => 'float',
        'weight_industry'      => 'float',
        'weight_company_size'  => 'float',
        'weight_territory'     => 'float',
        'weight_contact_info'  => 'float',
        'is_active'            => 'boolean',
        'min_lead_score'       => 'integer',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function leadMatches(): HasMany
    {
        return $this->hasMany(LeadIcpMatch::class);
    }
}
