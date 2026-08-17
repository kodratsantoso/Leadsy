<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string $rule_type
 * @property string|null $rule_key
 * @property string|null $rule_value
 * @property bool $enabled
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappSyncRule newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappSyncRule newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappSyncRule query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappSyncRule whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappSyncRule whereEnabled($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappSyncRule whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappSyncRule whereRuleKey($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappSyncRule whereRuleType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappSyncRule whereRuleValue($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappSyncRule whereUpdatedAt($value)
 * @mixin \Eloquent
 */
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
