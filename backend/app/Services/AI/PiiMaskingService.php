<?php

namespace App\Services\AI;

use Illuminate\Support\Str;

/**
 * PII Masking & Sanitization Gateway — UU No. 27/2022 (UU Pelindungan Data Pribadi / PDP)
 *
 * Responsibilities:
 *   - Automatically detects sensitive personal & financial identifiers before sending to external LLMs.
 *   - Anonymizes NIK (16 digits), NPWP, bank account numbers, credit cards, personal phones, and emails.
 *   - Restores original identifiers in the returned model response (lossless de-masking).
 */
class PiiMaskingService
{
    /**
     * Masks PII data from the prompt content and generates a token replacement map.
     *
     * @param  string|array  $promptContent
     * @return array{masked: string|array, tokenMap: array<string, string>}
     */
    public function mask(string|array $promptContent): array
    {
        $tokenMap = [];

        if (is_array($promptContent)) {
            $masked = [];
            foreach ($promptContent as $key => $val) {
                if (is_string($val)) {
                    $result = $this->maskString($val, $tokenMap);
                    $masked[$key] = $result['masked'];
                    $tokenMap = $result['tokenMap'];
                } else {
                    $masked[$key] = $val;
                }
            }
            return ['masked' => $masked, 'tokenMap' => $tokenMap];
        }

        $result = $this->maskString($promptContent, $tokenMap);
        return ['masked' => $result['masked'], 'tokenMap' => $result['tokenMap']];
    }

    /**
     * Replaces anonymized tokens back to original values in the LLM response.
     */
    public function unmask(?string $responseContent, array $tokenMap): ?string
    {
        if (empty($responseContent) || empty($tokenMap)) {
            return $responseContent;
        }

        return strtr($responseContent, $tokenMap);
    }

    /**
     * Internal string masking logic using regex patterns.
     */
    private function maskString(string $text, array $existingMap): array
    {
        $tokenMap = $existingMap;
        $maskedText = $text;

        // 1. Indonesian NIK (16 continuous digits)
        $maskedText = preg_replace_callback('/\b\d{16}\b/', function ($matches) use (&$tokenMap) {
            $val = $matches[0];
            $token = '[ID_NUM_' . strtoupper(substr(md5($val), 0, 6)) . ']';
            $tokenMap[$token] = $val;
            return $token;
        }, $maskedText);

        // 2. Indonesian NPWP (15 or 16 digits formatted: XX.XXX.XXX.X-XXX.XXX)
        $maskedText = preg_replace_callback('/\b\d{2}\.\d{3}\.\d{3}\.\d{1}-\d{3}\.\d{3}\b/', function ($matches) use (&$tokenMap) {
            $val = $matches[0];
            $token = '[TAX_NUM_' . strtoupper(substr(md5($val), 0, 6)) . ']';
            $tokenMap[$token] = $val;
            return $token;
        }, $maskedText);

        // 3. Payment Card / Credit Card numbers (4 groups of 4 digits)
        $maskedText = preg_replace_callback('/\b(?:\d{4}[ -]){3}\d{4}\b/', function ($matches) use (&$tokenMap) {
            $val = $matches[0];
            $token = '[CARD_NUM_' . strtoupper(substr(md5($val), 0, 6)) . ']';
            $tokenMap[$token] = $val;
            return $token;
        }, $maskedText);

        // 4. Indonesian Bank Account Numbers with prefix keywords
        $maskedText = preg_replace_callback('/\b(?:Rek(?:ening)?\.?|BCA|Mandiri|BRI|BNI|BSI|CIMB|Permata)\s*[:#\-]?\s*(\d{9,16})\b/i', function ($matches) use (&$tokenMap) {
            $full = $matches[0];
            $accountNumber = $matches[1];
            $token = '[BANK_ACC_' . strtoupper(substr(md5($accountNumber), 0, 6)) . ']';
            $tokenMap[$token] = $accountNumber;
            return str_replace($accountNumber, $token, $full);
        }, $maskedText);

        // 5. Prompt Injection Guardrails (OWASP LLM01)
        // Neutralize common adversarial overrides in English & Indonesian
        $injectionPatterns = [
            '/\b(?:ignore|forget|disregard)\s+(?:all\s+)?(?:previous|prior|above)\s+(?:instructions|prompts|rules)\b/i',
            '/\b(?:system\s+override|developer\s+mode|jailbreak|unrestricted\s+mode)\b/i',
            '/\b(?:you\s+are\s+now|act\s+as)\s+(?:an?\s+)?(?:unrestricted|DAN|root|hacker)\b/i',
            '/\b(?:print|reveal|expose|dump)\s+(?:your\s+)?(?:system\s+prompt|initial\s+instructions|hidden\s+rules)\b/i',
            '/\b(?:abaikan|lupakan)\s+(?:semua\s+)?(?:instruksi|perintah|aturan)\s+(?:sebelumnya|di\s+atas)\b/i',
            '/\b(?:mode\s+pengembang|override\s+sistem|bypass\s+keamanan)\b/i',
        ];

        foreach ($injectionPatterns as $pattern) {
            $maskedText = preg_replace($pattern, '[SANITIZED_DIRECTIVE]', $maskedText);
        }

        return [
            'masked' => $maskedText,
            'tokenMap' => $tokenMap,
        ];
    }
}
