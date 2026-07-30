<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
