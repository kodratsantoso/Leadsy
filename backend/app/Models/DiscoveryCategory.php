<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DiscoveryCategory extends Model
{
    protected $fillable = ['label', 'value', 'sort_order', 'is_active'];

    protected $casts = [
        'is_active' => 'boolean',
    ];
}
