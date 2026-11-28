<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeadBusinessSignal extends Model
{
    use HasFactory;

    protected $table = 'lead_business_signals';

    protected $fillable = [
        'lead_id',
        'tenant_id',
        'news_id',
        'signal_type',
        'sentiment',
        'impact_level',
        'title',
        'description',
        'actionable_recommendation',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function news(): BelongsTo
    {
        return $this->belongsTo(LeadCompanyNews::class, 'news_id');
    }
}
