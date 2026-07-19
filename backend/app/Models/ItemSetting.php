<?php
 
namespace App\Models;
 
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
 
class ItemSetting extends Model
{
    protected $fillable = [
        'setting_key',
        'setting_value_json',
        'is_active',
        'created_by',
        'updated_by',
    ];
 
    protected $casts = [
        'setting_value_json' => 'array',
        'is_active' => 'boolean',
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
