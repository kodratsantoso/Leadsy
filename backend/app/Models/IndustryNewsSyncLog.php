<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IndustryNewsSyncLog extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'industry_id',
        'sub_industry_id',
        'region_scope',
        'status',
        'articles_fetched',
        'new_articles_saved',
        'entities_detected',
        'providers_used',
        'error_message',
        'triggered_by',
        'started_at',
        'completed_at',
    ];

    protected $casts = [
        'providers_used' => 'array',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function industry(): BelongsTo
    {
        return $this->belongsTo(Industry::class);
    }

    public function subIndustry(): BelongsTo
    {
        return $this->belongsTo(SubIndustry::class);
    }

    public function triggeredByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'triggered_by');
    }
}
