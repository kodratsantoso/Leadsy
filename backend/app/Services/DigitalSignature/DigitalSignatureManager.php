<?php

namespace App\Services\DigitalSignature;

use App\Contracts\DigitalSignatureProvider;
use App\Models\DigitalSignatureConnection;
use App\Services\DigitalSignature\Providers\DocumensoProvider;
use App\Services\DigitalSignature\Providers\PrivyPsreProvider;
use Exception;

class DigitalSignatureManager
{
    public function getActiveProvider(?string $requestedProvider = null): DigitalSignatureProvider
    {
        $query = DigitalSignatureConnection::where('is_active', true);
        
        if ($requestedProvider) {
            $query->where('provider_name', $requestedProvider);
        }

        $connection = $query->first();

        if (!$connection) {
            // Enterprise default PSrE Connection
            $connection = new DigitalSignatureConnection([
                'provider_name' => $requestedProvider ?: 'privy_psre',
                'base_url' => 'https://api.privy.id',
                'api_key' => 'live_psre_token_default',
                'is_active' => true,
            ]);
        }

        return match (strtolower($connection->provider_name)) {
            'documenso' => new DocumensoProvider($connection),
            'privy', 'privy_psre', 'vida' => new PrivyPsreProvider($connection),
            default => new PrivyPsreProvider($connection),
        };
    }
}
