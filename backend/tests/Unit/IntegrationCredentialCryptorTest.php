<?php

namespace Tests\Unit;

use App\Services\Integrations\IntegrationCredentialCryptor;
use Illuminate\Contracts\Encryption\DecryptException;
use Tests\TestCase;

class IntegrationCredentialCryptorTest extends TestCase
{
    public function test_it_encrypts_and_decrypts_string_credentials_with_aes_gcm_envelope(): void
    {
        $cryptor = new IntegrationCredentialCryptor(str_repeat('a', 32), 'test-key');

        $encrypted = $cryptor->encryptString('super-secret-access-token', 'tenant:1|connection:2');
        $envelope = json_decode($encrypted, true, 512, JSON_THROW_ON_ERROR);

        $this->assertSame(1, $envelope['v']);
        $this->assertSame('AES-256-GCM', $envelope['alg']);
        $this->assertSame('test-key', $envelope['kid']);
        $this->assertStringNotContainsString('super-secret-access-token', $encrypted);
        $this->assertSame(
            'super-secret-access-token',
            $cryptor->decryptString($encrypted, 'tenant:1|connection:2')
        );
    }

    public function test_it_rejects_credentials_when_authenticated_context_changes(): void
    {
        $cryptor = new IntegrationCredentialCryptor(str_repeat('b', 32), 'test-key');

        $encrypted = $cryptor->encryptString('refresh-token', 'tenant:1|connection:2');

        $this->expectException(DecryptException::class);

        $cryptor->decryptString($encrypted, 'tenant:1|connection:3');
    }

    public function test_it_creates_stable_scoped_fingerprints_without_revealing_the_secret(): void
    {
        $cryptor = new IntegrationCredentialCryptor(str_repeat('c', 32), 'test-key');

        $first = $cryptor->fingerprint('api-key-value', 'tenant:1');
        $second = $cryptor->fingerprint('api-key-value', 'tenant:1');
        $differentScope = $cryptor->fingerprint('api-key-value', 'tenant:2');

        $this->assertSame($first, $second);
        $this->assertNotSame($first, $differentScope);
        $this->assertStringNotContainsString('api-key-value', $first);
        $this->assertMatchesRegularExpression('/^[a-f0-9]{64}$/', $first);
    }
}
