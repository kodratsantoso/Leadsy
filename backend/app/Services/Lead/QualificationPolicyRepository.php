<?php

namespace App\Services\Lead;

use App\Models\QualificationParameterSet;

class QualificationPolicyRepository
{
    public function getPolicy(): array
    {
        $set = QualificationParameterSet::with(['parameters.options'])
            ->where('status', 'active')
            ->latest('id')
            ->first();

        if (! $set) {
            return config('qualification');
        }

        $dimensions = [];
        $criticalFields = [];
        $hardStops = [];

        foreach ($set->parameters as $parameter) {
            $dimension = $parameter->dimension;
            $dimensions[$dimension] ??= ['weight' => 0];
            $dimensions[$dimension]['weight'] += $parameter->max_points;

            $dimensions[$dimension][$parameter->parameter_key] = $parameter->options
                ->where('is_active', true)
                ->mapWithKeys(fn ($option) => [$option->option_value => $option->score])
                ->toArray();

            if ($parameter->is_required) {
                $criticalFields[] = $parameter->parameter_key;
            }

            if ($parameter->hard_stop_operator && $parameter->hard_stop_value) {
                $hardStops[] = [
                    'field' => $parameter->parameter_key,
                    'operator' => $parameter->hard_stop_operator,
                    'value' => $parameter->hard_stop_value['value'] ?? null,
                    'message' => "{$parameter->label} triggered a hard-stop rule.",
                ];
            }
        }

        return [
            'version' => $set->version,
            'thresholds' => config('qualification.thresholds'),
            'critical_fields' => array_values(array_unique($criticalFields)),
            'dimensions' => $dimensions,
            'hard_stops' => $hardStops,
            'recommendations' => config('qualification.recommendations'),
            'source' => 'database',
            'parameter_set' => [
                'id' => $set->id,
                'name' => $set->name,
                'slug' => $set->slug,
                'version' => $set->version,
                'status' => $set->status,
            ],
        ];
    }
}
