<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $product_id
 * @property array<array-key, mixed> $questions
 * @property bool $ai_generated
 * @property string|null $ai_model
 * @property int|null $updated_by
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\User|null $editor
 * @property-read \App\Models\Product $product
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductQuestion newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductQuestion newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductQuestion query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductQuestion whereAiGenerated($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductQuestion whereAiModel($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductQuestion whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductQuestion whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductQuestion whereProductId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductQuestion whereQuestions($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductQuestion whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductQuestion whereUpdatedBy($value)
 * @mixin \Eloquent
 */
class ProductQuestion extends Model
{
    protected $fillable = [
        'product_id',
        'questions',
        'ai_generated',
        'ai_model',
        'updated_by',
    ];

    protected $casts = [
        'questions' => 'array',
        'ai_generated' => 'boolean',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function editor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
