<?php

namespace Database\Seeders;

use App\Models\AiFeatureRoute;
use App\Models\AiPromptTemplate;
use Illuminate\Database\Seeder;

class LeadEnrichmentAiConfigSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $model = \App\Models\AiModel::where('name', 'gemini-1.5-flash')->first();
        if (!$model) {
            $model = \App\Models\AiModel::first();
        }

        $features = [
            [
                'route' => 'lead_company_enrichment',
                'name' => 'Lead Company Enrichment',
                'description' => 'Analyze company information from name, website, Google Maps result, and available context.',
                'system_prompt' => 'You are an expert corporate researcher. Your task is to extract core company details from the provided context or use your knowledge to find the address, phone, email, and website. Return them in structured JSON. Do not invent information.',
                'user_prompt' => "Context:\nCompany Name: {{company_name}}\nAddress: {{existing_address}}\nWebsite: {{existing_website}}\nGoogle Maps: {{google_maps_result}}\nWebsite Result: {{website_result}}\nLark Sync Payload: {{lark_sync_payload}}\n\nPlease enrich and return JSON.",
                'output_contract_json' => [
                    'company_name' => '',
                    'description' => '',
                    'address' => '',
                    'phone' => '',
                    'email' => '',
                    'website' => '',
                    'year_founded' => '',
                    'headquarters' => '',
                    'confidence' => 'low | medium | high'
                ],
                'variables_schema_json' => ['company_name', 'existing_address', 'existing_website', 'google_maps_result', 'website_result', 'lark_sync_payload'],
            ],
            [
                'route' => 'lead_industry_classification',
                'name' => 'Lead Industry Classification',
                'description' => 'Map company to existing Industry and Sub Industry in Leadsy.',
                'system_prompt' => 'You are a data standardization expert. You must map the lead\'s business to the strictly provided list of available industries and sub-industries.',
                'user_prompt' => "Lead Context:\nCompany Name: {{company_name}}\nDescription: {{company_description}}\n\nAvailable Industries: {{available_industries}}\nAvailable Sub-Industries: {{available_sub_industries}}\n\nDetermine the best matching industry and sub-industry. Return JSON.",
                'output_contract_json' => [
                    'industry' => '',
                    'sub_industry' => '',
                    'confidence' => 'low | medium | high',
                    'evidence' => [],
                    'reasoning' => '',
                    'needs_review' => true
                ],
                'variables_schema_json' => ['company_name', 'company_description', 'available_industries', 'available_sub_industries'],
            ],
            [
                'route' => 'lead_business_category_classification',
                'name' => 'Lead Business Category Classification',
                'description' => 'Map company to existing Business Category single choice in Leadsy.',
                'system_prompt' => 'You are a data standardization expert. Map the lead to one of the provided business categories. If there is no confident match, return null.',
                'user_prompt' => "Lead Context:\nCompany Name: {{company_name}}\nDescription: {{company_description}}\n\nAvailable Business Categories: {{available_business_categories}}\n\nDetermine the best matching category. Return JSON.",
                'output_contract_json' => [
                    'business_category' => '',
                    'confidence' => 'low | medium | high',
                    'evidence' => [],
                    'reasoning' => '',
                    'needs_review' => true
                ],
                'variables_schema_json' => ['company_name', 'company_description', 'available_business_categories'],
            ],
            [
                'route' => 'lead_company_size_classification',
                'name' => 'Lead Company Size Classification',
                'description' => 'Map company size / employee range to existing Leadsy Company Size single choice.',
                'system_prompt' => 'You are a data standardization expert. Standardize the company size using only the provided size brackets.',
                'user_prompt' => "Lead Context:\nCompany Name: {{company_name}}\nExisting Size String: {{existing_company_size}}\n\nAvailable Size Brackets: {{available_company_sizes}}\n\nDetermine the correct bracket. Return JSON.",
                'output_contract_json' => [
                    'company_size' => '',
                    'confidence' => 'low | medium | high',
                    'evidence' => [],
                    'reasoning' => '',
                    'needs_review' => true
                ],
                'variables_schema_json' => ['company_name', 'existing_company_size', 'available_company_sizes'],
            ],
            [
                'route' => 'lead_initial_rescore',
                'name' => 'Lead Initial Rescore',
                'description' => 'Run Rescore Lead after enrichment.',
                'system_prompt' => 'You are a B2B sales scoring AI. Score the lead based on completeness, product fit, and available data.',
                'user_prompt' => "Lead Context:\nCompany: {{company_name}}\nIndustry: {{existing_industry}}\nSize: {{existing_company_size}}\nProduct: {{initial_product}}\n\nReturn JSON.",
                'output_contract_json' => [
                    'score' => 0,
                    'reasoning' => ''
                ],
                'variables_schema_json' => ['company_name', 'existing_industry', 'existing_company_size', 'initial_product'],
            ],
            [
                'route' => 'lead_initial_requalification',
                'name' => 'Lead Initial Re-qualification',
                'description' => 'Run Re-quality after enrichment.',
                'system_prompt' => 'You are a B2B sales AI. Qualify the lead as Marketing Qualified, Sales Qualified, or Unqualified.',
                'user_prompt' => "Lead Context:\nCompany: {{company_name}}\nScore: {{existing_lead_score}}\n\nReturn JSON.",
                'output_contract_json' => [
                    'status' => 'Marketing Qualified',
                    'reasoning' => ''
                ],
                'variables_schema_json' => ['company_name', 'existing_lead_score'],
            ],
            [
                'route' => 'lead_initial_icp_match',
                'name' => 'Lead Initial ICP Match',
                'description' => 'Run ICP Match after enrichment.',
                'system_prompt' => 'You are an Ideal Customer Profile matching AI. Evaluate the lead against our ICP rules.',
                'user_prompt' => "Lead Context:\nCompany: {{company_name}}\nIndustry: {{existing_industry}}\nSize: {{existing_company_size}}\n\nICP Rules:\n{{existing_icp_rules}}\n\nReturn JSON.",
                'output_contract_json' => [
                    'icp_match' => true,
                    'fit_score' => 0,
                    'reasoning' => ''
                ],
                'variables_schema_json' => ['company_name', 'existing_industry', 'existing_company_size', 'existing_icp_rules'],
            ],
            [
                'route' => 'lead_enrichment_summary',
                'name' => 'Lead Enrichment Summary',
                'description' => 'Generate enrichment summary and activity log explanation.',
                'system_prompt' => 'You are a sales assistant AI. Summarize the automated enrichment process into a short, readable paragraph for the activity log.',
                'user_prompt' => "Enrichment Results:\nCompany: {{company_name}}\nIndustry: {{existing_industry}}\nSize: {{existing_company_size}}\n\nReturn JSON.",
                'output_contract_json' => [
                    'summary' => 'Enrichment summary text',
                ],
                'variables_schema_json' => ['company_name', 'existing_industry', 'existing_company_size'],
            ],
        ];

        foreach ($features as $f) {
            AiFeatureRoute::updateOrCreate(
                ['feature_name' => $f['route']],
                [
                    'ai_model_id' => $model?->id ?? 1,
                    'priority' => 1,
                    'max_retries' => 1,
                    'timeout_seconds' => 30,
                    'cost_sensitivity' => 'medium',
                    'complexity_mode' => 'standard',
                    'is_active' => true,
                ]
            );

            $template = AiPromptTemplate::updateOrCreate(
                ['feature_name' => $f['route'], 'template_name' => 'default_v1'],
                [
                    'description' => $f['description'],
                    'is_active' => true,
                ]
            );

            $version = $template->versions()->updateOrCreate(
                ['version' => 1],
                [
                    'content' => $f['system_prompt'] . "\n\n" . $f['user_prompt'],
                    'system_prompt' => $f['system_prompt'],
                    'user_prompt' => $f['user_prompt'],
                    'output_contract_json' => $f['output_contract_json'],
                    'variables_schema_json' => $f['variables_schema_json'],
                    'is_active' => true,
                    'is_enabled' => true,
                    'activated_at' => now(),
                ]
            );

            $template->update(['active_version_id' => $version->id]);
        }
    }
}
