<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
