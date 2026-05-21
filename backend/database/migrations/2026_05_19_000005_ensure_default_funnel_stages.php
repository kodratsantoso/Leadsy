<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $stages = [
            ['name' => 'New Lead', 'sequence' => 1, 'color' => '#6366f1', 'probability' => 5],
            ['name' => 'Enriched', 'sequence' => 2, 'color' => '#8b5cf6', 'probability' => 10],
            ['name' => 'Qualified', 'sequence' => 3, 'color' => '#a855f7', 'probability' => 20],
            ['name' => 'Contacted', 'sequence' => 4, 'color' => '#3b82f6', 'probability' => 30],
            ['name' => 'Follow Up Ongoing', 'sequence' => 5, 'color' => '#0ea5e9', 'probability' => 40],
            ['name' => 'Meeting Scheduled', 'sequence' => 6, 'color' => '#14b8a6', 'probability' => 50],
            ['name' => 'Opportunity', 'sequence' => 7, 'color' => '#22c55e', 'probability' => 60],
            ['name' => 'Proposal Sent', 'sequence' => 8, 'color' => '#84cc16', 'probability' => 75],
            ['name' => 'Won', 'sequence' => 9, 'color' => '#16a34a', 'probability' => 100],
            ['name' => 'Lost', 'sequence' => 10, 'color' => '#ef4444', 'probability' => 0],
            ['name' => 'Nurture / Hold', 'sequence' => 11, 'color' => '#f59e0b', 'probability' => 10],
        ];

        foreach ($stages as $stage) {
            $exists = DB::table('funnel_stages')->where('name', $stage['name'])->exists();

            if (! $exists) {
                DB::table('funnel_stages')->insert(array_merge($stage, [
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]));
            }
        }
    }

    public function down(): void
    {
        // Keep user-managed stage data intact.
    }
};
