<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeadOfficeLocation extends Model
{
    use HasFactory;
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'lead_id',
        'location_type',
        'label',
        'address',
        'city',
        'province',
        'country',
        'lat',
        'lng',
        'source',
        'is_primary',
    ];

    protected $casts = [
        'lat' => 'float',
        'lng' => 'float',
        'is_primary' => 'boolean',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }
}
