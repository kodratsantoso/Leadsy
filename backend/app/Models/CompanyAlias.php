<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CompanyAlias extends Model
{
    protected $fillable = [
        'lead_id',
        'alias_value',
        'alias_type',
        'source',
        'verified',
    ];

    protected $casts = [
        'verified' => 'boolean',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }
}
