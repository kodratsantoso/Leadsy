<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property \Illuminate\Support\Carbon|null $email_verified_at
 * @property string $password
 * @property int|null $role_id
 * @property string|null $phone
 * @property bool $is_active
 * @property string|null $remember_token
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property int|null $tenant_id
 * @property int|null $direct_manager_id
 * @property string $target_period
 * @property numeric|null $target_revenue
 * @property string $tier_level
 * @property float $buffer_rate
 * @property numeric $target_percentage
 * @property string $target_calculation_type
 * @property string|null $title
 * @property string|null $signature_path
 * @property-read User|null $directManager
 * @property-read \Illuminate\Database\Eloquent\Collection<int, User> $directReports
 * @property-read int|null $direct_reports_count
 * @property-read \App\Models\LarkSsoUser|null $larkSsoUser
 * @property-read \Illuminate\Notifications\DatabaseNotificationCollection<int, \Illuminate\Notifications\DatabaseNotification> $notifications
 * @property-read int|null $notifications_count
 * @property-read \App\Models\Role|null $role
 * @property-read \App\Models\Tenant|null $tenant
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \Laravel\Sanctum\PersonalAccessToken> $tokens
 * @property-read int|null $tokens_count
 * @method static \Database\Factories\UserFactory factory($count = null, $state = [])
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereBufferRate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereDirectManagerId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereEmail($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereEmailVerifiedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereIsActive($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User wherePassword($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User wherePhone($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereRememberToken($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereRoleId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereSignaturePath($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereTargetCalculationType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereTargetPercentage($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereTargetPeriod($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereTargetRevenue($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereTenantId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereTierLevel($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereTitle($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name', 'email', 'password', 'role_id', 'tenant_id', 'direct_manager_id',
        'phone', 'target_period', 'target_revenue', 'target_percentage', 'target_calculation_type', 'is_active', 'tier_level', 'buffer_rate',
        'title', 'signature_path',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
            'target_revenue' => 'decimal:2',
            'target_percentage' => 'decimal:2',
            'buffer_rate' => 'float',
        ];
    }

    /* ── RBAC ── */

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function directManager(): BelongsTo
    {
        return $this->belongsTo(self::class, 'direct_manager_id');
    }

    public function directReports(): HasMany
    {
        return $this->hasMany(self::class, 'direct_manager_id');
    }

    public function larkSsoUser(): HasOne
    {
        return $this->hasOne(LarkSsoUser::class);
    }

    /**
     * Check if the user has a specific permission via their role.
     */
    public function hasPermission(string $permissionName): bool
    {
        if (! $this->role) {
            return false;
        }

        return $this->role->permissions()
            ->where('name', $permissionName)
            ->exists();
    }

    /**
     * Convenience: check role name directly.
     */
    public function hasRole(string $roleName): bool
    {
        return $this->role?->name === $roleName;
    }

    public function isSuperAdmin(): bool
    {
        return $this->hasRole('super_admin');
    }

    public function isExecutive(): bool
    {
        return $this->hasRole('executive');
    }

    public function isManagerLevel(): bool
    {
        $role = $this->role?->name ?? '';

        return str_contains($role, 'manager') ||
            str_contains($role, 'admin') ||
            str_contains($role, 'lead') ||
            $this->directReports()->exists();
    }

    public function hierarchyUserIds(): array
    {
        if ($this->isSuperAdmin() || $this->isExecutive()) {
            return [];
        }

        if (! $this->isManagerLevel()) {
            return [$this->id];
        }

        $ids = [$this->id];
        $queue = [$this->id];

        while (! empty($queue)) {
            $managerId = array_shift($queue);
            $reportIds = self::where('direct_manager_id', $managerId)->pluck('id')->all();

            foreach ($reportIds as $reportId) {
                if (! in_array($reportId, $ids, true)) {
                    $ids[] = $reportId;
                    $queue[] = $reportId;
                }
            }
        }

        return $ids;
    }

    /**
     * Cascade targets recursively down the reporting hierarchy.
     */
    public static function cascadeTargets(self $parent): void
    {
        $reports = self::where('direct_manager_id', $parent->id)->get();
        foreach ($reports as $report) {
            if ($report->target_calculation_type === 'percentage') {
                $report->target_revenue = round(($parent->target_revenue * $report->target_percentage) / 100.0, 2);
                $report->save();
            }
            self::cascadeTargets($report);
        }
    }

    /**
     * Cascade company target to all top-level managers.
     */
    public static function cascadeCompanyTarget(float $companyTarget, int $tenantId): void
    {
        $rootUsers = self::where('tenant_id', $tenantId)
            ->whereNull('direct_manager_id')
            ->get();

        foreach ($rootUsers as $user) {
            if ($user->target_calculation_type === 'percentage') {
                $user->target_revenue = round(($companyTarget * $user->target_percentage) / 100.0, 2);
                $user->save();
            }
            self::cascadeTargets($user);
        }
    }
}
