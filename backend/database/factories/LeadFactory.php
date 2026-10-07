<?php

namespace Database\Factories;

use App\Models\Lead;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Lead>
 *
 * Kept deliberately thin. `company_name` is the only column on `leads` that is both
 * NOT NULL and without a default, so everything else is left to the schema — a factory
 * that pre-fills scores, funnel stages or owners would quietly decide the starting state
 * of every test that uses it, and tests about qualification or the funnel need to set
 * those themselves to mean anything.
 */
class LeadFactory extends Factory
{
    protected $model = Lead::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'company_name' => fake()->unique()->company(),
            'email' => fake()->unique()->companyEmail(),
            'phone' => fake()->numerify('08##########'),
        ];
    }

    /**
     * A lead sitting in the Trash, deleted `$daysAgo` days ago.
     *
     * The retention tests care about where a lead sits on the countdown, so this reads
     * better at the call site than repeating a raw `deleted_at` on every create().
     */
    public function trashed(int $daysAgo = 0): static
    {
        return $this->state(fn () => [
            'deleted_at' => now()->subDays($daysAgo),
        ]);
    }
}
