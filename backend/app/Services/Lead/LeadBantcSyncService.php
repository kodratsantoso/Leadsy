<?php

namespace App\Services\Lead;

use App\Models\Lead;
use Illuminate\Support\Carbon;

/**
 * The one place that decides what a lead's BANTC answers are.
 *
 * There were two: MeetingSummaryGenerationService lifted all five fields onto the lead,
 * while LeadActivityController kept four on the activity and lifted only `competitor`.
 * So a salesperson could log a meeting with budget, authority, needs and timeline, see
 * them on the activity, and find the lead itself still blank — 25 activities carried
 * answers against 9 leads. Two screens, two numbers, same lead.
 *
 * Both paths now come through here, which is the point: a rule that lives in one caller
 * is a rule the other caller will disagree with eventually.
 *
 * Precedence: a human beats the AI, and nothing beats a blank. The AI may fill a field
 * nobody has answered and may refine its own earlier extraction, but it never overwrites
 * what a person typed — a later transcript must not quietly undo a correction someone
 * made on purpose.
 */
class LeadBantcSyncService
{
    public const FIELDS = ['budget', 'authority', 'needs', 'timeline', 'competitor'];

    /**
     * @param  array<string, mixed>  $values  Any subset of FIELDS.
     * @param  'manual'|'ai'  $source
     * @return list<string>  The fields actually written.
     */
    public function apply(Lead $lead, array $values, string $source): array
    {
        $existing = $this->sources($lead);
        $changes = [];
        $provenance = $existing;
        $now = Carbon::now()->toIso8601String();

        foreach (self::FIELDS as $field) {
            $incoming = $values[$field] ?? null;

            if (! $this->isMeaningful($incoming)) {
                continue;
            }

            if ($source === 'ai' && ($existing[$field]['source'] ?? null) === 'manual') {
                // A person answered this. Leave it alone.
                continue;
            }

            if ((string) $lead->{$field} === (string) $incoming) {
                // Same value — still record who confirmed it, but do not churn the row.
                $provenance[$field] = ['source' => $source, 'at' => $now];

                continue;
            }

            $changes[$field] = $incoming;
            $provenance[$field] = ['source' => $source, 'at' => $now];
        }

        if ($changes === [] && $provenance === $existing) {
            return [];
        }

        $lead->update($changes + ['bantc_sources' => $provenance]);

        return array_keys($changes);
    }

    /** Which fields a human has answered, so callers can show or protect them. */
    public function manualFields(Lead $lead): array
    {
        return array_keys(array_filter(
            $this->sources($lead),
            fn ($entry) => ($entry['source'] ?? null) === 'manual'
        ));
    }

    private function sources(Lead $lead): array
    {
        $raw = $lead->bantc_sources;

        if (is_string($raw)) {
            $raw = json_decode($raw, true);
        }

        return is_array($raw) ? $raw : [];
    }

    /**
     * Blank strings and placeholders are not answers.
     *
     * The AI returns things like "Not mentioned" or "-" when a transcript did not cover
     * a dimension; storing those would read on screen as a real answer and would also
     * claim the field against a later, genuine one.
     */
    private function isMeaningful(mixed $value): bool
    {
        if ($value === null || is_array($value)) {
            return false;
        }

        $trimmed = trim((string) $value);

        if ($trimmed === '' || mb_strlen($trimmed) < 2) {
            return false;
        }

        $placeholders = ['n/a', 'na', 'none', 'null', 'unknown', 'not mentioned', 'tidak disebutkan', 'tidak ada', 'belum ada', '-', '--'];

        return ! in_array(mb_strtolower($trimmed), $placeholders, true);
    }
}
