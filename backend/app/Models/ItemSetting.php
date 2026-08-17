<?php
 
namespace App\Models;
 
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
 
/**
 * @property int $id
 * @property string $setting_key
 * @property array<array-key, mixed>|null $setting_value_json
 * @property bool $is_active
 * @property int|null $created_by
 * @property int|null $updated_by
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\User|null $creator
 * @property-read \App\Models\User|null $updater
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ItemSetting newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ItemSetting newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ItemSetting query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ItemSetting whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ItemSetting whereCreatedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ItemSetting whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ItemSetting whereIsActive($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ItemSetting whereSettingKey($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ItemSetting whereSettingValueJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ItemSetting whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ItemSetting whereUpdatedBy($value)
 * @mixin \Eloquent
 */
class ItemSetting extends Model
{
    protected $fillable = [
        'setting_key',
        'setting_value_json',
        'is_active',
        'created_by',
        'updated_by',
    ];
 
    protected $casts = [
        'setting_value_json' => 'array',
        'is_active' => 'boolean',
    ];
 
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
 
    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
