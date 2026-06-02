<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name', 'email', 'password', 'role_id', 'tenant_id', 'direct_manager_id',
        'phone', 'target_period', 'target_revenue', 'target_percentage', 'target_calculation_type', 'is_active', 'tier_level', 'buffer_rate',
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
        if ($this->isSuperAdmin()) {
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
