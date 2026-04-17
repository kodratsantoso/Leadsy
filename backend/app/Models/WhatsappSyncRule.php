<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WhatsappSyncRule extends Model
{
    protected $fillable = [
        'rule_type',
        'rule_key',
        'rule_value',
        'enabled',
    ];

    protected $casts = [
        'enabled' => 'boolean',
    ];
}
