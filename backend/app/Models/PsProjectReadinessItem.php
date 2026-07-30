<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PsProjectReadinessItem extends Model
{
    use HasFactory;

    protected $table = 'ps_project_readiness_items';

    protected $fillable = [
        'project_plan_id',
        'item_name',
        'is_required',
        'is_completed',
        'override_reason',
        'overridden_by',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'is_required' => 'boolean',
            'is_completed' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function projectPlan(): BelongsTo { return $this->belongsTo(PsProjectPlan::class, 'project_plan_id'); }
    public function overrider(): BelongsTo { return $this->belongsTo(User::class, 'overridden_by'); }
}
