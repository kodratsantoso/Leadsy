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
        return $this->callAi($prompt, [
            'product_name' => $productName,
            'available_categories' => $availableCategories,
        ]);
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
        return $this->callAi($prompt, [
            'product_name' => $productName,
            'source_url' => $url,
            'available_categories' => $availableCategories,
        ]);
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
        return $this->callAi($prompt, [
            'product_name' => $productName,
            'source' => 'pdf',
            'available_categories' => $availableCategories,
        ]);
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
- Every field must be filled. Use a reasonable inference when the product name alone is not enough.

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
- Combine the product name hint and source content into complementary metadata
- Every field must be filled. If a field cannot be determined from the content, use a reasonable inference and note the uncertainty

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

All array fields must contain at least three concise items when possible.
All string fields must be non-empty.
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
            'data'     => $this->normalise(
                $parsed,
                $context['product_name'] ?? '',
                $context['available_categories'] ?? [],
            ),
            'ai_model' => $result['model'] ?? null,
        ];
    }

    private function normalise(array $raw, string $productName = '', array $availableCategories = []): array
    {
        $data = [
            'description'           => $this->toText($raw['description'] ?? $raw['product_description'] ?? $raw['product_summary'] ?? $raw['solution_summary'] ?? $raw['summary'] ?? $raw['overview'] ?? $raw['product_overview'] ?? $raw['value_proposition'] ?? ''),
            'category'              => implode(', ', $this->toList($raw['categories'] ?? $raw['category'] ?? [])),
            'target_industry'       => implode(', ', $this->toList($raw['target_industries'] ?? $raw['target_industry'] ?? $raw['industries'] ?? [])),
            'target_company_size'   => $this->toText($raw['company_size'] ?? $raw['target_company_size'] ?? ''),
            'target_buyer_persona'  => implode(', ', $this->toList($raw['buyer_persona'] ?? $raw['target_buyer_persona'] ?? [])),
            'budget_range'          => $this->toText($raw['budget_range'] ?? ''),
            'supported_regions'     => implode(', ', $this->toList($raw['regions'] ?? $raw['supported_regions'] ?? $raw['geographic_focus'] ?? $raw['markets'] ?? [])),
            'keywords'              => $this->toList($raw['keywords'] ?? []),
            'target_pain_points'    => implode("\n", $this->toList($raw['pain_points'] ?? $raw['target_pain_points'] ?? $raw['customer_pain_points'] ?? $raw['business_challenges'] ?? $raw['key_pain_points'] ?? $raw['challenges_addressed'] ?? [])),
            'use_cases'             => $this->toList($raw['use_cases'] ?? $raw['recommended_use_cases'] ?? $raw['applications'] ?? []),
            'competitor_notes'      => $this->toText($raw['competitor_context'] ?? $raw['competitor_notes'] ?? ''),
            'ideal_company_profile' => $this->toText($raw['ideal_company_profile'] ?? ''),
        ];

        return $this->fillMissingDefaults($data, $productName, $availableCategories);
    }

    private function fillMissingDefaults(array $data, string $productName = '', array $availableCategories = []): array
    {
        $name = trim($productName) !== '' ? trim($productName) : 'This product';
        $firstCategory = $this->toList($availableCategories)[0] ?? 'General B2B Solution';

        $defaults = [
            'description' => "{$name} is a B2B product for organizations that need clearer operations, collaboration, and measurable business outcomes. Review the generated targeting, pain points, and use cases, then refine this description before saving.",
            'category' => $firstCategory,
            'target_industry' => $firstCategory,
            'target_company_size' => 'SMB to enterprise organizations',
            'target_buyer_persona' => 'Business Owner, Operations Manager, IT Manager, Procurement Manager',
            'budget_range' => 'To be validated during discovery',
            'supported_regions' => 'Indonesia',
            'target_pain_points' => implode("\n", [
                'Manual or fragmented business processes reduce team productivity',
                'Decision makers lack consolidated visibility into performance and adoption',
                'Teams need a scalable solution with clear implementation ownership',
            ]),
            'competitor_notes' => 'Competitor landscape should be validated during discovery; compare against incumbent tools, manual processes, and local alternatives.',
            'ideal_company_profile' => "Companies evaluating {$name} with clear business ownership, active operational pain points, and budget authority for a B2B solution.",
        ];

        foreach ($defaults as $key => $value) {
            if (trim((string) ($data[$key] ?? '')) === '') {
                $data[$key] = $value;
            }
        }

        if (empty($data['keywords'])) {
            $nameKeywords = preg_split('/[\s,.\-_]+/', strtolower($name)) ?: [];
            $data['keywords'] = array_values(array_unique(array_filter(array_merge(
                $nameKeywords,
                ['b2b', 'sales', 'solution', 'productivity']
            ))));
        }

        if (empty($data['use_cases'])) {
            $data['use_cases'] = [
                'Business process improvement',
                'Team productivity and collaboration',
                'Management visibility and reporting',
            ];
        }

        return $data;
    }

    private function toText(mixed $value): string
    {
        if ($value === null) {
            return '';
        }

        if (is_scalar($value)) {
            return trim((string) $value);
        }

        if (is_array($value)) {
            return implode(', ', $this->toList($value));
        }

        return trim(json_encode($value, JSON_UNESCAPED_UNICODE) ?: '');
    }

    /**
     * @return array<int, string>
     */
    private function toList(mixed $value): array
    {
        if ($value === null || $value === '') {
            return [];
        }

        if (is_scalar($value)) {
            return [trim((string) $value)];
        }

        if (! is_array($value)) {
            return [$this->toText($value)];
        }

        $items = [];
        foreach ($value as $key => $item) {
            if (is_array($item)) {
                $label = $item['label']
                    ?? $item['name']
                    ?? $item['title']
                    ?? $item['value']
                    ?? null;
                $items[] = $label !== null
                    ? $this->toText($label)
                    : $this->toText($item);
                continue;
            }

            if (is_string($key) && is_bool($item)) {
                if ($item) {
                    $items[] = $key;
                }
                continue;
            }

            $items[] = $this->toText($item);
        }

        return array_values(array_filter(array_map('trim', $items), fn (string $item) => $item !== ''));
    }
}
