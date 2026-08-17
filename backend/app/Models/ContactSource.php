<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string $name
 * @property bool $is_active
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ContactSource newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ContactSource newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ContactSource query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ContactSource whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ContactSource whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ContactSource whereIsActive($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ContactSource whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ContactSource whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class ContactSource extends Model
{
    protected $fillable = ['name', 'is_active'];

    protected $casts = ['is_active' => 'boolean'];
}
