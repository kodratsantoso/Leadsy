<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $tenant_id
 * @property string $bank_name
 * @property string $account_number
 * @property string $account_name
 * @property string|null $currency
 * @property bool $is_default
 * @property bool $is_active
 * @property string|null $notes
 * @property int|null $created_by
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\User|null $creator
 * @property-read \App\Models\Tenant|null $tenant
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CompanyBankAccount newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CompanyBankAccount newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CompanyBankAccount query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CompanyBankAccount whereAccountName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CompanyBankAccount whereAccountNumber($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CompanyBankAccount whereBankName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CompanyBankAccount whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CompanyBankAccount whereCreatedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CompanyBankAccount whereCurrency($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CompanyBankAccount whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CompanyBankAccount whereIsActive($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CompanyBankAccount whereIsDefault($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CompanyBankAccount whereNotes($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CompanyBankAccount whereTenantId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|CompanyBankAccount whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class CompanyBankAccount extends Model
{
    protected $fillable = [
        'tenant_id',
        'bank_name',
        'account_number',
        'account_name',
        'currency',
        'is_default',
        'is_active',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'is_default' => 'boolean',
        'is_active' => 'boolean',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
