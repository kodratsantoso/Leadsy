<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property string $name
 * @property string $slug
 * @property string $status
 * @property array<array-key, mixed>|null $metadata
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 * @property string|null $legal_name
 * @property string|null $brand_name
 * @property string|null $logo_path
 * @property string|null $address
 * @property string|null $tax_number
 * @property string|null $signatory_name
 * @property string|null $signatory_position
 * @property string|null $signatory_image_path
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\AuditLog> $auditLogs
 * @property-read int|null $audit_logs_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\CompanyBankAccount> $bankAccounts
 * @property-read int|null $bank_accounts_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\IntegrationConnection> $integrationConnections
 * @property-read int|null $integration_connections_count
 * @property-read \App\Models\LarkIntegration|null $larkIntegration
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Lead> $leads
 * @property-read int|null $leads_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\User> $users
 * @property-read int|null $users_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Tenant newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Tenant newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Tenant onlyTrashed()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Tenant query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Tenant whereAddress($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Tenant whereBrandName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Tenant whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Tenant whereDeletedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Tenant whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Tenant whereLegalName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Tenant whereLogoPath($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Tenant whereMetadata($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Tenant whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Tenant whereSignatoryImagePath($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Tenant whereSignatoryName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Tenant whereSignatoryPosition($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Tenant whereSlug($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Tenant whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Tenant whereTaxNumber($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Tenant whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Tenant withTrashed(bool $withTrashed = true)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Tenant withoutTrashed()
 * @mixin \Eloquent
 */
class Tenant extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'name', 'slug', 'status', 'metadata',
        'legal_name', 'brand_name', 'logo_path', 'address', 'tax_number',
        'signatory_name', 'signatory_position', 'signatory_image_path',
    ];

    protected $casts = [
        'metadata' => 'array',
    ];

    public function bankAccounts(): HasMany
    {
        return $this->hasMany(CompanyBankAccount::class);
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function leads(): HasMany
    {
        return $this->hasMany(Lead::class);
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class);
    }

    public function larkIntegration(): HasOne
    {
        return $this->hasOne(LarkIntegration::class);
    }

    public function integrationConnections(): HasMany
    {
        return $this->hasMany(IntegrationConnection::class);
    }
}
