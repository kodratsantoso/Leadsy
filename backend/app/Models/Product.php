<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Product extends Model
{
    protected $fillable = [
        'name', 'category', 'description', 'target_industry',
        'target_pain_points', 'target_buyer_persona',
        'ideal_company_profile', 'ai_reference_material',
        'status', 'created_by',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
