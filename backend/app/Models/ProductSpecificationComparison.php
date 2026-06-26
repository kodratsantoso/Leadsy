<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProductSpecificationComparison extends Model
{
    protected $fillable = [
        'product_id', 'scrape_run_id', 'previous_snapshot_json',
        'latest_snapshot_json', 'comparison_result_json', 'update_recommendation_json',
        'confidence_score', 'status', 'reviewed_by', 'reviewed_at',
    ];

    protected $casts = [
        'previous_snapshot_json' => 'array',
        'latest_snapshot_json' => 'array',
        'comparison_result_json' => 'array',
        'update_recommendation_json' => 'array',
        'confidence_score' => 'integer',
        'reviewed_at' => 'datetime',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function scrapeRun(): BelongsTo
    {
        return $this->belongsTo(ProductScrapeRun::class, 'scrape_run_id');
    }

    public function reviewedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function updateSuggestions(): HasMany
    {
        return $this->hasMany(ProductUpdateSuggestion::class, 'comparison_id');
    }
}
