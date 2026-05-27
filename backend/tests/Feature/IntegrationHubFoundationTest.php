<?php

namespace Tests\Feature;

use App\Models\IntegrationConnection;
use App\Models\IntegrationCredentialStore;
use App\Models\IntegrationEntityMapping;
use App\Models\IntegrationWebhookEvent;
use App\Models\Tenant;
use App\Services\Integrations\IntegrationCredentialCryptor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class IntegrationHubFoundationTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_stores_connection_credentials_mappings_and_webhook_events_per_tenant(): void
    {
        config()->set('integrations.credential_key', str_repeat('d', 32));
        config()->set('integrations.credential_key_id', 'test-primary');

        $tenant = Tenant::query()->firstOrFail();

        $connection = IntegrationConnection::create([
            'tenant_id' => $tenant->id,
            'provider' => 'hubspot',
            'provider_account_id' => 'portal-123',
            'provider_account_name' => 'Leadsy HubSpot Sandbox',
            'display_name' => 'HubSpot Sandbox',
            'auth_type' => 'oauth2',
            'status' => 'connected',
            'is_enabled' => true,
            'scopes' => ['crm.objects.contacts.read'],
            'config' => ['region' => 'global'],
            'metadata' => ['created_from' => 'test'],
            'connected_at' => now(),
        ]);

        $credential = new IntegrationCredentialStore([
            'tenant_id' => $tenant->id,
            'integration_connection_id' => $connection->id,
            'credential_type' => 'oauth_access_token',
            'key_name' => 'access_token',
            'metadata' => ['token_type' => 'Bearer'],
            'expires_at' => now()->addHour(),
        ]);
        $credential->storeSecret('access-token-value', new IntegrationCredentialCryptor(str_repeat('d', 32), 'test-primary'));
        $credential->save();

        $mapping = IntegrationEntityMapping::create([
            'tenant_id' => $tenant->id,
            'integration_connection_id' => $connection->id,
            'provider' => 'hubspot',
            'external_entity_type' => 'contact',
            'external_entity_id' => 'contact-456',
            'leadsy_entity_type' => 'lead',
            'leadsy_entity_id' => 99,
            'metadata' => ['source' => 'sync'],
            'last_synced_at' => now(),
        ]);

        $rawPayload = '{"event":"lead.created","id":"evt-789"}';
        $webhook = IntegrationWebhookEvent::create([
            'tenant_id' => $tenant->id,
            'integration_connection_id' => $connection->id,
            'provider' => 'hubspot',
            'event_type' => 'lead.created',
            'external_event_id' => 'evt-789',
            'idempotency_key' => IntegrationWebhookEvent::makeIdempotencyKey('hubspot', 'evt-789', $rawPayload),
            'payload_hash' => hash('sha256', $rawPayload),
            'payload' => ['event' => 'lead.created', 'id' => 'evt-789'],
            'headers' => ['x-provider' => 'hubspot'],
            'status' => 'received',
            'received_at' => now(),
        ]);

        $this->assertTrue($tenant->integrationConnections()->whereKey($connection->id)->exists());
        $this->assertSame('access-token-value', $credential->fresh()->revealSecret(new IntegrationCredentialCryptor(str_repeat('d', 32), 'test-primary')));
        $this->assertStringNotContainsString('access-token-value', $credential->fresh()->encrypted_value);
        $this->assertSame($mapping->id, $connection->entityMappings()->first()->id);
        $this->assertSame($webhook->id, $connection->webhookEvents()->first()->id);
    }

    public function test_it_marks_connections_as_action_required_for_provider_auth_failures(): void
    {
        $tenant = Tenant::query()->firstOrFail();
        $connection = IntegrationConnection::create([
            'tenant_id' => $tenant->id,
            'provider' => 'google_ads',
            'display_name' => 'Google Ads',
            'status' => 'connected',
            'is_enabled' => true,
        ]);

        $connection->markActionRequired('provider_401', 'Provider rejected the saved token.');

        $this->assertSame('action_required', $connection->fresh()->status);
        $this->assertFalse($connection->fresh()->is_enabled);
        $this->assertSame('provider_401', $connection->fresh()->last_error_code);
    }
}
