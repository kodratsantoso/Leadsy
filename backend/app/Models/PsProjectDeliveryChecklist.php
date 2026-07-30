<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PsProjectDeliveryChecklist extends Model
{
    use HasFactory;

    protected $table = 'ps_project_delivery_checklists';

    protected $fillable = [
        'project_plan_id',
        'checklist_type',
        'planned_start_date',
        'planned_end_date',
        'owner_id',
        'scope_notes',
        'checklist_items',
        'status',
        'general_notes',
        'actual_start_date',
        'actual_end_date',
        'issues_count',
        'sign_off_status',
        'sign_off_document_id',
        'customer_pic',
    ];

    protected function casts(): array
    {
        return [
            'planned_start_date' => 'date',
            'planned_end_date' => 'date',
            'checklist_items' => 'array',
            'actual_start_date' => 'date',
            'actual_end_date' => 'date',
            'sign_off_status' => 'boolean',
        ];
    }

    public function projectPlan(): BelongsTo { return $this->belongsTo(PsProjectPlan::class, 'project_plan_id'); }
    public function owner(): BelongsTo { return $this->belongsTo(User::class, 'owner_id'); }
    public function signOffDocument(): BelongsTo { return $this->belongsTo(PsDocument::class, 'sign_off_document_id'); }
}
