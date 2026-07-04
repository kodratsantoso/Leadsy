<?php

namespace App\Services\Idx;

use App\Models\Lead;
use App\Models\Industry;
use App\Models\SubIndustry;
use App\Models\BusinessCategory;
use App\Models\LeadSourceType;
use App\Models\LeadChannelType;
use App\Models\LeadSource;

class IdxToLeadMappingService
{
    public function mapAndCreate(array $normalizedData, int $tenantId, int $userId): Lead
    {
        // 1. Resolve Industry, SubIndustry, BusinessCategory
        $industryId = null;
        if (!empty($normalizedData['sector'])) {
            $industry = Industry::firstOrCreate(
                ['tenant_id' => $tenantId, 'name' => $normalizedData['sector']],
                ['is_active' => true]
            );
            $industryId = $industry->id;
        }

        $subIndustryId = null;
        if (!empty($normalizedData['industry']) && $industryId) {
            $subIndustry = SubIndustry::firstOrCreate(
                ['tenant_id' => $tenantId, 'industry_id' => $industryId, 'name' => $normalizedData['industry']],
                ['is_active' => true]
            );
            $subIndustryId = $subIndustry->id;
        }

        $businessCategoryId = null;
        if (!empty($normalizedData['sub_industry'])) {
            $businessCategory = BusinessCategory::firstOrCreate(
                ['tenant_id' => $tenantId, 'name' => $normalizedData['sub_industry']],
                ['is_active' => true]
            );
            $businessCategoryId = $businessCategory->id;
        }

        // 2. Create Lead
        $lead = Lead::create([
            'tenant_id' => $tenantId,
            'company_name' => $normalizedData['company_name'],
            'address' => $normalizedData['address'],
            'phone' => $normalizedData['phone'],
            'email' => $normalizedData['email'],
            'website' => $normalizedData['website'],
            'industry_id' => $industryId,
            'sub_industry_id' => $subIndustryId,
            'business_category_id' => $businessCategoryId,
            'created_by' => $userId,
            'duplicate_status' => 'new',
            'qualification_status' => 'pending',
            'ai_mode' => 'manual',
            'use_ai_reference' => false,
            'external_id' => $normalizedData['idx_code'],
        ]);

        // 3. Add Lead Source and Channel
        // Spec: Lead Source = Website, Channel = IDX
        $sourceType = LeadSourceType::firstOrCreate(
            ['slug' => 'website'],
            [
                'name' => 'Website',
                'description' => 'Sourced from external websites',
                'sort_order' => 50,
                'is_active' => true,
            ]
        );

        $channelType = LeadChannelType::firstOrCreate(
            ['slug' => 'idx', 'lead_source_type_id' => $sourceType->id],
            [
                'name' => 'IDX',
                'description' => 'Bursa Efek Indonesia',
                'sort_order' => 10,
                'is_active' => true,
            ]
        );

        LeadSource::create([
            'lead_id' => $lead->id,
            'source_type' => 'website',
            'channel_type_id' => $channelType->id,
            'confidence' => 'high',
            'last_verified_at' => now(),
            'notes' => json_encode($normalizedData['raw_source_payload']),
        ]);

        return $lead;
    }
}
