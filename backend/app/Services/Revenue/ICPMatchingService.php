<?php

namespace App\Services\Revenue;

use App\Models\IcpProfile;
use App\Models\Lead;
use App\Models\LeadIcpMatch;

class ICPMatchingService
{
    public function matchLead(Lead $lead, ?IcpProfile $profile = null): array
    {
        $profile ??= IcpProfile::where('is_active', true)->orderBy('id')->first();

        if (!$profile) {
            return [
                'matched'     => false,
                'match_score' => 0,
                'match_level' => 'poor',
                'reason'      => 'No active ICP profile configured',
            ];
        }

        $lead->loadMissing('contacts', 'industry');

        $breakdown  = [];
        $totalScore = 0.0;

        // Industry (weight: weight_industry)
        $industryScore = $this->scoreIndustry($lead, $profile);
        $breakdown['industry'] = ['score' => $industryScore, 'weight' => $profile->weight_industry];
        $totalScore += $industryScore * $profile->weight_industry;

        // Company size (weight: weight_company_size)
        $sizeScore = $this->scoreCompanySize($lead, $profile);
        $breakdown['company_size'] = ['score' => $sizeScore, 'weight' => $profile->weight_company_size];
        $totalScore += $sizeScore * $profile->weight_company_size;

        // Territory (weight: weight_territory)
        $territoryScore = $this->scoreTerritory($lead, $profile);
        $breakdown['territory'] = ['score' => $territoryScore, 'weight' => $profile->weight_territory];
        $totalScore += $territoryScore * $profile->weight_territory;

        // Lead score normalised (weight: weight_lead_score)
        $scoreNorm = min(100, (float)($lead->lead_score ?? 0));
        $breakdown['lead_score'] = ['score' => $scoreNorm, 'weight' => $profile->weight_lead_score];
        $totalScore += $scoreNorm * $profile->weight_lead_score;

        // Contact completeness (weight: weight_contact_info)
        $contactScore = $this->scoreContactInfo($lead);
        $breakdown['contact_info'] = ['score' => $contactScore, 'weight' => $profile->weight_contact_info];
        $totalScore += $contactScore * $profile->weight_contact_info;

        $matchScore = round($totalScore, 1);
        $matchLevel = match(true) {
            $matchScore >= 80 => 'excellent',
            $matchScore >= 60 => 'good',
            $matchScore >= 40 => 'fair',
            default           => 'poor',
        };

        LeadIcpMatch::updateOrCreate(
            ['lead_id' => $lead->id, 'icp_profile_id' => $profile->id],
            [
                'match_score'    => $matchScore,
                'match_level'    => $matchLevel,
                'score_breakdown' => $breakdown,
                'evaluated_at'   => now(),
            ]
        );

        return [
            'matched'         => true,
            'icp_profile'     => $profile->name,
            'icp_profile_id'  => $profile->id,
            'match_score'     => $matchScore,
            'match_level'     => $matchLevel,
            'score_breakdown' => $breakdown,
        ];
    }

    public function batchMatch(IcpProfile $profile): int
    {
        $count = 0;
        Lead::whereNull('deleted_at')->chunkById(100, function ($leads) use ($profile, &$count) {
            foreach ($leads as $lead) {
                $this->matchLead($lead, $profile);
                $count++;
            }
        });
        return $count;
    }

    private function scoreIndustry(Lead $lead, IcpProfile $profile): float
    {
        if (empty($profile->target_industries)) return 100.0;
        return in_array($lead->industry_id, $profile->target_industries) ? 100.0 : 0.0;
    }

    private function scoreCompanySize(Lead $lead, IcpProfile $profile): float
    {
        if (empty($profile->target_company_sizes)) return 100.0;
        $size = $this->inferSize($lead->company_size_estimate);
        return in_array($size, $profile->target_company_sizes) ? 100.0 : 20.0;
    }

    private function scoreTerritory(Lead $lead, IcpProfile $profile): float
    {
        if (empty($profile->target_territories)) return 100.0;
        return in_array($lead->territory_id, $profile->target_territories) ? 100.0 : 15.0;
    }

    private function scoreContactInfo(Lead $lead): float
    {
        $score = 0.0;
        if (!empty($lead->email))           $score += 30;
        if (!empty($lead->phone))           $score += 25;
        if ($lead->contacts->count() > 0)   $score += 30;
        if (!empty($lead->website_domain))  $score += 15;
        return min(100.0, $score);
    }

    private function inferSize(?string $estimate): string
    {
        if (!$estimate) return 'unknown';
        $e = strtolower($estimate);
        if (str_contains($e, 'micro') || str_contains($e, '1-10'))    return 'micro';
        if (str_contains($e, 'small') || str_contains($e, '11-50'))   return 'small';
        if (str_contains($e, 'medium') || str_contains($e, '51-200')) return 'medium';
        return 'enterprise';
    }
}
