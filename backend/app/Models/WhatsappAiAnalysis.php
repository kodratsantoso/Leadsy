<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $conversation_id
 * @property string|null $provider
 * @property string $analysis_result
 * @property float|null $confidence_score
 * @property string|null $reasoning_summary
 * @property \Illuminate\Support\Carbon|null $analyzed_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\WhatsappConversation $conversation
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappAiAnalysis newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappAiAnalysis newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappAiAnalysis query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappAiAnalysis whereAnalysisResult($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappAiAnalysis whereAnalyzedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappAiAnalysis whereConfidenceScore($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappAiAnalysis whereConversationId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappAiAnalysis whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappAiAnalysis whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappAiAnalysis whereProvider($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappAiAnalysis whereReasoningSummary($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WhatsappAiAnalysis whereUpdatedAt($value)
 * @mixin \Eloquent
 */
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
