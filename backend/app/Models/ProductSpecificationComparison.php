<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property int $product_id
 * @property int|null $scrape_run_id
 * @property array<array-key, mixed>|null $previous_snapshot_json
 * @property array<array-key, mixed>|null $latest_snapshot_json
 * @property array<array-key, mixed>|null $comparison_result_json
 * @property array<array-key, mixed>|null $update_recommendation_json
 * @property int|null $confidence_score
 * @property string $status
 * @property int|null $reviewed_by
 * @property \Illuminate\Support\Carbon|null $reviewed_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\Product $product
 * @property-read \App\Models\User|null $reviewedBy
 * @property-read \App\Models\ProductScrapeRun|null $scrapeRun
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\ProductUpdateSuggestion> $updateSuggestions
 * @property-read int|null $update_suggestions_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductSpecificationComparison newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductSpecificationComparison newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductSpecificationComparison query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductSpecificationComparison whereComparisonResultJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductSpecificationComparison whereConfidenceScore($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductSpecificationComparison whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductSpecificationComparison whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductSpecificationComparison whereLatestSnapshotJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductSpecificationComparison wherePreviousSnapshotJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductSpecificationComparison whereProductId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductSpecificationComparison whereReviewedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductSpecificationComparison whereReviewedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductSpecificationComparison whereScrapeRunId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductSpecificationComparison whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductSpecificationComparison whereUpdateRecommendationJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductSpecificationComparison whereUpdatedAt($value)
 * @mixin \Eloquent
 */
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
