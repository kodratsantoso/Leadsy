<?php

namespace App\Services;

use App\Models\Currency;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class CurrencyExchangeService
{
    /**
     * Fetch exchange rates from an Open API and update the database.
     * We use ExchangeRate-API (open.er-api.com) with USD as base because it's highly reliable and free.
     * 
     * @return int Number of currencies updated
     */
    public function syncRates(): int
    {
        // Fetch rates based on USD (since IDR is a secondary currency, fetching IDR base directly might have lower precision or availability depending on API)
        // Wait, open.er-api.com supports IDR as base. Let's use IDR as base to get direct rates where 1 Unit = X IDR.
        // If we use IDR as base, the API returns how many IDR is 1 Unit? No, it returns how many of the target currency is 1 IDR.
        // Example: IDR base -> USD is 0.000062. So 1 USD = 1 / 0.000062 IDR.
        
        $response = Http::get('https://open.er-api.com/v6/latest/IDR');
        
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

        $rates = $data['rates']; // Key is currency code, value is rate against 1 IDR. e.g., 'USD' => 0.0000615

        $currencies = Currency::where('is_active', true)->get();
        $updatedCount = 0;
        $now = now();

        foreach ($currencies as $currency) {
            $code = strtoupper($currency->code);
            
            if ($code === 'IDR') {
                $currency->update([
                    'idr_exchange_rate' => 1.0000,
                    'exchange_rate_updated_at' => $now,
                ]);
                $updatedCount++;
                continue;
            }

            if (isset($rates[$code])) {
                $ratePerIdr = $rates[$code];
                
                if ($ratePerIdr > 0) {
                    // How much IDR is 1 unit of this currency?
                    $idrValue = 1 / $ratePerIdr;
                    
                    $currency->update([
                        'idr_exchange_rate' => $idrValue,
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
