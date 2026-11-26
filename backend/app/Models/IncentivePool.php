<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class IncentivePool extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'incentive_pools';

    protected $fillable = [
        'tenant_id',
        'policy_id',
        'lead_id',
        'sales_order_id',
        'commercial_invoice_id',
        'pool_code',
        'period_type',
        'period_key',
        'revenue_stream',
        'eligible_revenue',
        'pool_rate_applied',
        'total_pool_amount',
        'direct_pool_amount',
        'indirect_pool_amount',
        'shared_pool_amount',
        'status',
        'approved_dept_by',
        'approved_dept_at',
        'approved_finance_by',
        'approved_finance_at',
        'notes',
        'calculation_snapshot_json',
    ];

    protected $casts = [
        'eligible_revenue' => 'decimal:2',
        'pool_rate_applied' => 'decimal:2',
        'total_pool_amount' => 'decimal:2',
        'direct_pool_amount' => 'decimal:2',
        'indirect_pool_amount' => 'decimal:2',
        'shared_pool_amount' => 'decimal:2',
        'calculation_snapshot_json' => 'array',
        'approved_dept_at' => 'datetime',
        'approved_finance_at' => 'datetime',
    ];

    public function policy(): BelongsTo
    {
        return $this->belongsTo(IncentivePolicy::class, 'policy_id');
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class, 'lead_id');
    }

    public function salesOrder(): BelongsTo
    {
        return $this->belongsTo(LeadSalesOrder::class, 'sales_order_id');
    }

    public function commercialInvoice(): BelongsTo
    {
        return $this->belongsTo(CommercialInvoice::class, 'commercial_invoice_id');
    }

    public function contributors(): HasMany
    {
        return $this->hasMany(IncentiveContributor::class, 'pool_id');
    }

    public function deptApprover(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_dept_by');
    }

    public function financeApprover(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_finance_by');
    }
}
