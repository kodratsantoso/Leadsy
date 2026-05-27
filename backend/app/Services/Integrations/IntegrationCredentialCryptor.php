<?php

namespace App\Services\Integrations;

use Illuminate\Contracts\Encryption\DecryptException;
use InvalidArgumentException;
use RuntimeException;

class IntegrationCredentialCryptor
{
    private const CIPHER = 'aes-256-gcm';

    private const VERSION = 1;

    private const NONCE_BYTES = 12;

    private const TAG_BYTES = 16;

    private string $key;

    public function __construct(
        ?string $keyMaterial = null,
        private readonly ?string $keyId = null,
    ) {
        $this->key = $this->normalizeKey($keyMaterial ?? (string) config('integrations.credential_key'));
    }

    public function encryptString(string $plainText, string $aad = ''): string
    {
        $nonce = random_bytes(self::NONCE_BYTES);
        $tag = '';
        $cipherText = openssl_encrypt(
            $plainText,
            self::CIPHER,
            $this->key,
            OPENSSL_RAW_DATA,
            $nonce,
            $tag,
            $aad,
            self::TAG_BYTES
        );

        if ($cipherText === false || strlen($tag) !== self::TAG_BYTES) {
            throw new RuntimeException('Unable to encrypt integration credential.');
        }

        return json_encode([
            'v' => self::VERSION,
            'alg' => 'AES-256-GCM',
            'kid' => $this->keyId ?? (string) config('integrations.credential_key_id', 'primary'),
            'iv' => base64_encode($nonce),
            'tag' => base64_encode($tag),
            'ct' => base64_encode($cipherText),
        ], JSON_THROW_ON_ERROR);
    }

    public function decryptString(string $encryptedEnvelope, string $aad = ''): string
    {
        try {
            $payload = json_decode($encryptedEnvelope, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException $exception) {
            throw new DecryptException('Invalid integration credential envelope.', previous: $exception);
        }

        if (($payload['v'] ?? null) !== self::VERSION || ($payload['alg'] ?? null) !== 'AES-256-GCM') {
            throw new DecryptException('Unsupported integration credential envelope version.');
        }

        $nonce = $this->decodeBase64Field($payload, 'iv');
        $tag = $this->decodeBase64Field($payload, 'tag');
        $cipherText = $this->decodeBase64Field($payload, 'ct');

        if (strlen($nonce) !== self::NONCE_BYTES || strlen($tag) !== self::TAG_BYTES) {
            throw new DecryptException('Invalid integration credential envelope parameters.');
        }

        $plainText = openssl_decrypt(
            $cipherText,
            self::CIPHER,
            $this->key,
            OPENSSL_RAW_DATA,
            $nonce,
            $tag,
            $aad
        );

        if ($plainText === false) {
            throw new DecryptException('Unable to decrypt integration credential.');
        }

        return $plainText;
    }

    public function encryptJson(array $payload, string $aad = ''): string
    {
        return $this->encryptString(json_encode($payload, JSON_THROW_ON_ERROR), $aad);
    }

    public function decryptJson(string $encryptedEnvelope, string $aad = ''): array
    {
        $decoded = json_decode($this->decryptString($encryptedEnvelope, $aad), true, 512, JSON_THROW_ON_ERROR);

        if (! is_array($decoded)) {
            throw new DecryptException('Integration credential JSON payload is invalid.');
        }

        return $decoded;
    }

    public function fingerprint(string $value, string $scope = ''): string
    {
        return hash_hmac('sha256', $scope.'|'.$value, $this->key);
    }

    private function normalizeKey(string $keyMaterial): string
    {
        if (str_starts_with($keyMaterial, 'base64:')) {
            $decoded = base64_decode(substr($keyMaterial, 7), true);
        } else {
            $decoded = $keyMaterial;
        }

        if (! is_string($decoded) || $decoded === '') {
            throw new InvalidArgumentException('INTEGRATION_CREDENTIAL_KEY or APP_KEY is required.');
        }

        if (strlen($decoded) === 32) {
            return $decoded;
        }

        return hash_hkdf('sha256', $decoded, 32, 'leadsy.integration.credentials.v1');
    }

    private function decodeBase64Field(array $payload, string $field): string
    {
        if (! isset($payload[$field]) || ! is_string($payload[$field])) {
            throw new DecryptException("Missing integration credential envelope field: {$field}.");
        }

        $decoded = base64_decode($payload[$field], true);
        if ($decoded === false) {
            throw new DecryptException("Invalid base64 integration credential envelope field: {$field}.");
        }

        return $decoded;
    }
}
