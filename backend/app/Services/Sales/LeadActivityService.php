<?php

namespace App\Services\Sales;

use App\Models\Lead;
use App\Models\LeadActivity;
use Illuminate\Database\Eloquent\Model;

class LeadActivityService
{
    public function logActivity(Lead $lead, string $type, string $description, ?Model $relatedEntity = null, ?int $userId = null): LeadActivity
    {
        return $lead->activities()->create([
            'activity_type' => $type,
            'description' => $description,
            'activity_date' => now(),
            'related_entity_type' => $relatedEntity ? get_class($relatedEntity) : null,
            'related_entity_id' => $relatedEntity ? $relatedEntity->id : null,
            'user_id' => $userId,
        ]);
    }
}
