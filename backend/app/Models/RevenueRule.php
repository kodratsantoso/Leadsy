<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property string $name
 * @property string|null $description
 * @property string $condition_type
 * @property array<array-key, mixed> $condition_value
 * @property string $action
 * @property string $severity
 * @property bool $is_active
 * @property int $priority
 * @property int|null $created_by
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property int|null $tenant_id
 * @property-read \App\Models\User|null $creator
 * @property-read \App\Models\Tenant|null $tenant
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RevenueRule newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RevenueRule newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RevenueRule query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RevenueRule whereAction($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RevenueRule whereConditionType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RevenueRule whereConditionValue($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RevenueRule whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RevenueRule whereCreatedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RevenueRule whereDescription($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RevenueRule whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RevenueRule whereIsActive($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RevenueRule whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RevenueRule wherePriority($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RevenueRule whereSeverity($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RevenueRule whereTenantId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RevenueRule whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class RevenueRule extends Model
{
    protected $fillable = [
        'tenant_id', 'name', 'description', 'condition_type', 'condition_value',
        'action', 'severity', 'is_active', 'priority', 'created_by',
    ];

    protected $casts = [
        'condition_value' => 'array',
        'is_active' => 'boolean',
        'priority' => 'integer',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
