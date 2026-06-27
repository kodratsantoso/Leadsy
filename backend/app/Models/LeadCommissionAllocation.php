<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LeadCommissionAllocation extends Model
{
    protected $fillable = [
        'lead_id', 'order_id', 'user_id', 'role_type',
        'contribution_percentage', 'revenue_basis', 'commission_rate',
        'calculated_commission_amount', 'commission_status',
        'calculation_snapshot_json'
    ];

    protected $casts = [
        'contribution_percentage' => 'decimal:2',
        'revenue_basis' => 'decimal:2',
        'commission_rate' => 'decimal:2',
        'calculated_commission_amount' => 'decimal:2',
        'calculation_snapshot_json' => 'array',
    ];

    public function lead()
    {
        return $this->belongsTo(Lead::class);
    }

    public function order()
    {
        return $this->belongsTo(LeadSalesOrder::class, 'order_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
