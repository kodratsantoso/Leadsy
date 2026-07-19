<?php
 
namespace App\Models;
 
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
 
class WithholdingTaxCode extends Model
{
    protected $fillable = [
        'wht_code',
        'wht_name',
        'wht_type',
        'rate_percentage',
        'description',
        'country',
        'is_default',
        'is_active',
        'effective_from',
        'effective_until',
        'created_by',
        'updated_by',
    ];
 
    protected $casts = [
        'rate_percentage' => 'decimal:2',
        'is_default' => 'boolean',
        'is_active' => 'boolean',
        'effective_from' => 'date',
        'effective_until' => 'date',
    ];
 
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
 
    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
