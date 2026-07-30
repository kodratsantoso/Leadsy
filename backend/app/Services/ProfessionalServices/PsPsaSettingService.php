<?php

namespace App\Services\ProfessionalServices;

use App\Models\PsPsaSetting;

class PsPsaSettingService
{
    public function getSettings(): PsPsaSetting
    {
        $settings = PsPsaSetting::first();
        
        if (!$settings) {
            $settings = PsPsaSetting::create([]);
        }
        
        return $settings;
    }

    public function updateSettings(array $data): PsPsaSetting
    {
        $settings = $this->getSettings();
        $settings->update($data);
        return $settings;
    }
}
