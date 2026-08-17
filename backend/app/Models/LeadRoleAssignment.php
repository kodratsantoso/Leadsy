<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $lead_id
 * @property int $user_id
 * @property string $role_type
 * @property numeric $contribution_percentage
 * @property string $assignment_status
 * @property int|null $assigned_by
 * @property \Illuminate\Support\Carbon $assigned_at
 * @property \Illuminate\Support\Carbon|null $removed_at
 * @property string|null $notes
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\User|null $assignedBy
 * @property-read \App\Models\Lead|null $lead
 * @property-read \App\Models\User $user
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadRoleAssignment newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadRoleAssignment newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadRoleAssignment query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadRoleAssignment whereAssignedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadRoleAssignment whereAssignedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadRoleAssignment whereAssignmentStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadRoleAssignment whereContributionPercentage($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadRoleAssignment whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadRoleAssignment whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadRoleAssignment whereLeadId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadRoleAssignment whereNotes($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadRoleAssignment whereRemovedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadRoleAssignment whereRoleType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadRoleAssignment whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadRoleAssignment whereUserId($value)
 * @mixin \Eloquent
 */
class LeadRoleAssignment extends Model
{
    use HasFactory;

    protected $fillable = [
        'lead_id',
        'user_id',
        'role_type',
        'contribution_percentage',
        'assignment_status',
        'assigned_by',
        'assigned_at',
        'removed_at',
        'notes',
    ];

    protected $casts = [
        'contribution_percentage' => 'decimal:2',
        'assigned_at' => 'datetime',
        'removed_at' => 'datetime',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
    
    public function assignedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }
}
