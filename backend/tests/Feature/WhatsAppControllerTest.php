<?php

namespace Tests\Feature;

use App\Models\IntegrationConfig;
use App\Models\Tenant;
use App\Models\User;
use App\Models\WhatsappContact;
use App\Models\WhatsappConversation;
use App\Models\WhatsappMessage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class WhatsAppControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_get_conversations_default_whatsapp(): void
    {
        $user = $this->makeUser();

        // Create a local whatsapp conversation
        $contact = WhatsappContact::create([
            'phone_number' => '628123456789',
            'normalized_phone_number' => '628123456789',
            'is_relevant' => true,
            'user_id' => $user->id,
        ]);

        $conv = WhatsappConversation::create([
            'contact_id' => $contact->id,
            'external_chat_id' => '628123456789@s.whatsapp.net',
            'platform' => 'whatsapp',
            'approved_for_sync' => true,
            'last_message_at' => now(),
            'user_id' => $user->id,
        ]);

        $response = $this->actingAs($user)
            ->getJson('/api/whatsapp/conversations')
            ->assertOk();

        $data = $response->json('data');
        $this->assertCount(1, $data);
        $this->assertEquals('whatsapp', $data[0]['platform']);
        $this->assertEquals($conv->id, $data[0]['id']);
    }

    public function test_get_conversations_mekari_qontak_triggers_sync(): void
    {
        $user = $this->makeUser();

        // Configure Qontak integration
        $this->saveConfig($user, 'MEKARI_QONTAK_ENABLED', '1', false);
        $this->saveConfig($user, 'MEKARI_QONTAK_BASE_URL', 'https://api.mekari.com', false);
        $this->saveConfig($user, 'MEKARI_QONTAK_CLIENT_ID', 'test-client-id', false);
        $this->saveConfig($user, 'MEKARI_QONTAK_CLIENT_SECRET', 'test-client-secret', true);

        // Mock Qontak rooms endpoint
        Http::fake([
            'api.mekari.com/qontak/chat/v1/rooms*' => Http::response([
                'data' => [
                    [
                        'id' => 'qontak-room-1',
                        'name' => 'John Doe',
                        'last_message_at' => '2026-05-31T09:00:00Z',
                        'last_message' => [
                            'id' => 'msg-1',
                            'text' => 'Hello from Qontak!',
                            'created_at' => '2026-05-31T09:00:00Z',
                            'sender_type' => 'Contact',
                        ],
                    ]
                ]
            ]),
        ]);

        $response = $this->actingAs($user)
            ->getJson('/api/whatsapp/conversations?platform=mekari_qontak')
            ->assertOk();

        $data = $response->json('data');
        $this->assertCount(1, $data);
        $this->assertEquals('mekari_qontak', $data[0]['platform']);
        $this->assertEquals('qontak-room-1', $data[0]['external_chat_id']);

        // Verify message was synchronized
        $this->assertDatabaseHas('whatsapp_messages', [
            'external_message_id' => 'msg-1',
            'body' => 'Hello from Qontak!',
            'direction' => 'inbound',
        ]);
    }

    public function test_get_conversation_messages_mekari_qontak_triggers_message_sync(): void
    {
        $user = $this->makeUser();

        // Configure Qontak integration
        $this->saveConfig($user, 'MEKARI_QONTAK_ENABLED', '1', false);
        $this->saveConfig($user, 'MEKARI_QONTAK_BASE_URL', 'https://api.mekari.com', false);
        $this->saveConfig($user, 'MEKARI_QONTAK_CLIENT_ID', 'test-client-id', false);
        $this->saveConfig($user, 'MEKARI_QONTAK_CLIENT_SECRET', 'test-client-secret', true);

        // Create the conversation first
        $contact = WhatsappContact::create([
            'phone_number' => 'qontak-room-1',
            'normalized_phone_number' => 'qontakroom1',
            'is_relevant' => true,
        ]);

        $conv = WhatsappConversation::create([
            'contact_id' => $contact->id,
            'external_chat_id' => 'qontak-room-1',
            'platform' => 'mekari_qontak',
            'approved_for_sync' => true,
            'last_message_at' => now(),
        ]);

        // Mock Qontak messages endpoint
        Http::fake([
            'api.mekari.com/qontak/chat/v1/rooms/qontak-room-1/messages*' => Http::response([
                'data' => [
                    [
                        'id' => 'msg-1',
                        'text' => 'Hello from Qontak!',
                        'created_at' => '2026-05-31T09:00:00Z',
                        'sender_type' => 'Contact',
                    ],
                    [
                        'id' => 'msg-2',
                        'text' => 'Reply from Agent',
                        'created_at' => '2026-05-31T09:05:00Z',
                        'sender_type' => 'AgentAccount',
                    ]
                ]
            ]),
        ]);

        $response = $this->actingAs($user)
            ->getJson("/api/whatsapp/conversations/{$conv->id}/messages")
            ->assertOk();

        $data = $response->json('data');
        $this->assertCount(2, $data);
        $this->assertEquals('Hello from Qontak!', $data[0]['body']);
        $this->assertEquals('inbound', $data[0]['direction']);
        $this->assertEquals('Reply from Agent', $data[1]['body']);
        $this->assertEquals('outbound', $data[1]['direction']);
    }

    public function test_send_message_mekari_qontak_routes_to_qontak_api(): void
    {
        $user = $this->makeUser();

        // Configure Qontak integration
        $this->saveConfig($user, 'MEKARI_QONTAK_ENABLED', '1', false);
        $this->saveConfig($user, 'MEKARI_QONTAK_BASE_URL', 'https://api.mekari.com', false);
        $this->saveConfig($user, 'MEKARI_QONTAK_CLIENT_ID', 'test-client-id', false);
        $this->saveConfig($user, 'MEKARI_QONTAK_CLIENT_SECRET', 'test-client-secret', true);

        // Create the conversation first
        $contact = WhatsappContact::create([
            'phone_number' => 'qontak-room-1',
            'normalized_phone_number' => 'qontakroom1',
            'is_relevant' => true,
        ]);

        $conv = WhatsappConversation::create([
            'contact_id' => $contact->id,
            'external_chat_id' => 'qontak-room-1',
            'platform' => 'mekari_qontak',
            'approved_for_sync' => true,
            'last_message_at' => now(),
        ]);

        // Mock Qontak send bot message endpoint
        Http::fake([
            'api.mekari.com/qontak/chat/v1/messages/whatsapp/bot' => Http::response([
                'status' => 'success',
                'data' => [
                    'id' => 'msg-qontak-out-123'
                ]
            ]),
        ]);

        $response = $this->actingAs($user)
            ->postJson("/api/whatsapp/messages/send", [
                'phone' => 'qontak-room-1',
                'text' => 'Outbound reply from Leadsy',
                'platform' => 'mekari_qontak',
            ])
            ->assertOk();

        $this->assertTrue($response->json('success'));
        $this->assertEquals('msg-qontak-out-123', $response->json('external_id'));

        // Verify message was logged to DB
        $this->assertDatabaseHas('whatsapp_messages', [
            'conversation_id' => $conv->id,
            'external_message_id' => 'msg-qontak-out-123',
            'body' => 'Outbound reply from Leadsy',
            'direction' => 'outbound',
        ]);
    }

    public function test_get_conversations_mekari_qontak_paginated(): void
    {
        $user = $this->makeUser();

        $this->saveConfig($user, 'MEKARI_QONTAK_ENABLED', '1', false);
        $this->saveConfig($user, 'MEKARI_QONTAK_BASE_URL', 'https://api.mekari.com', false);
        $this->saveConfig($user, 'MEKARI_QONTAK_CLIENT_ID', 'test-client-id', false);
        $this->saveConfig($user, 'MEKARI_QONTAK_CLIENT_SECRET', 'test-client-secret', true);

        // Mock two pages of rooms
        Http::fake([
            'api.mekari.com/qontak/chat/v1/rooms?limit=50' => Http::response([
                'data' => [
                    [
                        'id' => 'qontak-room-1',
                        'name' => 'John Doe',
                        'last_message_at' => '2026-05-31T09:00:00Z',
                        'last_message' => [
                            'id' => 'msg-1',
                            'text' => 'Hello from Qontak 1!',
                            'created_at' => '2026-05-31T09:00:00Z',
                            'sender_type' => 'Contact',
                        ],
                    ]
                ],
                'meta' => [
                    'pagination' => [
                        'cursor' => [
                            'next' => 'cursor-token-page-2',
                        ]
                    ]
                ]
            ]),
            'api.mekari.com/qontak/chat/v1/rooms?cursor=cursor-token-page-2&limit=50' => Http::response([
                'data' => [
                    [
                        'id' => 'qontak-room-2',
                        'name' => 'Jane Smith',
                        'last_message_at' => '2026-05-31T09:10:00Z',
                        'last_message' => [
                            'id' => 'msg-2',
                            'text' => 'Hello from Qontak 2!',
                            'created_at' => '2026-05-31T09:10:00Z',
                            'sender_type' => 'Contact',
                        ],
                    ]
                ],
                'meta' => [
                    'pagination' => [
                        'cursor' => [
                            'next' => null,
                        ]
                    ]
                ]
            ]),
        ]);

        $response = $this->actingAs($user)
            ->getJson('/api/whatsapp/conversations?platform=mekari_qontak')
            ->assertOk();

        $this->assertDatabaseHas('whatsapp_conversations', ['external_chat_id' => 'qontak-room-1']);
        $this->assertDatabaseHas('whatsapp_conversations', ['external_chat_id' => 'qontak-room-2']);
        $this->assertDatabaseHas('whatsapp_messages', ['external_message_id' => 'msg-1']);
        $this->assertDatabaseHas('whatsapp_messages', ['external_message_id' => 'msg-2']);
    }

    public function test_get_conversation_messages_mekari_qontak_paginated(): void
    {
        $user = $this->makeUser();

        $this->saveConfig($user, 'MEKARI_QONTAK_ENABLED', '1', false);
        $this->saveConfig($user, 'MEKARI_QONTAK_BASE_URL', 'https://api.mekari.com', false);
        $this->saveConfig($user, 'MEKARI_QONTAK_CLIENT_ID', 'test-client-id', false);
        $this->saveConfig($user, 'MEKARI_QONTAK_CLIENT_SECRET', 'test-client-secret', true);

        $contact = WhatsappContact::create([
            'phone_number' => 'qontak-room-1',
            'normalized_phone_number' => 'qontakroom1',
            'is_relevant' => true,
        ]);

        $conv = WhatsappConversation::create([
            'contact_id' => $contact->id,
            'external_chat_id' => 'qontak-room-1',
            'platform' => 'mekari_qontak',
            'approved_for_sync' => true,
            'last_message_at' => now(),
        ]);

        // Mock two pages of messages
        Http::fake([
            'api.mekari.com/qontak/chat/v1/rooms/qontak-room-1/messages?limit=50' => Http::response([
                'data' => [
                    [
                        'id' => 'msg-1',
                        'text' => 'Hello Page 1!',
                        'created_at' => '2026-05-31T09:00:00Z',
                        'sender_type' => 'Contact',
                    ]
                ],
                'meta' => [
                    'pagination' => [
                        'cursor' => [
                            'next' => 'cursor-token-msg-2',
                        ]
                    ]
                ]
            ]),
            'api.mekari.com/qontak/chat/v1/rooms/qontak-room-1/messages?cursor=cursor-token-msg-2&limit=50' => Http::response([
                'data' => [
                    [
                        'id' => 'msg-2',
                        'text' => 'Hello Page 2!',
                        'created_at' => '2026-05-31T09:05:00Z',
                        'sender_type' => 'AgentAccount',
                    ]
                ],
                'meta' => [
                    'pagination' => [
                        'cursor' => [
                            'next' => null,
                        ]
                    ]
                ]
            ]),
        ]);

        $response = $this->actingAs($user)
            ->getJson("/api/whatsapp/conversations/{$conv->id}/messages")
            ->assertOk();

        $this->assertDatabaseHas('whatsapp_messages', [
            'conversation_id' => $conv->id,
            'external_message_id' => 'msg-1',
            'body' => 'Hello Page 1!',
            'direction' => 'inbound',
        ]);

        $this->assertDatabaseHas('whatsapp_messages', [
            'conversation_id' => $conv->id,
            'external_message_id' => 'msg-2',
            'body' => 'Hello Page 2!',
            'direction' => 'outbound',
        ]);
    }

    private function makeUser(): User
    {
        $tenant = Tenant::query()->first() ?? Tenant::create([
            'name' => 'Default Workspace',
            'slug' => 'default-workspace',
            'status' => 'active',
        ]);

        return User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Integration Admin',
            'email' => 'integration-admin@example.com',
            'password' => bcrypt('password'),
        ]);
    }

    public function test_get_conversations_whatsapp_triggers_manual_sync(): void
    {
        $user = $this->makeUser();

        // Mock sidecar sync endpoint
        Http::fake([
            '*/session/sync' => Http::response(['success' => true, 'message' => 'Dispatched messages']),
        ]);

        $response = $this->actingAs($user)
            ->getJson('/api/whatsapp/conversations?platform=whatsapp&force_sync=true')
            ->assertOk();

        // Verify sidecar was called
        Http::assertSent(function (\Illuminate\Http\Client\Request $request) {
            return str_contains($request->url(), '/session/sync');
        });
    }

    public function test_webhook_history_sync_ingests_messages(): void
    {
        $user = $this->makeUser();

        $payload = [
            'action' => 'history_sync',
            'session' => 'user_session_' . $user->id,
            'messages' => [
                [
                    'external_id' => 'msg-hist-1',
                    'remote_jid' => '628123456789@s.whatsapp.net',
                    'sender_name' => 'John Historical',
                    'body' => 'Old history message',
                    'direction' => 'inbound',
                    'timestamp' => 1780272000, // Unix timestamp for June 1, 2026
                ]
            ]
        ];

        $response = $this->postJson('/api/webhooks/whatsapp', $payload)
            ->assertOk();

        $this->assertTrue($response->json('success'));

        // Verify contact was created
        $this->assertDatabaseHas('whatsapp_contacts', [
            'phone_number' => '628123456789@s.whatsapp.net',
            'name' => 'John Historical',
            'user_id' => $user->id,
        ]);

        // Verify conversation was created
        $this->assertDatabaseHas('whatsapp_conversations', [
            'external_chat_id' => '628123456789@s.whatsapp.net',
            'platform' => 'whatsapp',
            'user_id' => $user->id,
        ]);

        // Verify message was created with correct timestamp
        $this->assertDatabaseHas('whatsapp_messages', [
            'external_message_id' => 'msg-hist-1',
            'body' => 'Old history message',
            'direction' => 'inbound',
            'sent_at' => '2026-06-01 00:00:00',
        ]);
    }

    public function test_analyze_conversation(): void
    {
        $user = $this->makeUser();

        $contact = WhatsappContact::create([
            'phone_number' => '628123456789@s.whatsapp.net',
            'normalized_phone_number' => '628123456789',
            'is_relevant' => true,
            'user_id' => $user->id,
        ]);

        $conv = WhatsappConversation::create([
            'contact_id' => $contact->id,
            'external_chat_id' => '628123456789@s.whatsapp.net',
            'platform' => 'whatsapp',
            'approved_for_sync' => true,
            'last_message_at' => now(),
            'user_id' => $user->id,
        ]);

        // Add a message so it passes the messages.isEmpty check
        WhatsappMessage::create([
            'conversation_id' => $conv->id,
            'external_message_id' => 'test-msg-id-123',
            'direction' => 'inbound',
            'body' => 'I would like to inquire about pricing details please.',
            'sent_at' => now(),
        ]);

        $response = $this->actingAs($user)
            ->postJson("/api/whatsapp/conversations/{$conv->id}/analyze")
            ->assertOk();

        $response->assertJson([
            'success' => true,
            'message' => 'AI analysis completed.',
        ]);

        // Verify analysis was created in the database (will use heuristic fallback if AI not configured)
        $this->assertDatabaseHas('whatsapp_ai_analyses', [
            'conversation_id' => $conv->id,
            'analysis_result' => 'yes', // because "pricing" triggers "yes" in heuristic
        ]);
    }

    private function saveConfig(User $user, string $key, string $value, bool $secret = true): void
    {
        IntegrationConfig::create([
            'tenant_id' => $user->tenant_id,
            'category' => 'lead_platforms',
            'key' => $key,
            'value' => $value,
            'is_secret' => $secret,
            'value_type' => 'string',
            'is_active' => true,
        ]);
    }
}
