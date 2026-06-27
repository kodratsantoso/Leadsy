<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class ConfidentialityAssessment extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'score_breakdown_json' => 'array',
        'data_sources_json' => 'array',
        'missing_data_json' => 'array',
        'recommendation_json' => 'array',
        'assessed_at' => 'datetime',
        'reviewed_at' => 'datetime',
    ];

    public function entity(): MorphTo
    {
        return $this->morphTo();
    }
}
