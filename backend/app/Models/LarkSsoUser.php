<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $user_id
 * @property string $lark_user_id
 * @property string|null $lark_union_id
 * @property string|null $lark_email
 * @property string|null $lark_name
 * @property string|null $lark_mobile
 * @property string|null $lark_avatar_url
 * @property string|null $lark_department_id
 * @property string|null $lark_direct_manager_id
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\LarkIntegration|null $larkIntegration
 * @property-read \App\Models\Tenant|null $tenant
 * @property-read \App\Models\User $user
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkSsoUser newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkSsoUser newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkSsoUser query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkSsoUser whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkSsoUser whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkSsoUser whereLarkAvatarUrl($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkSsoUser whereLarkDepartmentId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkSsoUser whereLarkDirectManagerId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkSsoUser whereLarkEmail($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkSsoUser whereLarkMobile($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkSsoUser whereLarkName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkSsoUser whereLarkUnionId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkSsoUser whereLarkUserId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkSsoUser whereTenantId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkSsoUser whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LarkSsoUser whereUserId($value)
 * @mixin \Eloquent
 */
class LarkSsoUser extends Model
{
    protected $fillable = [
        'tenant_id',
        'user_id',
        'lark_user_id',
        'lark_union_id',
        'lark_email',
        'lark_name',
        'lark_mobile',
        'lark_avatar_url',
        'lark_department_id',
        'lark_direct_manager_id',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function larkIntegration(): BelongsTo
    {
        return $this->belongsTo(LarkIntegration::class, 'tenant_id', 'tenant_id');
    }

    /**
     * Find by Lark User ID
     */
    public static function findByLarkUserId(string $larkUserId)
    {
        return static::where('lark_user_id', $larkUserId)->first();
    }

    /**
     * Find by Lark Union ID
     */
    public static function findByLarkUnionId(string $larkUnionId)
    {
        return static::where('lark_union_id', $larkUnionId)->first();
    }
}
