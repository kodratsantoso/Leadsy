<?php

namespace App\Services;

use App\Services\AI\AiOrchestrationService;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Smalot\PdfParser\Parser as PdfParser;

/**
 * Generates full product metadata from three possible sources:
 *   1. Product name only (existing)
 *   2. Reference URL — fetches website content, AI analyses it
 *   3. PDF one-pager — extracts text from PDF, AI analyses it
 *
 * Category selection is constrained to the provided list from the database.
 * Feature route: product_metadata_generation (configure in Settings → AI Defaults)
 */
class ProductMetadataGenerationService
{
    const MAX_CONTENT_CHARS = 6000;

    public function __construct(private AiOrchestrationService $ai) {}

    /* ══════════════════════════════════════════════════════════════════
     * PUBLIC API
     * ══════════════════════════════════════════════════════════════════ */

    /**
     * Generate from product name only (original behaviour).
     */
    public function generate(string $productName, array $availableCategories): array
    {
        $prompt = $this->buildNamePrompt($productName, $availableCategories);
        return $this->callAi($prompt, ['product_name' => $productName]);
    }

    /**
     * Generate by fetching and analysing a reference URL.
     *
     * @return array{success: bool, data?: array, ai_model?: string|null, error?: string}
     */
    public function generateFromUrl(string $url, string $productName, array $availableCategories): array
    {
        $content = $this->fetchUrlContent($url);

        if ($content === null) {
            return ['success' => false, 'error' => "Unable to fetch content from URL: {$url}"];
        }

        if (strlen(trim($content)) < 100) {
            return ['success' => false, 'error' => 'The URL returned too little readable content for analysis.'];
        }

        $prompt = $this->buildContentPrompt($content, $url, $productName, $availableCategories, 'website');
        return $this->callAi($prompt, ['product_name' => $productName, 'source_url' => $url]);
    }

    /**
     * Generate by extracting text from an uploaded PDF file.
     *
     * @param  string  $pdfPath  Absolute path to the temporary uploaded file
     * @return array{success: bool, data?: array, ai_model?: string|null, error?: string}
     */
    public function generateFromPdf(string $pdfPath, string $productName, array $availableCategories): array
    {
        $content = $this->extractPdfText($pdfPath);

        if ($content === null) {
            return ['success' => false, 'error' => 'Unable to extract text from the PDF. Ensure the file is not scanned-only or password-protected.'];
        }

        if (strlen(trim($content)) < 100) {
            return ['success' => false, 'error' => 'The PDF contains too little readable text for analysis. Scanned/image-only PDFs are not supported.'];
        }

        $prompt = $this->buildContentPrompt($content, null, $productName, $availableCategories, 'pdf');
        return $this->callAi($prompt, ['product_name' => $productName, 'source' => 'pdf']);
    }

    /* ══════════════════════════════════════════════════════════════════
     * CONTENT EXTRACTION
     * ══════════════════════════════════════════════════════════════════ */

    private function fetchUrlContent(string $url): ?string
    {
        try {
            $response = Http::timeout(15)
                ->withHeaders(['User-Agent' => 'Mozilla/5.0 (compatible; LeadsyBot/1.0)'])
                ->get($url);

            if (! $response->successful()) {
                Log::warning('[ProductMetadataGen] URL fetch failed', ['url' => $url, 'status' => $response->status()]);
                return null;
            }

            $html = $response->body();
            return $this->extractTextFromHtml($html);
        } catch (ConnectionException $e) {
            Log::warning('[ProductMetadataGen] URL connection error', ['url' => $url, 'error' => $e->getMessage()]);
            return null;
        } catch (\Throwable $e) {
            Log::warning('[ProductMetadataGen] URL fetch exception', ['url' => $url, 'error' => $e->getMessage()]);
            return null;
        }
    }

    private function extractTextFromHtml(string $html): string
    {
        // Remove scripts, styles, and hidden elements
        $html = preg_replace('/<(script|style|noscript|iframe)[^>]*>.*?<\/\1>/is', '', $html);
        $html = preg_replace('/<!--.*?-->/s', '', $html);

        // Extract meta description for extra context
        $metaDesc = '';
        if (preg_match('/<meta[^>]+name=["\']description["\'][^>]+content=["\'](.*?)["\']/i', $html, $m)) {
            $metaDesc = $m[1] . "\n\n";
        }

        // Strip remaining tags and decode entities
        $text = strip_tags($html);
        $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');

        // Collapse whitespace
        $text = preg_replace('/[ \t]+/', ' ', $text);
        $text = preg_replace('/\n{3,}/', "\n\n", $text);
        $text = trim($metaDesc . $text);

        return mb_substr($text, 0, self::MAX_CONTENT_CHARS);
    }

    private function extractPdfText(string $path): ?string
    {
        try {
            $parser = new PdfParser();
            $pdf    = $parser->parseFile($path);
            $text   = $pdf->getText();

            if (empty(trim($text))) {
                return null;
            }

            // Collapse excess whitespace
            $text = preg_replace('/[ \t]+/', ' ', $text);
            $text = preg_replace('/\n{3,}/', "\n\n", $text);

            return mb_substr(trim($text), 0, self::MAX_CONTENT_CHARS);
        } catch (\Throwable $e) {
            Log::warning('[ProductMetadataGen] PDF parse error', ['path' => $path, 'error' => $e->getMessage()]);
            return null;
        }
    }

    /* ══════════════════════════════════════════════════════════════════
     * PROMPTS
     * ══════════════════════════════════════════════════════════════════ */

