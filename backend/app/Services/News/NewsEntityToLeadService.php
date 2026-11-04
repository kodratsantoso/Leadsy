<?php

namespace App\Services\News;

use App\Models\FunnelStage;
use App\Models\IndustryNewsEntity;
use App\Models\Lead;
use App\Models\LeadActivity;
use App\Models\LeadChannelType;
use App\Models\LeadSource;
use App\Models\LeadSourceType;
use App\Services\AuditService;
use App\Services\Enrichment\LeadEnrichmentTriggerService;
use App\Services\LeadDuplicateDetectionService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class NewsEntityToLeadService
{
    public function __construct(
        private readonly LeadDuplicateDetectionService $duplicateDetector,
        private readonly LeadEnrichmentTriggerService $enrichmentTrigger,
    ) {}

    /**
     * Convert one or multiple extracted news entities into Leadsy CRM leads.
     *
     * @param  list<array{entity_id: int, company_name?: string|null, brand?: string|null, website?: string|null, sub_industry_id?: int|null}>  $items
     * @return array{converted: int, linked_existing: int, leads: list<array<string, mixed>>}
     */
    public function convertBatch(
        array $items,
        int $tenantId,
        int $userId,
        bool $triggerAiEnrichment = true,
    ): array {
        $convertedCount = 0;
        $linkedExistingCount = 0;
        $resultLeads = [];

        $sourceType = LeadSourceType::firstOrCreate(
            ['slug' => 'news_intelligence'],
            [
                'name' => 'News Intelligence',
                'description' => 'Discovered through Industry Market Intelligence Newsletter',
                'sort_order' => 55,
                'is_active' => true,
            ]
        );

        $channelType = LeadChannelType::firstOrCreate(
            ['slug' => 'industry_newsletter', 'lead_source_type_id' => $sourceType->id],
            [
                'name' => 'Industry Newsletter',
                'description' => 'Curated industry news entity conversion',
                'sort_order' => 10,
                'is_active' => true,
            ]
        );

        $initialStage = FunnelStage::where('is_active', true)->orderBy('sequence_order')->first();

        foreach ($items as $payload) {
            $entityId = (int) ($payload['entity_id'] ?? 0);
            if ($entityId <= 0) {
                continue;
            }

            $entity = IndustryNewsEntity::withoutGlobalScopes()
                ->with(['article', 'industry'])
                ->where('tenant_id', $tenantId)
                ->find($entityId);

            if (! $entity) {
                continue;
            }

            $resolved = DB::transaction(function () use (
                $entity,
                $payload,
                $tenantId,
                $userId,
                $channelType,
                $initialStage,
                $triggerAiEnrichment
            ) {
                // Determine company_name & brand cleanly
                $overrideName = trim((string) ($payload['company_name'] ?? ''));
                $overrideBrand = trim((string) ($payload['brand'] ?? ''));
                $overrideWebsite = trim((string) ($payload['website'] ?? ''));

                if ($overrideName !== '') {
                    $companyName = $overrideName;
                    $brand = $overrideBrand !== ''
                        ? $overrideBrand
                        : ($entity->entity_type === 'brand' && mb_strtolower($overrideName) !== mb_strtolower($entity->entity_name) ? $entity->entity_name : null);
                } elseif ($entity->entity_type === 'brand' && ! empty($entity->parent_company_hint)) {
                    $companyName = $entity->parent_company_hint;
                    $brand = $entity->entity_name;
                } else {
                    $companyName = $entity->entity_name;
                    $brand = $overrideBrand !== '' ? $overrideBrand : null;
                }

                $website = $overrideWebsite !== '' ? $overrideWebsite : $entity->website_hint;
                $cleanDomain = LeadDuplicateDetectionService::cleanDomain($website);

                // Check duplicate before inserting
                $existingLead = $this->duplicateDetector->findDuplicate('', $companyName, $website, $tenantId);
                if (! $existingLead && $brand) {
                    $existingLead = $this->duplicateDetector->findDuplicate('', $brand, null, $tenantId);
                }

                if ($existingLead) {
                    $this->markNormalizedEntitiesMatched($tenantId, $entity->normalized_name, $existingLead->id);

                    return [
                        'status' => 'already_exists',
                        'lead' => $existingLead,
                    ];
                }

                $article = $entity->article;
                $subIndustryId = ! empty($payload['sub_industry_id'])
                    ? (int) $payload['sub_industry_id']
                    : $article?->sub_industry_id;

                $storyLines = [];
                if ($article) {
                    $pubDate = $article->published_at ? $article->published_at->format('Y-m-d') : now()->format('Y-m-d');
                    $storyLines[] = "[News Intelligence · {$pubDate}] {$article->title}";
                    if ($article->snippet) {
                        $storyLines[] = $article->snippet;
                    }
                    if ($entity->signal_context) {
                        $storyLines[] = "Signal Context: {$entity->signal_context}";
                    }
                    $storyLines[] = "Source: {$article->source_name} ({$article->url})";
                }

                $lead = Lead::create([
                    'tenant_id' => $tenantId,
                    'company_name' => $companyName,
                    'brand' => $brand,
                    'website' => $website ?: null,
                    'website_domain' => $cleanDomain,
                    'industry_id' => $entity->industry_id,
                    'sub_industry_id' => $subIndustryId ?: null,
                    'funnel_stage_id' => $initialStage?->id,
                    'owner_user_id' => $userId,
                    'created_by' => $userId,
                    'duplicate_status' => 'new',
                    'qualification_status' => 'pending',
                    'ai_mode' => $triggerAiEnrichment ? 'auto' : 'manual',
                    'use_ai_reference' => true,
                    'customer_story' => implode("\n", $storyLines) ?: null,
                ]);

                LeadSource::create([
                    'lead_id' => $lead->id,
                    'source_type' => 'news_intelligence',
                    'channel_type_id' => $channelType->id,
                    'confidence' => 'high',
                    'last_verified_at' => now(),
                    'notes' => json_encode([
                        'origin' => 'industry_newsletter',
                        'article_id' => $article?->id,
                        'headline' => $article?->title,
                        'url' => $article?->url,
                        'publisher' => $article?->source_name,
                        'published_at' => $article?->published_at?->toIso8601String(),
                        'signal_type' => $article?->signal_type,
                        'entity_name' => $entity->entity_name,
                        'entity_type' => $entity->entity_type,
                    ], JSON_UNESCAPED_UNICODE),
                ]);

                if ($article) {
                    LeadActivity::create([
                        'tenant_id' => $tenantId,
                        'lead_id' => $lead->id,
                        'activity_type' => 'note',
                        'activity_date' => now(),
                        'description' => sprintf(
                            "Prospek dikonversi dari Industry Newsletter (%s).\nHeadline: %s\nSinyal: %s\nSumber: %s — %s",
                            $entity->industry?->name ?? 'Industry',
                            $article->title,
                            strtoupper(str_replace('_', ' ', (string) $article->signal_type)),
                            $article->source_name ?? 'Media',
                            $article->url
                        ),
                        'user_id' => $userId,
                    ]);
                }

                $this->markNormalizedEntitiesMatched($tenantId, $entity->normalized_name, $lead->id);

                AuditService::log(
                    'convert_news_entity',
                    'lead_generator_newsletter',
                    $lead,
                    null,
                    [
                        'entity_id' => $entity->id,
                        'entity_name' => $entity->entity_name,
                        'article_id' => $article?->id,
                    ],
                    'success',
                    null,
                    $userId
                );

                return [
                    'status' => 'created',
                    'lead' => $lead,
                ];
            });

            /** @var Lead $leadModel */
            $leadModel = $resolved['lead'];

            if ($resolved['status'] === 'created') {
                $convertedCount++;
                if ($triggerAiEnrichment) {
                    try {
                        $this->enrichmentTrigger->trigger($leadModel, 'industry_newsletter');
                    } catch (\Throwable $e) {
                        Log::warning('[NewsEntityToLeadService] Background enrichment trigger failed', [
                            'lead_id' => $leadModel->id,
                            'error' => $e->getMessage(),
                        ]);
                    }
                }
            } else {
                $linkedExistingCount++;
            }

            $resultLeads[] = [
                'entity_id' => $entity->id,
                'status' => $resolved['status'],
                'lead_id' => $leadModel->id,
                'company_name' => $leadModel->company_name,
            ];
        }

        return [
            'converted' => $convertedCount,
            'linked_existing' => $linkedExistingCount,
            'leads' => $resultLeads,
        ];
    }

    private function markNormalizedEntitiesMatched(int $tenantId, string $normalizedName, int $leadId): void
    {
        IndustryNewsEntity::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('normalized_name', $normalizedName)
            ->update([
                'matched_lead_id' => $leadId,
                'converted_at' => now(),
            ]);
    }
}
