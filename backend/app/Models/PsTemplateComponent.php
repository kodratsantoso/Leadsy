<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PsTemplateComponent extends Model
{
    use HasFactory;

    protected $table = 'ps_template_components';

    protected $fillable = [
        'template_id',
        'role_id',
        'task_name',
        'description',
        'base_mandays',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'base_mandays' => 'decimal:2',
            'sort_order' => 'integer',
        ];
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(PsEstimationTemplate::class, 'template_id');
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(PsRole::class, 'role_id');
    }
}
