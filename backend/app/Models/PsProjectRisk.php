<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PsProjectRisk extends Model
{
    use HasFactory;

    protected $table = 'ps_project_risks';

    protected $fillable = [
        'project_plan_id',
        'risk_title',
        'risk_description',
        'risk_level',
        'mitigation_plan',
        'owner_id',
        'status',
        'created_by',
        'sort_order',
        'probability',
        'impact',
        'due_date',
    ];

    protected function casts(): array
    {
        return [
            'due_date' => 'date',
        ];
    }

    public function projectPlan(): BelongsTo { return $this->belongsTo(PsProjectPlan::class, 'project_plan_id'); }
    public function owner(): BelongsTo { return $this->belongsTo(User::class, 'owner_id'); }
    public function creator(): BelongsTo { return $this->belongsTo(User::class, 'created_by'); }
}
