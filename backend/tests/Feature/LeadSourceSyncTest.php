<?php

namespace Tests\Feature;

use App\Models\Lead;
use App\Models\LeadSource;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Saving an edited lead must not collide with the lead_sources unique index.
 *
 * lead_sources carries UNIQUE (lead_id, source_type, COALESCE(source_ref, '')).
 * syncLeadSource() always updated whichever row came first, so pointing that row at a
 * source_type another row already held violated the index. Because the save was not
 * wrapped in a transaction, the lead itself had already been committed — the user saw an
 * error, reopened the lead, and found the edit applied anyway.
 */
class LeadSourceSyncTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // syncLeadSource() resolves the requested slug against lead_source_types and
        // falls back to 'other' when it is unknown — so these have to exist for the
        // test to exercise the real path rather than the fallback.
        foreach (['website', 'lark'] as $slug) {
            \App\Models\LeadSourceType::firstOrCreate(['slug' => $slug], ['name' => ucfirst($slug), 'is_active' => true]);
        }
    }

    private function sync(Lead $lead, ?string $type, ?int $channelId = null): void
    {
        $controller = app(\App\Http\Controllers\Api\LeadController::class);
        $method = new \ReflectionMethod($controller, 'syncLeadSource');
        $method->setAccessible(true);
        $method->invoke($controller, $lead, $type, $channelId);
    }

    private function lead(): Lead
    {
        return Lead::create(['company_name' => 'PT Uji Sumber '.uniqid()]);
    }

    public function test_switching_to_a_type_another_row_already_holds_does_not_collide(): void
    {
        $lead = $this->lead();
        LeadSource::create(['lead_id' => $lead->id, 'source_type' => 'website']);
        LeadSource::create(['lead_id' => $lead->id, 'source_type' => 'lark']);

        // Previously this updated the 'website' row to 'lark' and hit the unique index.
        $this->sync($lead->fresh(), 'lark');

        $this->assertSame(
            1,
            LeadSource::where('lead_id', $lead->id)->where('source_type', 'lark')->count(),
            'The existing row of that type should have been updated, not duplicated.'
        );
    }

    public function test_a_lead_with_one_source_still_has_its_type_changed(): void
    {
        $lead = $this->lead();
        LeadSource::create(['lead_id' => $lead->id, 'source_type' => 'website']);

        $this->sync($lead->fresh(), 'lark');

        $this->assertSame('lark', LeadSource::where('lead_id', $lead->id)->value('source_type'));
        $this->assertSame(1, LeadSource::where('lead_id', $lead->id)->count());
    }

    public function test_a_lead_with_no_source_gets_one(): void
    {
        $lead = $this->lead();

        $this->sync($lead, 'website');

        $this->assertSame('website', LeadSource::where('lead_id', $lead->id)->value('source_type'));
    }

    public function test_nothing_happens_when_neither_source_nor_channel_is_given(): void
    {
        $lead = $this->lead();

        $this->sync($lead, null, null);

        $this->assertSame(0, LeadSource::where('lead_id', $lead->id)->count());
    }
}
