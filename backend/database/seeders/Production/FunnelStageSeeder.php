<?php

namespace Database\Seeders\Production;

use App\Models\FunnelStage;
use Illuminate\Database\Seeder;

class FunnelStageSeeder extends Seeder
{
    public function run(): void
    {
        $stages = [
            ['name' => 'New Lead',          'sequence' => 1,  'color' => '#6366f1', 'probability' => 5],
            ['name' => 'Enriched',          'sequence' => 2,  'color' => '#8b5cf6', 'probability' => 10],
            ['name' => 'Qualified',         'sequence' => 3,  'color' => '#a855f7', 'probability' => 20],
            ['name' => 'Contacted',         'sequence' => 4,  'color' => '#3b82f6', 'probability' => 30],
            ['name' => 'Follow Up Ongoing', 'sequence' => 5,  'color' => '#0ea5e9', 'probability' => 40],
            ['name' => 'Meeting Scheduled', 'sequence' => 6,  'color' => '#14b8a6', 'probability' => 50],
            ['name' => 'Opportunity',       'sequence' => 7,  'color' => '#22c55e', 'probability' => 60],
            ['name' => 'Proposal Sent',     'sequence' => 8,  'color' => '#84cc16', 'probability' => 75],
            ['name' => 'Won',               'sequence' => 9,  'color' => '#16a34a', 'probability' => 100],
            ['name' => 'Lost',              'sequence' => 10, 'color' => '#ef4444', 'probability' => 0],
            ['name' => 'Nurture / Hold',    'sequence' => 11, 'color' => '#f59e0b', 'probability' => 10],
        ];

        foreach ($stages as $s) {
            FunnelStage::updateOrCreate(
                ['name' => $s['name']],
                ['sequence' => $s['sequence'], 'color' => $s['color'], 'probability' => $s['probability'], 'is_active' => true]
            );
        }
    }
}
