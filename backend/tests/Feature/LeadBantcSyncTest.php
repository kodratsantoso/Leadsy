<?php

namespace Tests\Feature;

use App\Models\Lead;
use App\Services\Lead\LeadBantcSyncService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * One lead, one set of BANTC answers.
 *
 * Two paths used to write these with different rules: the meeting-summary path lifted
 * all five fields onto the lead, the manual activity path lifted only `competitor`. 25
 * activities carried answers against 9 leads, so the activity screen and the lead screen
 * disagreed about the same lead.
 */
class LeadBantcSyncTest extends TestCase
{
    use RefreshDatabase;

    private function lead(): Lead
    {
        return Lead::create(['company_name' => 'PT Uji BANTC '.uniqid()]);
    }

    private function sync(): LeadBantcSyncService
    {
        return app(LeadBantcSyncService::class);
    }

    public function test_a_manual_answer_reaches_the_lead_not_just_the_activity(): void
    {
        $lead = $this->lead();

        $this->sync()->apply($lead, [
            'budget' => 'Rp 500 juta disetujui',
            'authority' => 'Direktur Operasional',
            'needs' => 'Integrasi sistem antrian',
            'timeline' => 'Q1 2027',
        ], 'manual');

        $lead->refresh();
        $this->assertSame('Rp 500 juta disetujui', $lead->budget);
        $this->assertSame('Direktur Operasional', $lead->authority);
        $this->assertSame('Q1 2027', $lead->timeline);
    }

    public function test_the_ai_never_overwrites_an_answer_a_person_typed(): void
    {
        $lead = $this->lead();
        $this->sync()->apply($lead, ['budget' => 'Rp 500 juta disetujui'], 'manual');

        // A later transcript disagrees. The salesperson's correction must survive.
        $this->sync()->apply($lead->refresh(), ['budget' => 'sekitar 100 juta'], 'ai');

        $this->assertSame('Rp 500 juta disetujui', $lead->refresh()->budget);
    }

    public function test_the_ai_may_fill_a_field_nobody_has_answered(): void
    {
        $lead = $this->lead();

        $this->sync()->apply($lead, ['needs' => 'Butuh dashboard konsolidasi'], 'ai');

        $this->assertSame('Butuh dashboard konsolidasi', $lead->refresh()->needs);
    }

    public function test_the_ai_may_refine_its_own_earlier_extraction(): void
    {
        $lead = $this->lead();
        $this->sync()->apply($lead, ['timeline' => 'tahun depan'], 'ai');
        $this->sync()->apply($lead->refresh(), ['timeline' => 'Maret 2027'], 'ai');

        $this->assertSame('Maret 2027', $lead->refresh()->timeline);
    }

    public function test_a_person_may_correct_the_ai(): void
    {
        $lead = $this->lead();
        $this->sync()->apply($lead, ['authority' => 'Manajer IT'], 'ai');
        $this->sync()->apply($lead->refresh(), ['authority' => 'Direktur Keuangan'], 'manual');

        $this->assertSame('Direktur Keuangan', $lead->refresh()->authority);
        $this->assertContains('authority', $this->sync()->manualFields($lead->refresh()));
    }

    public function test_placeholders_are_not_stored_as_answers(): void
    {
        $lead = $this->lead();

        // The AI returns these when a transcript did not cover a dimension. Storing them
        // would read as a real answer and would claim the field against a genuine one.
        $this->sync()->apply($lead, [
            'budget' => 'Not mentioned',
            'authority' => '-',
            'needs' => '',
            'timeline' => 'tidak disebutkan',
        ], 'ai');

        $lead->refresh();
        $this->assertNull($lead->budget);
        $this->assertNull($lead->authority);
        $this->assertNull($lead->needs);
        $this->assertNull($lead->timeline);
    }

    public function test_a_placeholder_does_not_block_a_later_real_answer(): void
    {
        $lead = $this->lead();
        $this->sync()->apply($lead, ['budget' => 'Not mentioned'], 'ai');
        $this->sync()->apply($lead->refresh(), ['budget' => 'Rp 300 juta'], 'ai');

        $this->assertSame('Rp 300 juta', $lead->refresh()->budget);
    }
}
