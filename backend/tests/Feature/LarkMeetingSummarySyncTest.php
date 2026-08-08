<?php

namespace Tests\Feature;

use App\Http\Middleware\CheckPermission;
use App\Models\Lead;
use App\Models\LeadTranscript;
use App\Models\MeetingSummaryDocument;
use App\Models\LarkIntegration;
use App\Models\LarkBaseTable;
use App\Models\Tenant;
use App\Models\User;
use App\Jobs\SyncMeetingSummaryToLarkJob;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class LarkMeetingSummarySyncTest extends TestCase
{
    use RefreshDatabase;

    public function test_meeting_summary_sync_runs_successfully(): void
    {
        $this->withoutMiddleware(CheckPermission::class);
        Http::preventStrayRequests();

        Http::fake([
            '*/auth/v3/tenant_access_token/internal' => Http::response([
                'code' => 0,
                'tenant_access_token' => 'mock-tenant-token',
            ]),
            '*/contact/v3/users/batch_get_id' => Http::response([
                'code' => 0,
                'data' => [
                    'user_list' => [
                        ['email' => 'sales-user@example.com', 'user_id' => 'lark-user-123']
                    ]
                ]
            ]),
            '*/drive/v1/files/create_folder' => Http::response([
                'code' => 0,
                'data' => [
                    'token' => 'lead-folder-token-999'
                ]
            ]),
            '*/drive/v1/files*' => Http::response([
                'code' => 0,
                'data' => [
                    'files' => [
                        ['name' => 'LEAD-1 - Mock Client', 'type' => 'folder', 'token' => 'lead-folder-token-999']
                    ]
                ]
            ]),
            '*/bitable/v1/apps/app-token/tables/table-id/fields*' => Http::response([
                'code' => 0,
                'data' => [
                    'items' => [
                        ['field_id' => 'fldPdf', 'field_name' => 'Meeting Summary PDF', 'type' => 17],
                        ['field_id' => 'fldImg', 'field_name' => 'Meeting Summary Image', 'type' => 17],
                        ['field_id' => 'fldDoc', 'field_name' => 'Meeting Summary Docs', 'type' => 15]
                    ]
                ]
            ]),
            '*/drive/v1/medias/upload_all' => Http::response([
                'code' => 0,
                'data' => [
                    'file_token' => 'mock-media-file-token'
                ]
            ]),
            '*/docx/v1/documents*' => Http::response([
                'code' => 0,
                'data' => [
                    'document' => [
                        'document_id' => 'lark-docx-id-777'
                    ]
                ]
            ]),
            '*/docx/v1/documents/lark-docx-id-777' => Http::response([
                'code' => 0,
                'data' => [
                    'document' => [
                        'document_id' => 'lark-docx-id-777'
                    ]
                ]
            ]),
            '*/docx/v1/documents/lark-docx-id-777/blocks/lark-docx-id-777/children' => Http::response([
                'code' => 0
            ]),
            '*/bitable/v1/apps/app-token/tables/table-id/records/rec-leadsy-123' => Http::response([
                'code' => 0
            ])
        ]);

        $tenant = Tenant::firstOrCreate(
            ['slug' => 'default-workspace'],
            [
                'name' => 'Default Workspace',
                'status' => 'active',
            ]
        );

        $user = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Sales User',
            'email' => 'sales-user@example.com',
            'password' => bcrypt('password'),
        ]);

        $lead = Lead::withoutEvents(fn() => Lead::create([
            'id' => 1,
            'tenant_id' => $tenant->id,
            'company_name' => 'Mock Client',
            'external_id' => 'rec-leadsy-123'
        ]));

        $transcript = LeadTranscript::create([
            'id' => 1,
            'lead_id' => $lead->id,
            'source_type' => 'meeting',
            'transcript_text' => 'Mock transcript content',
            'recorded_at' => now(),
            'evaluation_status' => 'completed',
            'meeting_type' => 'General',
            'general_sections_json' => [
                ['heading' => 'Agenda', 'content' => 'Review specifications and budget.']
            ]
        ]);

        $document = MeetingSummaryDocument::create([
            'transcript_id' => $transcript->id,
            'lead_id' => $lead->id,
            'file_name' => 'summary.pdf',
            'file_path' => 'meeting-summaries/summary.pdf',
            'generation_status' => 'success'
        ]);

        // Seed file mapping
        $integration = LarkIntegration::create([
            'tenant_id' => $tenant->id,
            'app_id' => 'cli_test',
            'app_secret_encrypted' => encrypt('secret'),
            'meeting_summary_mapping' => [
                'app_token' => 'app-token',
                'table_id' => 'table-id',
                'shared_folder_token' => 'folder-token',
                'pdf_field_id' => 'fldPdf',
                'pdf_field_name' => 'Meeting Summary PDF',
                'image_field_id' => 'fldImg',
                'image_field_name' => 'Meeting Summary Image',
                'doc_field_id' => 'fldDoc',
                'doc_field_name' => 'Meeting Summary Docs',
            ],
            'is_active' => true,
        ]);

        // Create dummy file
        $filePath = storage_path('app/public/meeting-summaries/summary.pdf');
        if (!file_exists(dirname($filePath))) {
            mkdir(dirname($filePath), 0755, true);
        }
        file_put_contents($filePath, 'dummy pdf contents');

        // Dispatch Job
        $transcript = $transcript->fresh();
        SyncMeetingSummaryToLarkJob::dispatchSync($transcript->id, $user->id);

        // Assert transcript doc URL was updated
        $transcript->refresh();
        $this->assertEquals('https://larksuite.com/docx/lark-docx-id-777', $transcript->lark_doc_url);

        // Cleanup
        unlink($filePath);
    }
}
