<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TenantSsoConfig extends Model
{
    protected $table = 'tenant_sso_configs';

    protected $fillable = [
        'tenant_id',
        'provider',
        'display_name',
        'client_id',
        'client_secret_encrypted',
        'issuer_url',
        'sso_login_url',
        'entity_id',
        'domain_whitelist',
        'role_mapping_rules',
        'is_active',
        'auto_provision_users',
    ];

    protected $casts = [
        'domain_whitelist' => 'array',
        'role_mapping_rules' => 'array',
        'is_active' => 'boolean',
        'auto_provision_users' => 'boolean',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
