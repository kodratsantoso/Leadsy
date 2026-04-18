<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeadIcpMatch extends Model
{
    protected $fillable = [
        'lead_id', 'icp_profile_id',
        'match_score', 'match_level', 'score_breakdown', 'evaluated_at',
    ];

    protected $casts = [
        'match_score'     => 'float',
        'score_breakdown' => 'array',
        'evaluated_at'    => 'datetime',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function icpProfile(): BelongsTo
    {
        return $this->belongsTo(IcpProfile::class);
    }
}
