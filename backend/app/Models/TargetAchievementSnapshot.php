<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TargetAchievementSnapshot extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'target_type',
        'target_id',
        'actual_value',
        'target_value',
        'achievement_percentage',
        'calculation_basis_json',
        'data_sources_json',
        'limitation',
        'generated_at',
        'tenant_id',
    ];

    protected $casts = [
        'calculation_basis_json' => 'array',
        'data_sources_json' => 'array',
        'generated_at' => 'datetime',
    ];
}
