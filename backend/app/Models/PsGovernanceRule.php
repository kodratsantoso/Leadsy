<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property string $rule_name
 * @property string $rule_type
 * @property numeric|null $threshold_value
 * @property int|null $applies_to_service_category_id
 * @property int|null $approver_role_id
 * @property bool $is_active
 * @property int|null $created_by
 * @property int|null $updated_by
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\PsServiceCategory|null $serviceCategory
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsGovernanceRule newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsGovernanceRule newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsGovernanceRule query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsGovernanceRule whereAppliesToServiceCategoryId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsGovernanceRule whereApproverRoleId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsGovernanceRule whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsGovernanceRule whereCreatedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsGovernanceRule whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsGovernanceRule whereIsActive($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsGovernanceRule whereRuleName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsGovernanceRule whereRuleType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsGovernanceRule whereThresholdValue($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsGovernanceRule whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsGovernanceRule whereUpdatedBy($value)
 * @mixin \Eloquent
 */
class PsGovernanceRule extends Model
{
    use HasFactory;

    protected $table = 'ps_governance_rules';

    protected $fillable = [
        'rule_name',
        'rule_type',
        'threshold_value',
        'applies_to_service_category_id',
        'approver_role_id',
        'is_active',
        'created_by',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'threshold_value' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    public function serviceCategory(): BelongsTo
    {
        return $this->belongsTo(PsServiceCategory::class, 'applies_to_service_category_id');
    }
}
