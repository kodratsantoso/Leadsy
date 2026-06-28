<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Target extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'target_amount' => 'decimal:2',
        'target_quantity' => 'integer',
        'target_percentage' => 'decimal:2',
        'target_score' => 'decimal:2',
        'target_days' => 'integer',
        'weight' => 'decimal:2',
    ];

    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_user_id');
    }

    public function directManager(): BelongsTo
    {
        return $this->belongsTo(User::class, 'direct_manager_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    public function industry(): BelongsTo
    {
        return $this->belongsTo(Industry::class, 'industry_id');
    }

    public function businessCategory(): BelongsTo
    {
        return $this->belongsTo(BusinessCategory::class, 'business_category_id');
    }

    public function parentTarget(): BelongsTo
    {
        return $this->belongsTo(Target::class, 'parent_target_id');
    }

    public function childTargets(): HasMany
    {
        return $this->hasMany(Target::class, 'parent_target_id');
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
