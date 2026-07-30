<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PsProjectResource extends Model
{
    use HasFactory;

    protected $table = 'ps_project_resources';

    protected $fillable = [
        'project_plan_id',
        'role_id',
        'assigned_user_id',
        'estimated_mandays',
        'planned_start_date',
        'planned_end_date',
        'allocation_percentage',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'estimated_mandays' => 'decimal:2',
            'planned_start_date' => 'date',
            'planned_end_date' => 'date',
            'allocation_percentage' => 'integer',
        ];
    }

    public function projectPlan(): BelongsTo { return $this->belongsTo(PsProjectPlan::class, 'project_plan_id'); }
    public function role(): BelongsTo { return $this->belongsTo(PsRole::class, 'role_id'); }
    public function assignedUser(): BelongsTo { return $this->belongsTo(User::class, 'assigned_user_id'); }
}
