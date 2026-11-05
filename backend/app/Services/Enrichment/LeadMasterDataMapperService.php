<?php

namespace App\Services\Enrichment;

use App\Models\BusinessCategory;
use App\Models\Industry;
use App\Models\SubIndustry;
use Illuminate\Support\Str;

class LeadMasterDataMapperService
{
    /**
     * Map a string to an Industry within the active/target tenant's taxonomy.
     */
    public function mapIndustry(string $input, ?int $tenantId = null): ?Industry
    {
        if (empty(trim($input))) {
            return null;
        }

        $inputLower = Str::lower(trim($input));

        // 1. Exact match on name
        $industry = Industry::forTenantOrDefault($tenantId)
            ->whereRaw('LOWER(name) = ?', [$inputLower])
            ->where('is_active', true)
            ->first();
        if ($industry) {
            return $industry;
        }

        // 2. Contains match or synonyms
        $industries = Industry::forTenantOrDefault($tenantId)
            ->where('is_active', true)
            ->get();

        foreach ($industries as $ind) {
            if (Str::contains(Str::lower($ind->name), $inputLower) || Str::contains($inputLower, Str::lower($ind->name))) {
                return $ind;
            }
            if (! empty($ind->synonyms) && is_array($ind->synonyms)) {
                foreach ($ind->synonyms as $synonym) {
                    $synLower = Str::lower((string) $synonym);
                    if ($synLower !== '' && (Str::contains($synLower, $inputLower) || Str::contains($inputLower, $synLower))) {
                        return $ind;
                    }
                }
            }
        }

        return null;
    }

    /**
     * Map a string to a SubIndustry within the active/target tenant's taxonomy.
     */
    public function mapSubIndustry(string $input, ?int $industryId = null, ?int $tenantId = null): ?SubIndustry
    {
        if (empty(trim($input))) {
            return null;
        }

        $inputLower = Str::lower(trim($input));
        $query = SubIndustry::forTenantOrDefault($tenantId)->where('is_active', true);
        if ($industryId) {
            $query->where('industry_id', $industryId);
        }

        $subIndustries = $query->get();

        // Exact
        $exact = $subIndustries->first(fn ($s) => Str::lower($s->name) === $inputLower);
        if ($exact) {
            return $exact;
        }

        // Contains / Synonyms
        foreach ($subIndustries as $sub) {
            if (Str::contains(Str::lower($sub->name), $inputLower) || Str::contains($inputLower, Str::lower($sub->name))) {
                return $sub;
            }
            if (! empty($sub->synonyms) && is_array($sub->synonyms)) {
                foreach ($sub->synonyms as $synonym) {
                    $synLower = Str::lower((string) $synonym);
                    if ($synLower !== '' && (Str::contains($synLower, $inputLower) || Str::contains($inputLower, $synLower))) {
                        return $sub;
                    }
                }
            }
        }

        return null;
    }

    /**
     * Map a string or #LOB code (e.g. "205", "[205] Hotel & Resorts", "Hotel & Resorts") to a BusinessCategory.
     */
    public function mapBusinessCategory(string $input, ?int $industryId = null, ?int $tenantId = null): ?BusinessCategory
    {
        $clean = trim($input);
        if ($clean === '') {
            return null;
        }

        $inputLower = Str::lower($clean);
        $extractedCode = null;
        if (preg_match('/^(?:\[|lob\s*#?\s*)?([a-z0-9_-]{2,20})(?:\]|\s*[-:·])/i', $clean, $m)) {
            $extractedCode = Str::lower(trim($m[1]));
        }

        $categories = BusinessCategory::forTenantOrDefault($tenantId)
            ->where('is_active', true)
            ->orderByRaw($industryId ? 'CASE WHEN industry_id = '.((int) $industryId).' THEN 0 WHEN industry_id IS NULL THEN 1 ELSE 2 END' : 'id ASC')
            ->get();

        // 1. Exact match on name or code
        foreach ($categories as $cat) {
            $nameLower = Str::lower($cat->name);
            $codeLower = $cat->code ? Str::lower(trim($cat->code)) : null;

            if ($nameLower === $inputLower) {
                return $cat;
            }
            if ($codeLower !== null && ($codeLower === $inputLower || ($extractedCode && $codeLower === $extractedCode))) {
                return $cat;
            }
            if ($codeLower !== null && Str::lower("[{$cat->code}] {$cat->name}") === $inputLower) {
                return $cat;
            }
        }

        // 2. Contains match on name or synonyms
        foreach ($categories as $cat) {
            $nameLower = Str::lower($cat->name);
            if (Str::contains($nameLower, $inputLower) || Str::contains($inputLower, $nameLower)) {
                return $cat;
            }
            if (! empty($cat->synonyms) && is_array($cat->synonyms)) {
                foreach ($cat->synonyms as $synonym) {
                    $synLower = Str::lower((string) $synonym);
                    if ($synLower !== '' && (Str::contains($synLower, $inputLower) || Str::contains($inputLower, $synLower))) {
                        return $cat;
                    }
                }
            }
        }

        return null;
    }

    /**
     * Map company size to allowed strings.
     */
    public function mapCompanySize(string|int $input): ?string
    {
        $input = (string) $input;
        if (empty(trim($input))) {
            return null;
        }

        $num = (int) filter_var($input, FILTER_SANITIZE_NUMBER_INT);
        if ($num > 0) {
            if ($num <= 10) {
                return '1-10';
            }
            if ($num <= 50) {
                return '11-50';
            }
            if ($num <= 200) {
                return '51-200';
            }
            if ($num <= 500) {
                return '201-500';
            }
            if ($num <= 1000) {
                return '501-1000';
            }
            if ($num <= 5000) {
                return '1001-5000';
            }

            return '5000+';
        }

        return null;
    }
}
