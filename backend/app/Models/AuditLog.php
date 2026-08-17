<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int|null $user_id
 * @property string $action
 * @property string $module
 * @property string|null $record_type
 * @property int|null $record_id
 * @property array<array-key, mixed>|null $before_value
 * @property array<array-key, mixed>|null $after_value
 * @property string|null $ip_address
 * @property string|null $user_agent
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property string|null $request_method
 * @property string|null $route_path
 * @property string $status
 * @property array<array-key, mixed>|null $metadata_json
 * @property int|null $tenant_id
 * @property-read \App\Models\Tenant|null $tenant
 * @property-read \App\Models\User|null $user
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AuditLog newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AuditLog newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AuditLog query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AuditLog whereAction($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AuditLog whereAfterValue($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AuditLog whereBeforeValue($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AuditLog whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AuditLog whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AuditLog whereIpAddress($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AuditLog whereMetadataJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AuditLog whereModule($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AuditLog whereRecordId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AuditLog whereRecordType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AuditLog whereRequestMethod($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AuditLog whereRoutePath($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AuditLog whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AuditLog whereTenantId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AuditLog whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AuditLog whereUserAgent($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AuditLog whereUserId($value)
 * @mixin \Eloquent
 */
class AuditLog extends Model
{
    protected $fillable = [
        'tenant_id', 'user_id', 'action', 'module', 'record_type', 'record_id',
        'before_value', 'after_value', 'ip_address', 'user_agent',
        'request_method', 'route_path', 'status', 'metadata_json',
    ];

    protected $casts = [
        'before_value' => 'array',
        'after_value' => 'array',
        'metadata_json' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
