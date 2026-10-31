<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class NsfpPool extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'nsfp_pools';

    protected $fillable = [
        'tax_year',
        'prefix',
        'start_number',
        'end_number',
        'current_number',
        'total_allocated',
        'total_used',
        'is_active',
        'notes',
        'tenant_id',
    ];

    protected $casts = [
        'start_number' => 'integer',
        'end_number' => 'integer',
        'current_number' => 'integer',
        'total_allocated' => 'integer',
        'total_used' => 'integer',
        'is_active' => 'boolean',
    ];
}
