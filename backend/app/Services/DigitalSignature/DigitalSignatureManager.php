<?php

namespace App\Services\DigitalSignature;

use App\Contracts\DigitalSignatureProvider;
use App\Models\DigitalSignatureConnection;
use App\Services\DigitalSignature\Providers\DocumensoProvider;
use Exception;

class DigitalSignatureManager
{
    public function getActiveProvider(): DigitalSignatureProvider
    {
        $connection = DigitalSignatureConnection::where('is_active', true)->first();

        if (!$connection) {
            throw new Exception("No active digital signature provider configured.");
        }

        return match (strtolower($connection->provider_name)) {
            'documenso' => new DocumensoProvider($connection),
            default => throw new Exception("Digital signature provider '{$connection->provider_name}' is not supported."),
        };
    }
}
