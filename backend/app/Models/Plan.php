<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Plan extends Model
{
    protected $fillable = [
        'code',
        'name',
        'description',
        'price_monthly',
        'price_annual',
        'currency',
        'seats_limit',
        'price_per_additional_seat',
        'leads_limit',
        'disk_limit_gb',
        'ai_budget_cap_usd',
        'whatsapp_channels_limit',
        'features',
        'modules',
        'is_popular',
        'is_public',
        'status',
    ];

    protected $casts = [
        'price_monthly' => 'float',
        'price_annual' => 'float',
        'price_per_additional_seat' => 'float',
        'ai_budget_cap_usd' => 'float',
        'seats_limit' => 'integer',
        'leads_limit' => 'integer',
        'disk_limit_gb' => 'integer',
        'whatsapp_channels_limit' => 'integer',
        'features' => 'array',
        'modules' => 'array',
        'is_popular' => 'boolean',
        'is_public' => 'boolean',
    ];

    public function tenants(): HasMany
    {
        return $this->hasMany(Tenant::class, 'plan_id');
    }
}
