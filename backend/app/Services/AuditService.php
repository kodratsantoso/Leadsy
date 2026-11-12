<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\User;
use App\Services\Security\ClientTelemetryService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

class AuditService
{
    /**
     * Log an action to the audit_logs table with full security & client telemetry.
     */
    public static function log(
        string $action,
        string $module,
        ?Model $record = null,
        ?array $before = null,
        ?array $after = null,
        string $status = 'success',
        ?array $metadata = null,
        ?int $userId = null
    ): AuditLog {
        /** @var ClientTelemetryService $telemetryService */
        $telemetryService = app(ClientTelemetryService::class);
        $telemetry = $telemetryService->captureFromRequest();

        $user = $userId ? User::with('role', 'tenant')->find($userId) : Auth::user();
        if ($user && ! $user->relationLoaded('role')) {
            $user->load('role', 'tenant');
        }

        $tenantId = $user?->tenant_id ?? Auth::user()?->tenant_id;
        $tenantName = $user?->tenant?->name ?? Auth::user()?->tenant?->name;

        $riskLevel = $metadata['risk_level'] ?? $telemetryService->computeRiskLevel($action, $status);
        $eventCategory = $metadata['event_category'] ?? $telemetryService->categorizeAction($module, $action);

        return AuditLog::create([
            'tenant_id' => $tenantId,
            'tenant_name' => $tenantName,
            'user_id' => $user?->id ?? $userId ?? Auth::id(),
            'actor_name' => $user?->name,
            'actor_email' => $user?->email,
            'actor_role' => $user?->role?->name ?? ($user?->is_super_admin ? 'super_admin' : null),
            'action' => $action,
            'module' => $module,
            'event_category' => $eventCategory,
            'record_type' => $record ? get_class($record) : null,
            'record_id' => $record?->getKey(),
            'request_method' => Request::method(),
            'route_path' => Request::path(),
            'status' => $status,
            'risk_level' => $riskLevel,
            'before_value' => $before,
            'after_value' => $after,
            'ip_address' => $telemetry['ip_address'],
            'user_agent' => $telemetry['user_agent'],
            'city' => $telemetry['city'],
            'country_code' => $telemetry['country_code'],
            'country_name' => $telemetry['country_name'],
            'region' => $telemetry['region'],
            'device_type' => $telemetry['device_type'],
            'browser' => $telemetry['browser'],
            'os' => $telemetry['os'],
            'metadata_json' => $metadata,
        ]);
    }

    /**
     * Convenience: log a model creation.
     */
    public static function logCreated(string $module, Model $record): AuditLog
    {
        return self::log('created', $module, $record, null, $record->toArray());
    }

    /**
     * Convenience: log a model update (captures before/after diff).
     */
    public static function logUpdated(string $module, Model $record, array $originalValues): AuditLog
    {
        $changed = $record->getChanges();
        $before = array_intersect_key($originalValues, $changed);

        return self::log('updated', $module, $record, $before, $changed);
    }

    /**
     * Convenience: log a model deletion.
     */
    public static function logDeleted(string $module, Model $record): AuditLog
    {
        return self::log('deleted', $module, $record, $record->toArray(), null);
    }

    /**
     * Convenience: log failed login attempt.
     */
    public static function logFailedLogin(string $email): AuditLog
    {
        return self::log(
            'login_failed',
            'auth',
            null,
            null,
            ['email' => $email],
            'failed',
            ['attempt' => 'invalid_credentials', 'risk_level' => 'critical']
        );
    }

    /**
     * Convenience: log unauthorized access denied.
     */
    public static function logAccessDenied(string $module, array $requiredPermissions): AuditLog
    {
        return self::log(
            'access_denied',
            $module,
            null,
            null,
            null,
            'denied',
            ['required_permissions' => $requiredPermissions, 'risk_level' => 'critical']
        );
    }

    /**
     * Convenience: log session termination / forced logout.
     */
    public static function logSessionTerminated(int $targetUserId, string $targetEmail, ?string $reason = null): AuditLog
    {
        return self::log(
            'session_terminated',
            'security',
            null,
            null,
            ['target_user_id' => $targetUserId, 'target_email' => $targetEmail, 'reason' => $reason ?? 'Terminated by administrator'],
            'success',
            ['risk_level' => 'critical', 'event_category' => 'security_auth']
        );
    }

    /**
     * Convenience: log idle sessions purge.
     */
    public static function logIdleSessionsPurged(int $count, int $tenantId): AuditLog
    {
        return self::log(
            'idle_sessions_purged',
            'security',
            null,
            null,
            ['purged_sessions_count' => $count, 'tenant_id' => $tenantId],
            'success',
            ['risk_level' => 'critical', 'event_category' => 'security_auth']
        );
    }
}
