<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeadDiscoveryRecord extends Model
{
    protected $fillable = [
        'lead_id',
        'sections',
        'field_sources',
        'qualification_status',
        'completeness_score',
        'completeness_details',
        'last_validated_at',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'sections' => 'array',
        'field_sources' => 'array',
        'completeness_details' => 'array',
        'completeness_score' => 'integer',
        'last_validated_at' => 'datetime',
    ];

    /**
     * Standard sections available in the discovery workspace.
     *
     * @return array<string, array{label: string, category: string, required: bool, description: string}>
     */
    public static function standardSections(): array
    {
        return [
            'business_objectives' => [
                'label' => 'Business Objectives',
                'category' => 'business',
                'required' => true,
                'description' => 'What core business goals does the client want to achieve?',
            ],
            'current_process' => [
                'label' => 'Current Processes & Systems',
                'category' => 'business',
                'required' => true,
                'description' => 'How does the client currently handle the workflow today?',
            ],
            'pain_points' => [
                'label' => 'Pain Points & Inefficiencies',
                'category' => 'business',
                'required' => true,
                'description' => 'Bottlenecks, manual errors, or revenue loss in current operations.',
            ],
            'desired_outcomes' => [
                'label' => 'Desired Outcomes & KPIs',
                'category' => 'business',
                'required' => true,
                'description' => 'Target metrics, cycle time reduction, expected ROI.',
            ],
            'stakeholders' => [
                'label' => 'Key Stakeholders & Personas',
                'category' => 'governance',
                'required' => true,
                'description' => 'Decision makers, economic buyer, champions, and end-users.',
            ],
            'existing_systems' => [
                'label' => 'Existing Infrastructure & Software',
                'category' => 'technical',
                'required' => false,
                'description' => 'ERP, CRM, Databases, Cloud providers, and current legacy systems.',
            ],
            'functional_requirements' => [
                'label' => 'Functional Requirements',
                'category' => 'technical',
                'required' => true,
                'description' => 'Key capabilities and features the solution must provide.',
            ],
            'non_functional_requirements' => [
                'label' => 'Non-Functional Requirements (NFR)',
                'category' => 'technical',
                'required' => false,
                'description' => 'SLA, uptime, security standards, compliance, concurrency, scaling.',
            ],
            'integration_requirements' => [
                'label' => 'Integration Requirements',
                'category' => 'technical',
                'required' => false,
                'description' => 'APIs, webhooks, 3rd party sync (payment gateway, WA, accounting, etc).',
            ],
            'technical_constraints' => [
                'label' => 'Technical & Business Constraints',
                'category' => 'technical',
                'required' => false,
                'description' => 'On-premise policies, data residency, firewall, timeline caps.',
            ],
            'assumptions' => [
                'label' => 'Key Presales Assumptions',
                'category' => 'risk',
                'required' => true,
                'description' => 'Assumptions made during discovery that affect scope/pricing.',
            ],
            'dependencies' => [
                'label' => 'External Dependencies',
                'category' => 'risk',
                'required' => false,
                'description' => 'Prerequisites client must provide (API access, test data, approvals).',
            ],
            'open_questions' => [
                'label' => 'Open Clarification Questions',
                'category' => 'risk',
                'required' => false,
                'description' => 'Unanswered questions needing clarification before solution sign-off.',
            ],
        ];
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
