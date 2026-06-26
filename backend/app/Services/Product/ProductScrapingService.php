<?php

namespace App\Services\Product;

use App\Models\Product;
use App\Models\ProductScrapeRun;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;

class ProductScrapingService
{
    /**
     * Run a scrape job for a product's configured website.
     * 
     * @param Product $product
     * @param int|null $userId
     * @return ProductScrapeRun
     * @throws Exception
     */
    public function scrapeProductWebsite(Product $product, ?int $userId = null): ProductScrapeRun
    {
        if (empty($product->website_url)) {
            throw new Exception("Product does not have a configured website URL to scrape.");
        }

        $run = ProductScrapeRun::create([
            'product_id' => $product->id,
            'source_url' => $product->website_url,
            'status' => 'running',
            'created_by' => $userId,
        ]);

        try {
            // Very simple HTTP scrape (In a real app, maybe use Puppeteer/Browsershot for JS rendered sites)
            $response = Http::timeout(30)->get($product->website_url);
            
            if (!$response->successful()) {
                throw new Exception("HTTP request failed with status: " . $response->status());
            }

            $html = $response->body();
            $cleanedText = $this->cleanHtmlToText($html);

            $run->update([
                'status' => 'success',
                'raw_html_text' => $html,
                'cleaned_text' => $cleanedText,
                'scraped_at' => now(),
                'scrape_summary_json' => [
                    'length' => strlen($cleanedText),
                    'title' => $this->extractTitle($html),
                ],
            ]);

        } catch (Exception $e) {
            Log::error("Product scrape failed: " . $e->getMessage());
            $run->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
            ]);
            throw $e;
        }

        return $run;
    }

    private function cleanHtmlToText(string $html): string
    {
        // Strip out scripts and styles
        $html = preg_replace('/<script\b[^>]*>(.*?)<\/script>/is', '', $html);
        $html = preg_replace('/<style\b[^>]*>(.*?)<\/style>/is', '', $html);
        
        // Strip tags
        $text = strip_tags($html);
        
        // Collapse multiple whitespace
        $text = preg_replace('/\s+/', ' ', $text);
        
        return trim($text);
    }

    private function extractTitle(string $html): ?string
    {
        if (preg_match('/<title[^>]*>(.*?)<\/title>/is', $html, $matches)) {
            return trim($matches[1]);
        }
        return null;
    }
}
