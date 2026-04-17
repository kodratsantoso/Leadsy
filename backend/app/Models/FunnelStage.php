<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FunnelStage extends Model
{
    protected $fillable = ['name', 'sequence', 'color', 'probability', 'is_active'];

    protected $casts = [
        'is_active'   => 'boolean',
        'probability' => 'integer',
        'sequence'    => 'integer',
    ];
}
