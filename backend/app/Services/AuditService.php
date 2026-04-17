<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

class AuditService
{
    /**
     * Log an action to the audit_logs table.
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
        return AuditLog::create([
            'user_id'        => $userId ?? Auth::id(),
            'action'         => $action,
            'module'         => $module,
            'record_type'    => $record ? get_class($record) : null,
            'record_id'      => $record?->getKey(),
            'request_method' => Request::method(),
            'route_path'     => Request::path(),
            'status'         => $status,
            'before_value'   => $before,
            'after_value'    => $after,
            'ip_address'     => Request::ip(),
            'user_agent'     => Request::userAgent(),
            'metadata_json'  => $metadata,
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
        $before  = array_intersect_key($originalValues, $changed);

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
            ['attempt' => 'invalid_credentials']
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
            ['required_permissions' => $requiredPermissions]
        );
    }
}
