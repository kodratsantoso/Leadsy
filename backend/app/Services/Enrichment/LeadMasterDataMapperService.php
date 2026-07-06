<?php

namespace App\Services\Enrichment;

use App\Models\Industry;
use App\Models\SubIndustry;
use App\Models\BusinessCategory;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class LeadMasterDataMapperService
{
    /**
     * Map a string to an Industry.
     */
    public function mapIndustry(string $input): ?Industry
    {
        if (empty(trim($input))) return null;
        
        $inputLower = Str::lower(trim($input));

        // 1. Exact match on name
        $industry = Industry::whereRaw('LOWER(name) = ?', [$inputLower])->where('is_active', true)->first();
        if ($industry) return $industry;

        // 2. Contains match or synonyms
        $industries = Industry::where('is_active', true)->get();
        foreach ($industries as $ind) {
            if (Str::contains(Str::lower($ind->name), $inputLower) || Str::contains($inputLower, Str::lower($ind->name))) {
                return $ind;
            }
            if (!empty($ind->synonyms) && is_array($ind->synonyms)) {
                foreach ($ind->synonyms as $synonym) {
                    if (Str::contains(Str::lower($synonym), $inputLower) || Str::contains($inputLower, Str::lower($synonym))) {
                        return $ind;
                    }
                }
            }
        }

        return null;
    }

    /**
     * Map a string to a SubIndustry.
     */
    public function mapSubIndustry(string $input, ?int $industryId = null): ?SubIndustry
    {
        if (empty(trim($input))) return null;

        $inputLower = Str::lower(trim($input));
        $query = SubIndustry::where('is_active', true);
        if ($industryId) {
            $query->where('industry_id', $industryId);
        }

        $subIndustries = $query->get();
        
        // Exact
        $exact = $subIndustries->first(fn($s) => Str::lower($s->name) === $inputLower);
        if ($exact) return $exact;

        // Contains/Synonyms
        foreach ($subIndustries as $sub) {
            if (Str::contains(Str::lower($sub->name), $inputLower) || Str::contains($inputLower, Str::lower($sub->name))) {
                return $sub;
            }
            if (!empty($sub->synonyms) && is_array($sub->synonyms)) {
                foreach ($sub->synonyms as $synonym) {
                    if (Str::contains(Str::lower($synonym), $inputLower) || Str::contains($inputLower, Str::lower($synonym))) {
                        return $sub;
                    }
                }
            }
        }

        return null;
    }

    /**
     * Map to Business Category.
     */
    public function mapBusinessCategory(string $input): ?BusinessCategory
    {
        if (empty(trim($input))) return null;
        
        $inputLower = Str::lower(trim($input));

        $category = BusinessCategory::whereRaw('LOWER(name) = ?', [$inputLower])
            ->orWhereRaw('LOWER(code) = ?', [$inputLower])
            ->first();

        if ($category) return $category;

        $categories = BusinessCategory::all();
        foreach ($categories as $cat) {
            if (Str::contains(Str::lower($cat->name), $inputLower) || Str::contains($inputLower, Str::lower($cat->name))) {
                return $cat;
            }
        }

        return null;
    }

    /**
     * Map company size to allowed strings.
     */
    public function mapCompanySize(string|int $input): ?string
    {
        // Expected strings: "1-10", "11-50", "51-200", "201-500", "501-1000", "1001-5000", "5000+"
        $input = (string) $input;
        if (empty(trim($input))) return null;
        
        $num = (int) filter_var($input, FILTER_SANITIZE_NUMBER_INT);
        if ($num > 0) {
            if ($num <= 10) return "1-10";
            if ($num <= 50) return "11-50";
            if ($num <= 200) return "51-200";
            if ($num <= 500) return "201-500";
            if ($num <= 1000) return "501-1000";
            if ($num <= 5000) return "1001-5000";
            return "5000+";
        }
        
        return null;
    }
}
