<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PsBastDocument extends Model
{
    use HasFactory;

    protected $fillable = [
        'bast_number',
        'project_plan_id',
        'lead_id',
        'customer_name_snapshot',
        'project_name',
        'completion_summary',
        'delivered_scope',
        'pending_items',
        'acceptance_date',
        'customer_signer',
        'internal_signer',
        'status',
        'document_id',
    ];

    public function projectPlan()
    {
        return $this->belongsTo(PsProjectPlan::class, 'project_plan_id');
    }

    public function document()
    {
        return $this->belongsTo(PsDocument::class, 'document_id');
    }
}
