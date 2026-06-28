<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LarkBaseConnection extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'connection_name',
        'app_id',
        'encrypted_app_secret',
        'app_token',
        'table_id',
        'base_url',
        'is_active',
        'created_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    protected $hidden = [
        'encrypted_app_secret',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function fieldMappings(): HasMany
    {
        return $this->hasMany(LarkBaseFieldMapping::class, 'connection_id');
    }

    public function syncLogs(): HasMany
    {
        return $this->hasMany(LarkBaseSyncLog::class, 'connection_id');
    }
}
