<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
