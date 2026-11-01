<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int|null $tenant_id
 * @property string $document_type
 * @property string $prefix
 * @property string $format
 * @property int $counter_digits
 * @property int $current_counter
 * @property string $reset_frequency
 * @property \Illuminate\Support\Carbon|null $last_reset_date
 * @property string|null $description
 * @property bool $is_active
 * @property int|null $created_by
 * @property int|null $updated_by
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\Tenant|null $tenant
 * @property-read \App\Models\User|null $creator
 * @property-read \App\Models\User|null $updater
 */
class DocumentNumberSequence extends Model
{
    use HasFactory;

    protected $table = 'document_number_sequences';

    protected $fillable = [
        'tenant_id',
        'document_type',
        'prefix',
        'format',
        'counter_digits',
        'current_counter',
        'reset_frequency',
        'last_reset_date',
        'description',
        'is_active',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'counter_digits' => 'integer',
        'current_counter' => 'integer',
        'last_reset_date' => 'date',
        'is_active' => 'boolean',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
