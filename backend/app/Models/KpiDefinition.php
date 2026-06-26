<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class KpiDefinition extends Model
{
    use HasFactory;

    protected $fillable = [
        'role_slug',
        'kpi_key',
        'kpi_name',
        'description',
        'formula_json',
        'weight',
        'format',
        'is_active',
    ];

    protected $casts = [
        'formula_json' => 'array',
        'weight' => 'decimal:2',
        'is_active' => 'boolean',
    ];
}