    private function buildNamePrompt(string $productName, array $availableCategories): string
    {
        $categoriesJson = json_encode(array_values($availableCategories), JSON_UNESCAPED_UNICODE);

        return <<<PROMPT
You are a B2B product metadata expert for an Indonesian sales intelligence platform.

## TASK
Generate complete product metadata for the following product name.

## PRODUCT NAME
{$productName}

## AVAILABLE CATEGORIES (you MUST choose from this list only)
{$categoriesJson}

## CONTEXT
- Platform target market: Indonesia B2B (manufacturing, retail, tech, finance, logistics, etc.)
- Output language: English
- Be specific and actionable — not vague

{$this->outputFormatInstructions()}
PROMPT;
    }

    private function buildContentPrompt(
        string $content,
        ?string $url,
        string $productName,
        array $availableCategories,
        string $sourceType
    ): string {
        $categoriesJson = json_encode(array_values($availableCategories), JSON_UNESCAPED_UNICODE);
        $sourceLabel    = $sourceType === 'pdf' ? 'Product One-Pager (PDF)' : "Website ({$url})";
        $nameHint       = $productName ? "\n## PRODUCT NAME HINT\n{$productName}\n" : '';

        return <<<PROMPT
You are a B2B product metadata expert for an Indonesian sales intelligence platform.

## TASK
Analyse the following product content and extract complete product metadata.
{$nameHint}
## SOURCE
{$sourceLabel}

## PRODUCT CONTENT
{$content}

## AVAILABLE CATEGORIES (you MUST choose from this list only)
{$categoriesJson}

## CONTEXT
- Platform target market: Indonesia B2B (manufacturing, retail, tech, finance, logistics, etc.)
- Output language: English
- Extract real information from the content — do not invent details not present
- If a field cannot be determined from the content, use a reasonable inference and note the uncertainty

{$this->outputFormatInstructions()}
PROMPT;
    }

    private function outputFormatInstructions(): string
    {
        return <<<'INSTRUCTIONS'
## OUTPUT FORMAT
Return ONLY valid JSON — no markdown, no code fences, no extra text:
{
  "description": "2-3 sentence product description explaining what it does and who it helps",
  "categories": ["Category from available list", "Another if applicable"],
  "target_industries": ["Industry 1", "Industry 2"],
  "company_size": "e.g. 51-200, 201-500 employees",
  "buyer_persona": ["Title 1", "Title 2", "Title 3"],
  "budget_range": "e.g. IDR 50M - 500M / year",
  "regions": ["Indonesia", "Malaysia"],
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "pain_points": ["Specific pain point 1", "Specific pain point 2", "Specific pain point 3"],
  "use_cases": ["Use case 1", "Use case 2", "Use case 3"],
  "competitor_context": "Brief description of key competitors and our differentiation",
  "ideal_company_profile": "Concise description of the ideal target company"
}
INSTRUCTIONS;
    }

    /* ══════════════════════════════════════════════════════════════════
     * AI CALL + NORMALISATION
     * ══════════════════════════════════════════════════════════════════ */

    private function callAi(string $prompt, array $context = []): array
    {
        $result = $this->ai->call('product_metadata_generation', $prompt, array_merge([
            'entity_type' => 'product_metadata',
            'entity_id'   => md5($context['product_name'] ?? $prompt),
        ], $context));

        if (! $result['success'] || empty($result['content'])) {
            Log::warning('[ProductMetadataGen] AI call failed', [
                'context' => $context,
                'error'   => $result['error'] ?? 'unknown',
            ]);
            return ['success' => false, 'error' => $result['error'] ?? 'AI call failed'];
        }

        $raw    = preg_replace('/^```(?:json)?\s*|\s*```$/s', '', trim($result['content']));
        $parsed = json_decode($raw, true);

        if (! is_array($parsed)) {
            Log::warning('[ProductMetadataGen] AI returned invalid JSON', [
                'context' => $context,
                'raw'     => substr($result['content'], 0, 300),
            ]);
            return ['success' => false, 'error' => 'AI returned invalid JSON — please retry'];
        }

        return [
            'success'  => true,
            'data'     => $this->normalise($parsed),
            'ai_model' => $result['model'] ?? null,
        ];
    }

    private function normalise(array $raw): array
    {
        $painPoints = $raw['pain_points'] ?? '';
        if (is_array($painPoints)) {
            $painPoints = implode("\n", $painPoints);
        }

        return [
            'description'           => (string) ($raw['description'] ?? ''),
            'category'              => implode(', ', array_map('strval', (array) ($raw['categories'] ?? []))),
            'target_industry'       => implode(', ', array_map('strval', (array) ($raw['target_industries'] ?? []))),
            'target_company_size'   => (string) ($raw['company_size'] ?? ''),
            'target_buyer_persona'  => implode(', ', array_map('strval', (array) ($raw['buyer_persona'] ?? []))),
            'budget_range'          => (string) ($raw['budget_range'] ?? ''),
            'supported_regions'     => implode(', ', array_map('strval', (array) ($raw['regions'] ?? []))),
            'keywords'              => array_map('strval', (array) ($raw['keywords'] ?? [])),
            'target_pain_points'    => (string) $painPoints,
            'use_cases'             => array_map('strval', (array) ($raw['use_cases'] ?? [])),
            'competitor_notes'      => (string) ($raw['competitor_context'] ?? ''),
            'ideal_company_profile' => (string) ($raw['ideal_company_profile'] ?? ''),
        ];
    }
}
