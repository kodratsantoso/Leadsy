<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LarkBaseFieldMapping extends Model
{
    use HasFactory;

    protected $fillable = [
        'connection_id',
        'leadsy_entity_type',
        'leadsy_field_key',
        'leadsy_field_label',
        'lark_field_id',
        'lark_field_name',
        'lark_field_type',
        'sync_direction',
        'is_required',
        'is_active',
    ];

    protected $casts = [
        'is_required' => 'boolean',
        'is_active' => 'boolean',
    ];

    public function connection(): BelongsTo
    {
        return $this->belongsTo(LarkBaseConnection::class, 'connection_id');
    }
}
