<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string $idx_code
 * @property string $company_name
 * @property string|null $industry
 * @property string|null $sub_industry
 * @property string|null $sector
 * @property string|null $listing_board
 * @property string|null $website
 * @property string|null $phone
 * @property string|null $email
 * @property string|null $address
 * @property array<array-key, mixed>|null $raw_payload_json
 * @property \Illuminate\Support\Carbon|null $last_fetched_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IdxCompanyCache newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IdxCompanyCache newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IdxCompanyCache query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IdxCompanyCache whereAddress($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IdxCompanyCache whereCompanyName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IdxCompanyCache whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IdxCompanyCache whereEmail($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IdxCompanyCache whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IdxCompanyCache whereIdxCode($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IdxCompanyCache whereIndustry($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IdxCompanyCache whereLastFetchedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IdxCompanyCache whereListingBoard($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IdxCompanyCache wherePhone($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IdxCompanyCache whereRawPayloadJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IdxCompanyCache whereSector($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IdxCompanyCache whereSubIndustry($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IdxCompanyCache whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IdxCompanyCache whereWebsite($value)
 * @mixin \Eloquent
 */
class IdxCompanyCache extends Model
{
    protected $fillable = [
        'idx_code', 'company_name', 'industry', 'sub_industry', 'sector',
        'listing_board', 'website', 'phone', 'email', 'address',
        'raw_payload_json', 'last_fetched_at'
    ];

    protected $casts = [
        'raw_payload_json' => 'array',
        'last_fetched_at' => 'datetime',
    ];
}
