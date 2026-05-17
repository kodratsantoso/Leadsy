<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeadChannelType extends Model
{
    protected $fillable = [
        'lead_source_type_id',
        'name',
        'slug',
        'description',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'sort_order' => 'integer',
        'is_active' => 'boolean',
    ];

    public function sourceType(): BelongsTo
    {
        return $this->belongsTo(LeadSourceType::class, 'lead_source_type_id');
    }
}
