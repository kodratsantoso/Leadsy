<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WhatsappAiAnalysis extends Model
{
    protected $fillable = [
        'conversation_id',
        'provider',
        'analysis_result',
        'confidence_score',
        'reasoning_summary',
        'analyzed_at',
    ];

    protected $casts = [
        'confidence_score' => 'float',
        'analyzed_at' => 'datetime',
    ];

    public function conversation()
    {
        return $this->belongsTo(WhatsappConversation::class, 'conversation_id');
    }
}
