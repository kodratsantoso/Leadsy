<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PsComplexityLevel extends Model
{
    use HasFactory;

    protected $table = 'ps_complexity_levels';

    protected $fillable = [
        'name',
        'multiplier',
        'description',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'multiplier' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }
}
