<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeadRoleAssignment extends Model
{
    use HasFactory;

    protected $fillable = [
        'lead_id',
        'user_id',
        'role_slug',
        'contribution_percentage'
    ];

    protected $casts = [
        'contribution_percentage' => 'decimal:2',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
