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
            [
                'route' => 'lead_ai_profiling',
                'name' => 'Lead AI Profiling Research',
                'description' => 'Perform comprehensive multi-source web research on an Indonesian company to build a verified, multi-dimensional business intelligence profile.',
                'system_prompt' => 'You are an expert senior commercial intelligence researcher specializing in Indonesian B2B enterprise profiling. You must cross-reference multiple public sources (official website, business directories, government registries like Kemendag/AHU, job platforms like JobStreet/Glints/LinkedIn, news articles) to build a verified, comprehensive company profile. Cross-reference at least 2-3 independent sources before asserting facts. If a field cannot be verified from public sources, set it to null rather than guessing. Be thorough and specific — this profile will be used by sales and presales teams for B2B engagement planning.',
                'user_prompt' => "RESEARCH METHODOLOGY:\n1. First search for the official company website and extract primary data.\n2. Cross-check with Indonesian business registries (Kemendag, Companies House Indonesia, AHU Online).\n3. Verify employee count and company details from job platforms (JobStreet, Glints, LinkedIn).\n4. Look for news articles, press releases, or industry reports for additional context.\n5. Note any discrepancies between sources and reflect confidence levels accordingly.\n\nResearch Request:\nCompany/Brand Name: {{company_name}}\n\nAvailable Industries: {{available_industries}}\nAvailable Sub-Industries: {{available_sub_industries}}\nAvailable Business Categories: {{available_business_categories}}\n\nExtract ALL of the following fields and return a JSON object:\n- legal_name: Full legal entity name (e.g. PT XYZ Tbk)\n- brand: Commercial/brand names including product brands\n- abbreviation: Common abbreviation or acronym, or null\n- year_established: Founding year as string (e.g. \"2009\") or null\n- ownership_type: Ownership structure (Private Company, Joint Venture, Publicly Listed (Tbk), State-Owned (BUMN), Foreign Investment (PMA)) or null\n- website: Primary official website URL with https://\n- address: Complete HQ street address with city, province, postal code\n- city: Primary city/regency\n- province: Province\n- phone: Primary office phone number(s), multiple separated by \" / \"\n- whatsapp: WhatsApp contact number if found separately, or null\n- email: Primary corporate/business email\n- industry: Most suitable Industry from the available list\n- sub_industry: Most suitable Sub-Industry from the available list\n- business_category: Most suitable Business Category from the available list\n- primary_sector: Broad economic sector (Manufacturing, Services, Trading, Construction, Mining, Agriculture, Technology, Finance, Logistics)\n- vertical: Specific vertical/segment\n- core_product: Main product/service category\n- specialization: Detailed specialization\n- company_size: Employee range (1-10, 11-50, 51-200, 201-500, 501-1000, 1001-5000, 5000+)\n- company_size_estimate: Estimated employee count with source context\n- operational_area_type: Type of operational area (Kawasan Industri, CBD Office, etc.) or null\n- branch_count: Number of branches/locations if known, or null\n- business_model: Primary business model (B2B Manufacturer, B2B Distributor, B2B Service Provider, B2C Retailer, etc.)\n- target_market: Description of target customers/markets\n- corporate_structure: Parent company, group affiliation, or JV partners, or null\n- manufacturing_capability: For manufacturers, production capabilities, or null\n- product_brands: Array of product brand names\n- certifications_or_registrations: Notable certifications or government registrations, or null\n- customer_story: 3-5 sentence comprehensive overview of the company\n- presales_perspective: 2-4 sentence presales/sales intelligence perspective\n- confidence: Overall confidence level: high, medium, or low\n- sources: Array of verified source URLs used\n\nIf multiple different matching companies exist, provide them in a candidates array with best_match indicator.",
                'output_contract_json' => [
                    'legal_name' => '',
                    'brand' => '',
                    'abbreviation' => null,
                    'year_established' => null,
                    'ownership_type' => null,
                    'website' => '',
                    'address' => '',
                    'city' => '',
                    'province' => '',
                    'phone' => '',
                    'whatsapp' => null,
                    'email' => '',
                    'lat' => null,
                    'lng' => null,
                    'industry' => '',
                    'sub_industry' => '',
                    'business_category' => '',
                    'primary_sector' => '',
                    'vertical' => '',
                    'core_product' => '',
                    'specialization' => '',
                    'company_size' => '',
                    'company_size_estimate' => '',
                    'operational_area_type' => null,
                    'branch_count' => null,
                    'business_model' => '',
                    'target_market' => '',
                    'corporate_structure' => null,
                    'manufacturing_capability' => null,
                    'product_brands' => [],
                    'certifications_or_registrations' => null,
                    'customer_story' => '',
                    'presales_perspective' => '',
                    'confidence' => 'medium',
                    'sources' => [],
                    'candidates' => [],
                ],
                'variables_schema_json' => ['company_name', 'available_industries', 'available_sub_industries', 'available_business_categories'],
                'timeout_seconds' => 120,
                'max_tokens' => 4096,
            ],
        ];

        foreach ($features as $f) {
            AiFeatureRoute::updateOrCreate(
                ['feature_name' => $f['route']],
                [
                    'ai_model_id' => $model?->id ?? 1,
                    'priority' => 1,
                    'max_retries' => 1,
                    'timeout_seconds' => $f['timeout_seconds'] ?? 60,
                    'max_tokens' => $f['max_tokens'] ?? null,
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
