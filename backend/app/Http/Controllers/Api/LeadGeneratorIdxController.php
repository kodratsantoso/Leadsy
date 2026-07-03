<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use App\Models\Lead;
use App\Models\Industry;
use App\Models\SubIndustry;
use App\Models\BusinessCategory;
use App\Models\LeadSourceType;
use App\Models\LeadChannelType;
use App\Models\LeadSource;

class LeadGeneratorIdxController extends Controller
{
    public function index(Request $request)
    {
        $search = strtolower($request->query('search', ''));
        $page = (int) $request->query('page', 1);
        $perPage = (int) $request->query('per_page', 50);

        $path = 'data/idx/allCompanies.json';
        if (!Storage::exists($path)) {
            return response()->json(['data' => [], 'meta' => ['total' => 0], 'message' => 'Data file not found.']);
        }

        $json = json_decode(Storage::get($path), true);
        $companies = $json['data'] ?? [];

        if ($search) {
            $companies = array_filter($companies, function ($c) use ($search) {
                return str_contains(strtolower($c['KodeEmiten'] ?? ''), $search)
                    || str_contains(strtolower($c['NamaEmiten'] ?? ''), $search);
            });
        }

        // Re-index array
        $companies = array_values($companies);
        $total = count($companies);
        $paginated = array_slice($companies, ($page - 1) * $perPage, $perPage);

        // Check which ones are already imported by exact name matching
        $companyNames = array_map(function ($c) {
            return strtolower(trim($c['NamaEmiten'] ?? ''));
        }, $paginated);

        $existingLeads = [];
        if (!empty($companyNames)) {
            $existingLeads = Lead::whereIn(\Illuminate\Support\Facades\DB::raw('LOWER(TRIM(company_name))'), $companyNames)
                ->pluck('company_name')
                ->map(fn ($name) => strtolower(trim($name)))
                ->toArray();
        }

        foreach ($paginated as &$c) {
            $c['is_imported'] = in_array(strtolower(trim($c['NamaEmiten'] ?? '')), $existingLeads);
        }

        return response()->json([
            'data' => $paginated,
            'meta' => [
                'current_page' => $page,
                'last_page' => ceil($total / $perPage),
                'per_page' => $perPage,
                'total' => $total,
            ]
        ]);
    }

    public function import(Request $request)
    {
        $data = $request->validate([
            'KodeEmiten' => 'required|string',
            'NamaEmiten' => 'required|string',
            'Alamat' => 'nullable|string',
            'Telepon' => 'nullable|string',
            'Email' => 'nullable|string',
            'Website' => 'nullable|string',
            'Sektor' => 'nullable|string',
            'SubSektor' => 'nullable|string',
            'Industri' => 'nullable|string',
            'SubIndustri' => 'nullable|string',
            'KegiatanUsahaUtama' => 'nullable|string',
        ]);

        $tenantId = $request->user()->tenant_id;

        // Check if lead already exists
        $nameLower = mb_strtolower(trim($data['NamaEmiten']));
        $lead = Lead::where('tenant_id', $tenantId)
            ->whereRaw('LOWER(TRIM(company_name)) = ?', [$nameLower])
            ->first();

        if ($lead) {
            return response()->json(['message' => 'Lead already exists.', 'lead' => $lead], 400);
        }

        // Create or get Industry, SubIndustry, BusinessCategory
        $industryId = null;
        if (!empty($data['Sektor'])) {
            $industry = Industry::firstOrCreate(
                ['tenant_id' => $tenantId, 'name' => $data['Sektor']],
                ['is_active' => true]
            );
            $industryId = $industry->id;
        }

        $subIndustryId = null;
        if (!empty($data['SubSektor']) && $industryId) {
            $subIndustry = SubIndustry::firstOrCreate(
                ['tenant_id' => $tenantId, 'industry_id' => $industryId, 'name' => $data['SubSektor']],
                ['is_active' => true]
            );
            $subIndustryId = $subIndustry->id;
        }

        $businessCategoryId = null;
        if (!empty($data['Industri'])) {
            $businessCategory = BusinessCategory::firstOrCreate(
                ['tenant_id' => $tenantId, 'name' => $data['Industri']],
                ['is_active' => true]
            );
            $businessCategoryId = $businessCategory->id;
        }

        // Clean up website string
        $website = $data['Website'] ?? null;
        if ($website && !str_starts_with($website, 'http')) {
            $website = 'https://' . ltrim($website, '/');
        }

        // Create Lead
        $lead = Lead::create([
            'tenant_id' => $tenantId,
            'company_name' => $data['NamaEmiten'],
            'address' => $data['Alamat'],
            'phone' => $data['Telepon'],
            'email' => $data['Email'],
            'website' => $website,
            'industry_id' => $industryId,
            'sub_industry_id' => $subIndustryId,
            'business_category_id' => $businessCategoryId,
            'created_by' => $request->user()->id,
            'duplicate_status' => 'new',
            'qualification_status' => 'pending',
            'ai_mode' => 'manual',
            'ai_explanation' => $data['KegiatanUsahaUtama'] ?? null,
            'use_ai_reference' => false,
        ]);

        // Add Lead Source and Channel
        $sourceType = LeadSourceType::firstOrCreate(
            ['slug' => 'idx'],
            [
                'name' => 'IDX',
                'description' => 'Indonesian Stock Exchange',
                'sort_order' => 50,
                'is_active' => true,
            ]
        );

        $channelType = LeadChannelType::firstOrCreate(
            ['slug' => 'idx-public-company', 'lead_source_type_id' => $sourceType->id],
            [
                'name' => 'Bursa Efek Indonesia',
                'description' => 'Public companies from IDX',
                'sort_order' => 10,
                'is_active' => true,
            ]
        );

        LeadSource::create([
            'lead_id' => $lead->id,
            'source_type' => 'idx',
            'channel_type_id' => $channelType->id,
            'confidence' => 'high',
            'last_verified_at' => now(),
            'notes' => 'Kode Emiten: ' . $data['KodeEmiten']
        ]);

        return response()->json(['message' => 'Lead created successfully.', 'lead' => $lead], 201);
    }
}
