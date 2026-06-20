<?php

namespace App\Services;

use App\Models\Currency;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class CurrencyExchangeService
{
    /**
     * Fetch exchange rates from an Open API and update the database.
     * We use ExchangeRate-API (open.er-api.com).
     * 
     * @param string $baseCurrencyCode The base currency to fetch rates against (e.g. 'IDR', 'USD')
     * @return int Number of currencies updated
     */
    public function syncRates(string $baseCurrencyCode = 'IDR'): int
    {
        $baseCurrencyCode = strtoupper($baseCurrencyCode);
        $response = Http::get("https://open.er-api.com/v6/latest/{$baseCurrencyCode}");
        
        if (!$response->successful()) {
            Log::error('Failed to fetch exchange rates from API.', [
                'status' => $response->status(),
                'body' => $response->body()
            ]);
            return 0;
        }

        $data = $response->json();
        
        if (!isset($data['rates']) || empty($data['rates'])) {
            Log::error('Exchange rate API response missing rates data.', ['data' => $data]);
            return 0;
        }

        $rates = $data['rates']; // Key is currency code, value is rate against 1 unit of $baseCurrencyCode

        $currencies = Currency::where('is_active', true)->get();
        $updatedCount = 0;
        $now = now();

        foreach ($currencies as $currency) {
            $code = strtoupper($currency->code);
            
            if ($code === $baseCurrencyCode) {
                $currency->update([
                    'exchange_rate' => 1.0000,
                    'base_currency' => $baseCurrencyCode,
                    'exchange_rate_updated_at' => $now,
                ]);
                $updatedCount++;
                continue;
            }

            if (isset($rates[$code])) {
                $ratePerBase = $rates[$code];
                
                if ($ratePerBase > 0) {
                    // How much of the base currency is 1 unit of this currency?
                    $baseValue = 1 / $ratePerBase;
                    
                    $currency->update([
                        'exchange_rate' => $baseValue,
                        'base_currency' => $baseCurrencyCode,
                        'exchange_rate_updated_at' => $now,
                    ]);
                    $updatedCount++;
                }
            } else {
                Log::warning("Exchange rate for {$code} not found in API response.");
            }
        }

        return $updatedCount;
    }
}
