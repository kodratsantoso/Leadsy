# Integration Module Phase 1: Schema & Credential Security

> Status: implemented foundation  
> Last updated: 2026-05-27  
> Scope: database schema, encrypted credential storage, and reusable AES-256-GCM cryptography utility.

## 1. Stack Decision

The user's prompt used Node/Prisma as an example stack, but this repository's active backend is Laravel with PostgreSQL. Phase 1 is therefore implemented in Laravel migrations, Eloquent models, and a framework-neutral encryption service class.

The module is isolated from core Leadsy lead logic. It introduces new tables under the `integration_*` namespace and only adds a tenant relation for discoverability.

## 2. Tables

### `integration_connections`

Stores one configured platform connection per tenant/account.

Important fields:

- `tenant_id`
- `created_by`
- `provider`
- `provider_account_id`
- `provider_account_name`
- `display_name`
- `auth_type`
- `status`
- `is_enabled`
- `scopes`
- `config`
- `metadata`
- lifecycle/error timestamps

Expected statuses:

- `disconnected`
- `connected`
- `action_required`
- `reauthenticate_required`
- `error`
- `disabled`

### `integration_credential_stores`

Stores sensitive material as AES-256-GCM encrypted envelopes.

Supported credential types include:

- `oauth_access_token`
- `oauth_refresh_token`
- `client_secret`
- `api_key`
- `manual_token`
- `webhook_secret`

Important fields:

- `encrypted_value`
- `encryption_key_id`
- `value_fingerprint`
- `last4`
- `expires_at`
- `rotated_at`
- `revoked_at`
- `metadata`

`value_fingerprint` is an HMAC-SHA256 blind index. It allows duplicate/same-token detection without exposing the raw token.

### `integration_entity_mappings`

Maps third-party external entities to Leadsy entities.

Initial use cases:

- external lead id to Leadsy lead id,
- third-party account/contact id to future Leadsy object,
- idempotent two-way sync identity.

### `integration_webhook_events`

Stores inbound webhook payloads with idempotency.

Important fields:

- `provider`
- `event_type`
- `external_event_id`
- `idempotency_key`
- `payload_hash`
- `payload`
- `headers`
- `status`
- `attempts`
- `processing_error`

The `idempotency_key` is unique and generated from provider, external event id if available, and payload hash.

## 3. Cryptography

Credential encryption is handled by:

`backend/app/Services/Integrations/IntegrationCredentialCryptor.php`

Properties:

- Algorithm: AES-256-GCM.
- Nonce: 96-bit random nonce per encryption.
- Tag: 128-bit authentication tag.
- Envelope: JSON with version, algorithm, key id, iv, tag, ciphertext.
- AAD: tenant, connection, credential type, and key name.
- Blind index: HMAC-SHA256 fingerprint scoped by AAD.

The encryption key is configured through:

```env
INTEGRATION_CREDENTIAL_KEY=base64:...
INTEGRATION_CREDENTIAL_KEY_ID=primary
```

Generate a production key with:

```bash
php -r "echo 'base64:'.base64_encode(random_bytes(32)).PHP_EOL;"
```

`APP_KEY` is only a development fallback. Production environments should use a separate integration credential key so application-cookie encryption and third-party credential encryption can rotate independently.

## 4. Security Rules

- Raw secrets must never be returned to the frontend by default.
- UI may display only masked `last4` values.
- Token refresh workers must update `integration_credential_stores` by replacing encrypted values and `rotated_at`.
- 401/403 provider responses should mark the connection as `action_required` or `reauthenticate_required`.
- Webhook receivers must write inbound events before asynchronous processing.
- Idempotency must be enforced before lead creation or sync side effects.

## 5. Phase 2 Boundary

Phase 2 should add controllers/services for:

- OAuth authorization URL generation.
- OAuth callback exchange.
- Manual credential validation.
- Connection test endpoint.
- Credential save/update using `IntegrationCredentialStore::storeSecret()`.
- Token expiry monitoring and refresh jobs.

No third-party API endpoint should be implemented without checking the current official provider documentation for that platform.

