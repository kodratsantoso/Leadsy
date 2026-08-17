<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $product_id
 * @property string $source_url
 * @property string $status
 * @property string|null $raw_html_text
 * @property string|null $cleaned_text
 * @property array<array-key, mixed>|null $scrape_summary_json
 * @property string|null $error_message
 * @property \Illuminate\Support\Carbon|null $scraped_at
 * @property int|null $created_by
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\User|null $createdBy
 * @property-read \App\Models\Product $product
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductScrapeRun newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductScrapeRun newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductScrapeRun query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductScrapeRun whereCleanedText($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductScrapeRun whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductScrapeRun whereCreatedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductScrapeRun whereErrorMessage($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductScrapeRun whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductScrapeRun whereProductId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductScrapeRun whereRawHtmlText($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductScrapeRun whereScrapeSummaryJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductScrapeRun whereScrapedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductScrapeRun whereSourceUrl($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductScrapeRun whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|ProductScrapeRun whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class ProductScrapeRun extends Model
{
    protected $fillable = [
        'product_id', 'source_url', 'status',
        'raw_html_text', 'cleaned_text', 'scrape_summary_json',
        'error_message', 'scraped_at', 'created_by',
    ];

    protected $casts = [
        'scrape_summary_json' => 'array',
        'scraped_at' => 'datetime',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
